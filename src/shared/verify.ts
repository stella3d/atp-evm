import { Agent, ComAtprotoSyncGetRecord } from "@atproto/api";
import { CarReader } from '@ipld/car';
import { CID } from 'multiformats/cid';
import * as Block from 'multiformats/block';
import { sha256 } from 'multiformats/hashes/sha2';
import * as dagCbor from '@ipld/dag-cbor';
import { ADDRESS_CONTROL_LEXICON_TYPE, atpBytesToHex } from "./common.ts";
import type { DefinedDidString, AddressControlRecord } from "./common.ts";
import { chainForId, makeSiweStatement } from "./WalletConnector.tsx";
import { createSiweMessage, verifySiweMessage, type SiweMessage } from "viem/siwe";
import { createPublicClient, http } from "viem";


export type AddressControlVerificationChecks = {
  // record's siwe.statement matches exactly, includes both wallet & DID matches
  statementMatches: boolean | null;
  // wallet signature is cryptographically valid for the record's address
  siweSignatureValid: boolean | null;
  // ATProto-side merkle inclusion proof from getRecord is valid
  merkleProofValid: boolean | null;
}

export const verifyRecordSiweSignature = async (record: AddressControlRecord): Promise<boolean> => {
  const reconstructedMsg: SiweMessage = {
    domain: record.siwe.domain,
    address: record.siwe.address,
    statement: record.siwe.statement,
    version: record.siwe.version,
    chainId: record.siwe.chainId,
    nonce: record.siwe.nonce,
    uri: record.siwe.uri,
    issuedAt: new Date(record.siwe.issuedAt),
  }

  const message: string = createSiweMessage(reconstructedMsg);

  try {
    const ethClient = createPublicClient({
      chain: chainForId(record.siwe.chainId),
      transport: http()
    });

    const sigHex = atpBytesToHex(record.signature);
    const verifyResult: boolean = await verifySiweMessage(ethClient, {
      message,
      signature: sigHex,
      domain: reconstructedMsg.domain,
      nonce: reconstructedMsg.nonce,
      address: reconstructedMsg.address,
    });
    return verifyResult;
  } catch (e) {
    console.error("error verifying Sign in With Ethereum signature in record:", e);
  }
  return false;
}

export const checkLinkValidityMinimal = async (
  did: DefinedDidString, 
  record: AddressControlRecord,
): Promise<AddressControlVerificationChecks> => {
	// check 1: statement matches
	const expectedStatement = makeSiweStatement(record.siwe.address, did);
	// check 2: wallet signature & SIWE message are valid
	const siweSignatureValid = await verifyRecordSiweSignature(record);

	return {
		statementMatches: record.siwe.statement === expectedStatement,
		siweSignatureValid,
		merkleProofValid: null
	};
}

export const checkLinkValidity = async (
  did: DefinedDidString, 
  record: AddressControlRecord,
  recordCid?: CID,
  blocks?: Map<string, Uint8Array>
): Promise<AddressControlVerificationChecks> => {
	const results: AddressControlVerificationChecks = {
		statementMatches: null,
		siweSignatureValid: null,
		merkleProofValid: null,
	};

	// check 1: statement matches
	const expectedStatement = makeSiweStatement(record.siwe.address, did);
	results.statementMatches = (record.siwe.statement === expectedStatement);

	// check 2: wallet signature & SIWE message are valid
	results.siweSignatureValid = await verifyRecordSiweSignature(record);

	// check 3: merkle proof validation (if provided)
	if (recordCid && blocks) {
		results.merkleProofValid = await verifyMerkleProof(recordCid, blocks);
	}

  console.log(results);
	return results;
}


export const fetchLinkRecord = async (agent: Agent, did: DefinedDidString, rkey: string): Promise<ComAtprotoSyncGetRecord.Response> => {
	try {
		const response = await agent.com.atproto.sync.getRecord({
			did,
			collection: ADDRESS_CONTROL_LEXICON_TYPE,
			rkey,
		});

		console.log("fetched addressControl record:", response);
		return response;
  } catch (e) {
	throw new Error("error fetching addressControl record: " + e);
  }
}

