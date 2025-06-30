import { Agent, ComAtprotoSyncGetRecord } from "@atproto/api";
import { DefinedDidString } from "./common.ts";
import { ADDRESS_CONTROL_LEXICON_TYPE, AddressControlRecord, verifyRecordSiweSignature } from "./recordWrite.ts";
import { makeSiweStatement } from "./WalletConnector.tsx";




export type AddressControlVerificationChecks = {
  // record's siwe.statement matches exactly, includes both wallet & DID matches
  statementMatches: boolean | null;
  // wallet signature is cryptographically valid for the record's address
  siweSignatureValid: boolean | null;
  // ATProto-side merkle inclusion proof from getRecord is valid
  merkleProofValid: boolean | null;
  // (OPTIONAL) record's siwe.domain is a domain we trust
  domainIsTrusted: boolean | null | undefined;
}

export const checkLinkValidity = async (did: DefinedDidString, record: AddressControlRecord): Promise<AddressControlVerificationChecks> => {
	const results: AddressControlVerificationChecks = {
		statementMatches: null,
		siweSignatureValid: null,
		merkleProofValid: null,
		domainIsTrusted: undefined
	};

	// check 1: statement matches
	const expectedStatement = makeSiweStatement(record.siwe.address, did);
	results.statementMatches = (record.siwe.statement === expectedStatement);

	// check 2: wallet signature & SIWE message are valid
	results.siweSignatureValid = await verifyRecordSiweSignature(record);

	return results;
}


export const fetchLinkRecord = async (agent: Agent, did: DefinedDidString, rkey: string): Promise<ComAtprotoSyncGetRecord.Response> => {
	try {
		const response = await agent.com.atproto.sync.getRecord({
			did,
			collection: ADDRESS_CONTROL_LEXICON_TYPE,
			rkey,
		});

		console.log("fetched addressControl record:", response);
		return response;
  } catch (e) {
	throw new Error("error fetching addressControl record: " + e);
  }
}