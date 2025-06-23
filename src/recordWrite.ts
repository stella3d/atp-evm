import { Agent, ComAtprotoRepoCreateRecord } from '@atproto/api'
import type { OAuthSession } from "@atproto/oauth-client-browser";
import type { SiweMessage } from "siwe";

import { hexToBase64, type EvmAddressString } from "./common";
import { lexiconFormatSiweMessage, type SiweLexiconObject } from './siwe';


type SignatureString = `0x${string}`;

export type AddressControlRecord = {
  '$type': 'club.stellz.evm.addressControl',
  address: AtprotoBytesField;
  attestation: AtprotoBytesField;
};

export type SiweAddressControlRecord = {
  '$type': 'club.stellz.evm.addressControl',
  address: AtprotoBytesField;
  signature: AtprotoBytesField;
  siwe: SiweLexiconObject;
};

export const ADDRESS_CONTROL_LEXICON_TYPE = 'club.stellz.evm.addressControl';

export type AtprotoBytesField = { "$bytes": string };

const hexToAtpBytes = (hex: string): AtprotoBytesField => ({ "$bytes": hexToBase64(hex) });

export const createAddressControlRecord = (address: EvmAddressString, attestation: SignatureString): AddressControlRecord => {
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
): SiweAddressControlRecord => {
  console.log('serializing SIWE address control record:', address, siweMsg, sig);
  const record: SiweAddressControlRecord = {
    '$type': ADDRESS_CONTROL_LEXICON_TYPE,
    address: hexToAtpBytes(address),
    signature: hexToAtpBytes(sig),
    siwe: lexiconFormatSiweMessage(siweMsg)
  };

  console.log('Serialized SIWE address control record:', record);
  return record;
}

export const writeAddressControlRecord = async (
  record: SiweAddressControlRecord,
  oauth: OAuthSession 
): Promise<ComAtprotoRepoCreateRecord.Response> => {
  const agent = new Agent(oauth);
  
  const response = await agent.com.atproto.repo.createRecord({
    repo: oauth.did,
    collection: ADDRESS_CONTROL_LEXICON_TYPE,
    record,
  });

  return response;
}