export const fetchAndDecodeRecord = async (
  agent: Agent, 
  did: DefinedDidString, 
  rkey: string
): Promise<{ response: ComAtprotoSyncGetRecord.Response; decoded: DecodedRecord }> => {
  try {
    const response = await agent.com.atproto.sync.getRecord({
      did,
      collection: ADDRESS_CONTROL_LEXICON_TYPE,
      rkey,
    });

	console.log("fetched addressControl record:", response);

    // The response.data should contain the CAR file bytes
    let carBytes: Uint8Array;
    
    if (response.data instanceof Uint8Array) {
      carBytes = response.data;
    } else if (typeof response.data === 'string') {
      // If it's a base64 string, decode it
      carBytes = new Uint8Array(atob(response.data).split('').map(c => c.charCodeAt(0)));
    } else {
      throw new Error("Unexpected response data format");
    }

    const decoded = await decodeCarFile(carBytes);
    
    console.log("decoded addressControl record:", decoded.record);
    console.log("record CID:", decoded.recordCid.toString());
    console.log("blocks in CAR:", decoded.blocks.size);

    return { response, decoded };
  } catch (e) {
    throw new Error("error fetching and decoding addressControl record: " + e);
  }
}

export type DecodedRecord = {
  record: AddressControlRecord;
  recordCid: CID;
  blocks: Map<string, Uint8Array>;
}

export const decodeCarFile = async (carBytes: Uint8Array): Promise<DecodedRecord> => {
  const reader = await CarReader.fromBytes(carBytes);
  const blocks = new Map<string, Uint8Array>();
  
  // Read all blocks from the CAR file
  for await (const { cid, bytes } of reader.blocks()) {
    blocks.set(cid.toString(), bytes);
  }
  
  // Get the root CID (should be the record)
  const roots = await reader.getRoots();
  if (roots.length === 0) {
    throw new Error("No root CIDs found in CAR file");
  }
  
  const recordCid = roots[0];
  const recordBytes = blocks.get(recordCid.toString());
  
  if (!recordBytes) {
    throw new Error("Record data not found in CAR file");
  }
  
  // Decode the CBOR data to get the actual record
  const decodedData = dagCbor.decode(recordBytes);
  
  // Validate that this is an AddressControlRecord
  if (typeof decodedData !== 'object' || decodedData === null || 
      !('$type' in decodedData) || decodedData.$type !== ADDRESS_CONTROL_LEXICON_TYPE) {
    throw new Error("Invalid record type or structure");
  }
  
  return {
    record: decodedData as AddressControlRecord,
    recordCid,
    blocks
  };
}

export const verifyMerkleProof = async (
  recordCid: CID, 
  blocks: Map<string, Uint8Array>,
  expectedRepoCommitCid?: CID
): Promise<boolean> => {
  try {
    // Step 1: Verify all blocks have valid CIDs
    const blockMap = new Map<string, AtprotoBlock>();
    for (const [cidStr, bytes] of blocks) {
      const cid = CID.parse(cidStr);
      
      // Verify that the CID matches the content by re-encoding and comparing
      const decodedValue = dagCbor.decode(bytes) as AtprotoBlock;
      const block = await Block.encode({
        value: decodedValue,
        codec: dagCbor,
        hasher: sha256
      });
      
      if (!block.cid.equals(cid)) {
        console.error(`CID mismatch for block ${cidStr}`);
        return false;
      }
      
      blockMap.set(cidStr, decodedValue);
    }
    
    // Step 2: Walk the merkle path from record to repository commit
    return walkMerkleProofPath(recordCid, blockMap, expectedRepoCommitCid);
    
  } catch (error) {
    console.error("Error verifying merkle proof:", error);
    return false;
  }
}

