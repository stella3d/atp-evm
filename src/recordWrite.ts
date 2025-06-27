import { Agent, ComAtprotoRepoCreateRecord } from '@atproto/api'
import { type OAuthSession } from "@atproto/oauth-client-browser";
import type { SiweMessage } from "siwe";

import { hexToBase64, type EvmAddressString } from "./common.ts";
import { lexiconFormatSiweMessage, type SiweLexiconObject } from './siwe.ts';


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

