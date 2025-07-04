export type EvmAddressString = `0x${string}`;

export type DidString = `did:plc:${string}` | `did:web:${string}` | undefined;
export type DefinedDidString = Exclude<DidString, undefined>;

// Address control record from the user's PDS
export interface AddressControlRecord {
  uri: string;
  value: {
    siwe: {
      address: string;
      issuedAt: string;
      chainId: number;
      domain: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

// Enriched user data with handle and profile information
export interface EnrichedUser {
  did: DefinedDidString;
  handle?: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  pds?: string;
  addressControlRecords?: AddressControlRecord[];
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

// Chain ID to friendly name mapping
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  10: 'Optimism',
  42161: 'Arbitrum',
  137: 'Polygon',
  56: 'BNB Chain'
};

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

export function getChainClass(chainId: number): string {
  const chainClassMap: Record<number, string> = {
    1: 'ethereum',
    8453: 'base', 
    10: 'optimism',
    42161: 'arbitrum'
  };
  return chainClassMap[chainId] || 'ethereum'; // default to ethereum styling
}

export function getDoraNetworkSlug(chainId: number): string {
  const ondoraSlugMap: Record<number, string> = {
    1: 'ethereum',
    8453: 'base',
    10: 'optimism', 
    42161: 'arbitrum',
    137: 'polygon'
  };
  return ondoraSlugMap[chainId] || 'ethereum'; // default to ethereum
}

export function getDoraTransactionUrl(txHash: string, chainId: number): string {
  const networkSlug = getDoraNetworkSlug(chainId);
  return `https://ondora.xyz/network/${networkSlug}/interactions/${txHash}`;
}