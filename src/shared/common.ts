export type EvmAddressString = `0x${string}`;

export type DidString = `did:plc:${string}` | `did:web:${string}` | undefined;
export type DefinedDidString = Exclude<DidString, undefined>;

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