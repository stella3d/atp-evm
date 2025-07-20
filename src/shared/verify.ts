import { atpBytesToHex } from "./common.ts";
import type { DidString, AddressControlRecord } from "./common.ts";
import { makeSiweStatement } from "./WalletConnector.tsx";
import { createSiweMessage, verifySiweMessage, type SiweMessage } from "viem/siwe";
import { getEthClient } from "./useTokenBalances.ts";


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
    const ethClient = getEthClient(record.siwe.chainId);
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
  did: DidString, 
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
