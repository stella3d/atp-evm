import type { SiweMessage } from "viem/siwe";
import type { EvmAddressString, SiweStatementString, SiweLexiconObject } from "./common.ts";

export const lexiconFormatSiweMessage = (message: SiweMessage): SiweLexiconObject => {
  // this validation code is pretty sloppy, but it should be enough for now
  let address: EvmAddressString;
  if (/^0x[a-fA-F0-9]{40}$/.test(message.address)) {
	  address = message.address as EvmAddressString;
  } else {
    const err = `invalid Ethereum address format: ${message.address}`;
    console.error(err);
    throw new Error(err);
  }

  if (message.version !== "1") {
    const err = `unsupported Sign in With Ethereum version: ${message.version}, must be "1"`;
    console.error(err);
    throw new Error(err);
  }

  if (!message.issuedAt) {
    const err = `issuedAt is required in Sign in With Ethereum message`;
    console.error(err);
    throw new Error(err);
  }

  try {
	  new Date(message.issuedAt);
  } catch {
    const err = `invalid issuedAt format: ${message.issuedAt}`;
    console.error(err);
    throw new Error(err);
  }

  return {
    domain: message.domain,
    address,
    statement: message.statement as SiweStatementString,
    version: message.version,
    chainId: message.chainId,
    nonce: message.nonce,
    uri: message.uri,
    issuedAt: message.issuedAt.toISOString(),
  };
};