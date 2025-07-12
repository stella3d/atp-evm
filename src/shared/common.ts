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
    alsoOn?: Set<number>; // List of other chain IDs this address is active on
    [key: string]: unknown;
  };
}

// Enriched user data with handle and profile information
export interface EnrichedUser {
  did: DefinedDidString;
  handle?: string;
  handleVerified?: boolean; // Whether the handle has been verified to belong to this DID
  displayName?: string;
  avatar?: string;
  description?: string;
  pds?: string;
  addressControlRecords?: AddressControlRecord[];
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

// Chain ID to friendly name mapping
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  10: 'Optimism',
  100: 'Gnosis',
  42161: 'Arbitrum'
};

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

// Chain ID to brand color mapping
export const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA',     // Ethereum - blue
  8453: 'rgb(0, 82, 255)',  // Base - blue
  10: '#ff0420',    // Optimism - red
  100: 'rgb(62, 105, 87)', // Gnosis Chain - dark green
  42161: '#213147'  // Arbitrum - dark blue/gray
};

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
export function isDidString(input: string): input is DefinedDidString {
  return input.startsWith('did:plc:') || input.startsWith('did:web:');
}

export function isHandle(input: string): boolean {
  // Bluesky handles are domain-like (e.g., alice.bsky.social, example.com)
  // They should contain at least one dot and not start with did:
  return !input.startsWith('did:') && input.includes('.') && input.length > 3;
}