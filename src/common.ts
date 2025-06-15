export type DidString = `did:plc:${string}` | `did:web:${string}` | undefined;

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
  // check for 0x at start and strip it if present
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