import { Agent, ComAtprotoRepoCreateRecord } from '@atproto/api'
import { type OAuthSession } from "@atproto/oauth-client-browser";

import { hexToBase64, type EvmAddressString } from "./common.ts";
import { lexiconFormatSiweMessage, type SiweLexiconObject } from './siwe.ts';
import { createSiweMessage, verifySiweMessage, type SiweMessage } from 'viem/siwe';
import { createPublicClient, http } from "viem";
import { chainForId } from "./WalletConnector.tsx";


type SignatureString = `0x${string}`;

export type AddressControlRecord = {
  '$type': 'club.stellz.evm.addressControl',
  address: AtprotoBytesField;
  alsoOn?: bigint[]; // List of other chain IDs this address is active on
  signature: AtprotoBytesField;
  siwe: SiweLexiconObject;
};

export type AddressControlVerificationResults = {
  statementMatches: boolean | null;
  signatureValid: boolean | null;
  merkleProofChecked: boolean | null;
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
    const sigBase64 = record.signature["$bytes"];
    const bytes = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));
    const sigHex: `0x${string}` = ('0x' + bytes.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')) as `0x${string}`;

    const ethClient = createPublicClient({
      chain: chainForId(record.siwe.chainId),
      transport: http()
    });

    const verifyResult: boolean = await verifySiweMessage(ethClient, {
      message,
      signature: sigHex,
      domain: reconstructedMsg.domain,
      nonce: reconstructedMsg.nonce,
      address: reconstructedMsg.address,
    });
    console.log("verifyResult:", verifyResult);
    return verifyResult;
  } catch (e) {
    console.error("error verifying Sign in With Ethereum signature in record:", e);
  }
  return false;
}


export const ADDRESS_CONTROL_LEXICON_TYPE = 'club.stellz.evm.addressControl';

export type AtprotoBytesField = { "$bytes": string };

const hexToAtpBytes = (hex: string): AtprotoBytesField => ({ "$bytes": hexToBase64(hex) });

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

