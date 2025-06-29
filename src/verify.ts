



export type AddressControlVerificationChecks = {
  // siwe.statement matches exactly, includes both wallet & DID matches
  statementMatches: boolean | null;
  // wallet signature is cryptographically valid for the address
  siweSignatureValid: boolean | null;
  // ATProto-side merkle inclusion proof from getRecord is valid
  merkleProofValid: boolean | null;
  // (OPTIONAL) domain in signed SIWE message is a domain we trust
  domainIsTrusted: boolean | null | undefined;
}