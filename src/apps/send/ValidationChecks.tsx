import React from 'react';
import type { AddressControlVerificationChecks } from "../../shared/verify.ts";

interface ValidationChecksProps {
  validation: AddressControlVerificationChecks;
}

export const ValidationChecks: React.FC<ValidationChecksProps> = ({ validation }) => {
  return (
    <div className="safety-checklist-inline">
      <div className={`checklist-item ${validation.siweSignatureValid ? 'verified' : 'failed'}`}>
        <span className="check-icon">{validation.siweSignatureValid ? '✅ ' : '❌ '}</span>
        <span className="check-text">Wallet Signature {validation.siweSignatureValid ? 'Valid' : 'Invalid'}</span>
      </div>
      <div className={`checklist-item ${validation.statementMatches ? 'verified' : 'failed'}`}>
        <span className="check-icon">{validation.statementMatches ? '✅ ' : '❌ '}</span>
        <span className="check-text">Statement {validation.statementMatches ? 'Matches' : 'Mismatch'}</span>
      </div>
	  {validation.merkleProofValid !== undefined && (
		<div className={`checklist-item ${
		  validation.merkleProofValid === null ? 'warning' : 
		  validation.merkleProofValid ? 'verified' : 'failed'
		}`}>	
		  <span className="check-icon">{
		    validation.merkleProofValid === null ? '⚠️ ' : 
		    validation.merkleProofValid ? '✅ ' : '❌ '
		  }</span>
		  <span className="check-text">Merkle Proof {
		    validation.merkleProofValid === null ? 'Unchecked' : 
		    validation.merkleProofValid ? 'Valid' : 'Invalid'
		  }</span>
		</div>
      )}
      {validation.domainIsTrusted !== undefined && (
        <div className={`checklist-item ${validation.domainIsTrusted ? 'verified' : 'warning'}`}>
          <span className="check-icon">{validation.domainIsTrusted ? '✅ ' : '⚠️ '}</span>
          <span className="check-text">Domain {validation.domainIsTrusted ? 'Trusted' : 'Untrusted'}</span>
        </div>
      )}
    </div>
  );
};
