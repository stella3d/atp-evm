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
  accessToken: string 
): Promise<any> => {
  const response = await fetch(`https://bsky.network/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({
        repo: did,
        collection: 'club.stellz.evm.addressControl',
        record: record
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to write record: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Record written:', data);

  return data;
}

