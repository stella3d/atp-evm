import type { OAuthSession } from "@atproto/oauth-client-browser";
import { hexToBase64, type DidString } from "./common";
import type { SiweMessage } from "siwe";


type AddressString = `0x${string}`;
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
  siwe: SiweMessage;
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

export const serializeSiweAddressControlRecord = (
  address: AddressString, 
  siwe: SiweMessage, 
  sig: SignatureString
): SiweAddressControlRecord => {
  return {
    '$type': 'club.stellz.evm.addressControl',
    address: hexToAtpBytes(address),
    siwe,
    signature: hexToAtpBytes(sig)
  };
}

export const writeAddressControlRecord = async (
  _did: DidString,
  _record: AddressControlRecord,
  _pdsUrl: string, 
  _oauth: OAuthSession 
): Promise<any> => {
  return null;
}

