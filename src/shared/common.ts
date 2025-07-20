import { CHAIN_COLORS, CHAIN_NAMES } from "./constants.ts";

export type HexString = `0x${string}`;
export type EvmAddressString = HexString;

export type MaybeDidString = `did:plc:${string}` | `did:web:${string}` | undefined;
export type DidString = Exclude<MaybeDidString, undefined>;

export type SiweStatementString = `Prove control of 0x${string} to link it to ${DidString}`;

// TODO - make types stricter than just string, where applicable
export type SiweLexiconObject = {
  domain: string;   				// needs better type
  address: `0x${string}`,
  statement: SiweStatementString;
  version: "1",
  chainId: number;
  nonce: string;
  uri: string;
  issuedAt: string;  				// needs better type		
}

export type AtprotoBytesField = { "$bytes": string };

export const ADDRESS_CONTROL_LEXICON_TYPE = 'club.stellz.evm.addressControl';

export type AddressControlRecord = {
  '$type': 'club.stellz.evm.addressControl',
  address: AtprotoBytesField;
  alsoOn?: Set<number>; // List of other chain IDs this address is active on
  signature: AtprotoBytesField;
  siwe: SiweLexiconObject;
};

// Address control record from the user's PDS
export interface AddressControlRecordWithMeta {
  uri: AtUriString;
  value: AddressControlRecord;
}

// Enriched user data with handle and profile information
export interface EnrichedUser {
  did: DidString;
  handle?: string;
  handleVerified?: boolean; // Whether the handle has been verified to belong to this DID
  displayName?: string;
  avatar?: string;
  description?: string;
  pds?: string;
  addressControlRecords?: AddressControlRecordWithMeta[];
  createdAt?: Date;
  followersCount?: number;
  postsCount?: number;
}

// Cache entry for enriched user data
export interface EnrichedUserCacheEntry {
  data: EnrichedUser[];
  timestamp: number;
}

declare global {
  interface Uint8Array {
    toBase64(): string;
  }
}

// Add a Uint8Array.toBase64() implementation if not already available
if (!Uint8Array.prototype.toBase64) {
  Uint8Array.prototype.toBase64 = function () {
    let binary = '';
    for (let i = 0, len = this.length; i < len; i++) {
      binary += String.fromCharCode(this[i]);
    }
    return btoa(binary);
  };
}

export const hexToBase64 = (hex: string): string => {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }  
  
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.toBase64();
}


export function uid(length = 96): string {
  const byteLength = Math.ceil(length / 2);
  const array = new Uint8Array(byteLength);

  // Prefer cryptographically secure random numbers if available.
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback to Math.random() (less secure)
    for (let i = 0; i < byteLength; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, length);
}

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

export function getChainColor(chainId: number): string {
  return CHAIN_COLORS[chainId] || '#627EEA'; // default to Ethereum blue
}

export function getChainGradient(chainId: number): string {
  const chainColor = getChainColor(chainId);
  
  // Special handling for chains with colors that don't mesh well with base blue
  if (chainId === 10 || chainId === 42161) { // Optimism or Arbitrum
    // Keep base blue in center, gradient towards (but not reaching) chain color at edges
    return `radial-gradient(circle at 50% 50%, #1d9bf0 0%, #1d9bf0 60%, ${chainColor}40 100%)`;
  }
  
  // Default gradient for other chains
  // Spends more time on standard blue before transitioning to brand color
  return `radial-gradient(circle at 50% 50%, ${chainColor} 0%, #1d9bf0 30%, #1d9bf0 70%, ${chainColor} 100%)`;
}

export function getChainClass(chainId: number): string {
  const chainClassMap: Record<number, string> = {
    1: 'ethereum',
    8453: 'base',
    10: 'optimism',
    100: 'gnosis',
    42161: 'arbitrum',
  };
  return chainClassMap[chainId] || 'ethereum'; // default to ethereum styling
}

export function getDoraNetworkSlug(chainId: number): string | null {
  const ondoraSlugMap: Record<number, string> = {
    1: 'ethereum',
    8453: 'base',
    42161: 'arbitrum',
  };
  return ondoraSlugMap[chainId] || null; // default to ethereum
}

export function getDoraTransactionUrl(txHash: string, chainId: number): string {
  const networkSlug = getDoraNetworkSlug(chainId);
  return `https://ondora.xyz/network/${networkSlug}/interactions/${txHash}`;
}

// Utility functions for user identity resolution
export function isDidString(input: string): input is DidString {
  return input.startsWith('did:plc:') || input.startsWith('did:web:');
}

export function isHandle(input: string): boolean {
  // Bluesky handles are domain-like (e.g., alice.bsky.social, example.com)
  // They should contain at least one dot and not start with did:
  return !input.startsWith('did:') && input.includes('.') && input.length > 3;
}

// Group records by address, collecting all chains for each address
export const aggregateWallets = (records: AddressControlRecordWithMeta[]): AddressControlRecordWithMeta[] => {
  const addressMap = new Map<string, AddressControlRecordWithMeta>();
  
  for (const record of records) {
    const val = record.value;
    const address = val.siwe.address.toLowerCase();
    if (!address) continue; // Skip records without valid addresses

    const existing = addressMap.get(address);
    if (!existing) {
      // first time seeing this address
      addressMap.set(address, record);
    } else {
      // add chains if not already present
      const thisChains = Array.from([val.siwe.chainId, ...(val?.alsoOn || [])]);
      if (!existing.value.alsoOn) 
        existing.value.alsoOn = new Set<number>(thisChains);
      else
        thisChains.forEach(chain => existing.value.alsoOn?.add(chain));
    }
  }

  return Array.from(addressMap.values());
}

export const atpBytesToHex = (recordField: AtprotoBytesField): HexString => {
  const bytes = Uint8Array.from(atob(recordField["$bytes"]), c => c.charCodeAt(0));
  const sigHex: HexString = ('0x' + bytes.reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '')) as HexString;
  return sigHex;
}

export type AtUriString = `at://${DidString}/${string}`;