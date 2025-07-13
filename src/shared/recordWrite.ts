import { Agent, ComAtprotoRepoCreateRecord } from '@atproto/api'
import { type OAuthSession } from "@atproto/oauth-client-browser";
import { type SiweMessage } from 'viem/siwe';

import { hexToBase64, type EvmAddressString, type AddressControlRecord, type AtprotoBytesField, ADDRESS_CONTROL_LEXICON_TYPE } from "./common.ts";
import { lexiconFormatSiweMessage } from './siwe.ts';


type SignatureString = `0x${string}`;

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

