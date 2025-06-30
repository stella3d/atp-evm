import { Agent, ComAtprotoRepoCreateRecord, ComAtprotoSyncGetRecord } from '@atproto/api'
import { type OAuthSession } from "@atproto/oauth-client-browser";

import { hexToBase64, type EvmAddressString } from "./common.ts";
import { lexiconFormatSiweMessage, type SiweLexiconObject } from './siwe.ts';
import { SiweMessage } from 'viem/siwe';


type SignatureString = `0x${string}`;

export type OldAddressControlRecord = {
  '$type': 'club.stellz.evm.addressControl',
  address: AtprotoBytesField;
  attestation: AtprotoBytesField;
};

export type AddressControlRecord = {
  '$type': 'club.stellz.evm.addressControl',
  address: AtprotoBytesField;
  signature: AtprotoBytesField;
  siwe: SiweLexiconObject;
};


export type AddressControlVerificationResults = {
  statementMatches: boolean | null;
  signatureValid: boolean | null;
  merkleProofChecked: boolean | null;
}

// deno-lint-ignore require-await
export const verifyAddressControlRecord = async (
  _record: AddressControlRecord,
  _address: EvmAddressString
): Promise<AddressControlVerificationResults> => {
  // default case
  return {
    statementMatches: null,
    signatureValid: null,
    merkleProofChecked: null,
  }
}

export const verifyRecordSiweSignature = async (record: AddressControlRecord): Promise<boolean> => {
  const reconstructedMsg: SiweMessage = new SiweMessage({
    domain: record.siwe.domain,
    address: record.siwe.address,
    statement: record.siwe.statement,
    version: record.siwe.version,
    chainId: record.siwe.chainId,
    nonce: record.siwe.nonce,
    uri: record.siwe.uri,
    issuedAt: record.siwe.issuedAt,
  });

  try {
    const sigBase64 = record.signature["$bytes"];
    const bytes = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));
    const sigHex = '0x' + bytes.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

    const verifyResult = await reconstructedMsg.verify({
      signature: sigHex,
      domain: reconstructedMsg.domain,
    });
    console.log("verifyResult:", verifyResult);
    return verifyResult.success;
  } catch (e) {
    console.error("error verifying Sign in With Ethereum signature in record:", e);
  }
  return false;
}


export const ADDRESS_CONTROL_LEXICON_TYPE = 'club.stellz.evm.addressControl';

export type AtprotoBytesField = { "$bytes": string };

const hexToAtpBytes = (hex: string): AtprotoBytesField => ({ "$bytes": hexToBase64(hex) });

export const createAddressControlRecord = (address: EvmAddressString, attestation: SignatureString): OldAddressControlRecord => {
  return {
    '$type': ADDRESS_CONTROL_LEXICON_TYPE,
    address: hexToAtpBytes(address),
    attestation: hexToAtpBytes(attestation),
  };
}

export const serializeSiweAddressControlRecord = (
  address: EvmAddressString, 
  siweMsg: SiweMessage, 
  sig: SignatureString
): AddressControlRecord => {
  const record: AddressControlRecord = {
    '$type': ADDRESS_CONTROL_LEXICON_TYPE,
    address: hexToAtpBytes(address),
    signature: hexToAtpBytes(sig),
    siwe: lexiconFormatSiweMessage(siweMsg)
  };

  return record;
}

export const writeAddressControlRecord = async (
  record: AddressControlRecord,
  oauth: OAuthSession,
): Promise<ComAtprotoRepoCreateRecord.Response> => {
  const agent = new Agent(oauth);
  return await agent.com.atproto.repo.createRecord({
    repo: oauth.did,
    collection: ADDRESS_CONTROL_LEXICON_TYPE,
    record,
  });
}


export const fetchAddressControlRecords = async (
  did: string,
  oauth: OAuthSession,
): Promise<ComAtprotoSyncGetRecord.Response[]> => {
  const agent = new Agent(oauth);
  const listResponse = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: ADDRESS_CONTROL_LEXICON_TYPE,
    limit: 16,
  });

  const responses = await Promise.all(
    listResponse.data.records.map(record =>
      agent.com.atproto.sync.getRecord({
        did: did,
        collection: ADDRESS_CONTROL_LEXICON_TYPE,
        rkey: record.uri.split('/').pop()!,
      })
    )
  );

  return responses
}

