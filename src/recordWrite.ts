import type { OAuthSession } from "@atproto/oauth-client-browser";
import { hexToBase64, type DidString } from "./common";


type AddressString = `0x${string}`;
type SignatureString = `0x${string}`;

export type AddressControlRecord = {
  '$type': 'club.stellz.evm.addressControl',
  address: AtprotoBytesField;
  attestation: AtprotoBytesField;
};

export type AtprotoBytesField = { "$bytes": string };

const hexToAtpBytes = (hex: string): AtprotoBytesField => ({ "$bytes": hexToBase64(hex) });

export const createAddressControlRecord = (address: AddressString, attestation: SignatureString): AddressControlRecord => {
  return {
    '$type': 'club.stellz.evm.addressControl',
    address: hexToAtpBytes(address),
    attestation: hexToAtpBytes(attestation),
  };
}

export const writeAddressControlRecord = async (
  did: DidString,
  record: AddressControlRecord,
  pdsUrl: string, 
  oauth: OAuthSession 
): Promise<any> => {
  return null;
}