const walkMerkleProofPath = (
  recordCid: CID,
  blockMap: Map<string, AtprotoBlock>,
  expectedRepoCommitCid?: CID
): boolean => {
  try {
    // Step 1: Find the record block
    const recordData = blockMap.get(recordCid.toString());
    if (!recordData) {
      console.error("Record block not found in proof");
      return false;
    }
    
    // Step 2: Find MST nodes that reference this record
    // In ATProto's MST, we need to walk up from leaf nodes to the root
    const visitedNodes = new Set<string>();
    const currentPath: CID[] = [recordCid];
    let repoCommitFound = false;
    
    // Look for MST nodes that contain references to our record or path nodes
    for (const [cidStr, blockData] of blockMap) {
      if (visitedNodes.has(cidStr)) continue;
      
      // Check if this is an MST node
      if (isMstNode(blockData)) {
        const nodeReferences = extractMstReferences(blockData as MstNode);
        
        // Check if this MST node references any of our current path nodes
        const referencesOurPath = currentPath.some(pathCid => 
          nodeReferences.includes(pathCid.toString())
        );
        
        if (referencesOurPath) {
          currentPath.push(CID.parse(cidStr));
          visitedNodes.add(cidStr);
          console.log(`Found MST node in path: ${cidStr}`);
        }
      }
      
      // Check if this is a repository commit
      if (isRepoCommit(blockData)) {
        const commitRoot = extractRepoCommitRoot(blockData as RepoCommit);
        
        // Check if this commit references the MST root we've built up to
        const mstRootInPath = currentPath.find(cid => cid.toString() === commitRoot);
        
        if (mstRootInPath) {
          repoCommitFound = true;
          console.log(`Found repo commit that includes MST root: ${cidStr}`);
          
          // If we have an expected commit CID, verify it matches
          if (expectedRepoCommitCid && !expectedRepoCommitCid.equals(CID.parse(cidStr))) {
            console.error("Repository commit CID doesn't match expected value");
            return false;
          }
          break;
        }
      }
    }
    
    if (!repoCommitFound) {
      console.error("Could not trace record to repository commit");
      return false;
    }
    
    console.log(`Successfully verified merkle path: ${currentPath.map(c => c.toString()).join(" -> ")}`);
    return true;
    
  } catch (error) {
    console.error("Error walking merkle proof path:", error);
    return false;
  }
}

// Helper function to identify MST (Merkle Search Tree) nodes
const isMstNode = (blockData: AtprotoBlock): boolean => {
  return (
    typeof blockData === 'object' &&
    blockData !== null &&
    ('e' in blockData || 'l' in blockData) && // MST nodes have entries (e) or left references (l)
    Array.isArray(blockData.e)
  );
}

// Extract CID references from an MST node
const extractMstReferences = (mstNode: MstNode): string[] => {
  const references: string[] = [];
  
  // MST entries contain references to child nodes and values
  if (Array.isArray(mstNode.e)) {
    for (const entry of mstNode.e) {
      // Each entry can have a 'v' (value) reference and 't' (subtree) reference
      if (entry.v && typeof entry.v === 'object' && entry.v['/']) {
        references.push(entry.v['/']);
      }
      if (entry.t && typeof entry.t === 'object' && entry.t['/']) {
        references.push(entry.t['/']);
      }
    }
  }
  
  // Left reference
  if (mstNode.l && typeof mstNode.l === 'object' && mstNode.l['/']) {
    references.push(mstNode.l['/']);
  }
  
  return references;
}

// Helper function to identify repository commit blocks
const isRepoCommit = (blockData: AtprotoBlock): boolean => {
  return (
    typeof blockData === 'object' &&
    blockData !== null &&
    'data' in blockData &&
    'rev' in blockData &&
    'prev' in blockData
  );
}

// Extract the MST root CID from a repository commit
const extractRepoCommitRoot = (commitData: RepoCommit): string | null => {
  if (commitData.data && typeof commitData.data === 'object' && commitData.data['/']) {
    return commitData.data['/'];
  }
  return null;
}

export const fetchAndValidateRecord = async (
  agent: Agent,
  did: DefinedDidString,
  rkey: string
): Promise<{ 
  response: ComAtprotoSyncGetRecord.Response; 
  decoded: DecodedRecord; 
  validation: AddressControlVerificationChecks;
}> => {
  try {
    // Fetch and decode the record
    const { response, decoded } = await fetchAndDecodeRecord(agent, did, rkey);
    
    // Validate the record with merkle proof
    const validation = await checkLinkValidity(
      did, 
      decoded.record, 
      decoded.recordCid, 
      decoded.blocks
    );
    
    console.log("Record validation results:", validation);
    
    return { response, decoded, validation };
  } catch (e) {
    throw new Error("error fetching and validating addressControl record: " + e);
  }
}

// Types for ATProto structures
type AtprotoBlock = Record<string, unknown>;

type MstNode = {
  e?: Array<{
    k?: string;
    v?: { '/': string };
    t?: { '/': string };
  }>;
  l?: { '/': string };
};

type RepoCommit = {
  data: { '/': string };
  rev: string;
  prev?: { '/': string } | null;
};