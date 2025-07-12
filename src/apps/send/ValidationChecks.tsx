import React, { useState } from 'react';
import type { AddressControlVerificationChecks } from "../../shared/verify.ts";
import './ValidationChecks.css';

interface ValidationChecksProps {
  validation: AddressControlVerificationChecks;
}

export const ValidationChecks: React.FC<ValidationChecksProps> = ({ validation }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPassedChecks = (): { passed: number, total: number } => {
    const checks = [
      validation.siweSignatureValid,
      validation.statementMatches,
      validation.merkleProofValid !== undefined ? validation.merkleProofValid : false
    ];
    
    const passed = checks.filter(c => c === true).length;
    const total = checks.length;
    
    return { passed, total };
  };

  const getStatusIcon = () => {
    const { passed, total } = getPassedChecks();
    
    // If all checks passed, show checkmark
    if (passed === total && validation.merkleProofValid !== null) {
      return '✅';
    }
    
    // If critical checks (signature or statement) failed, show alert
    if (validation.siweSignatureValid === false || validation.statementMatches === false) {
      return '🚨';
    }
    
    // If only merkle proof is unchecked/null but other checks passed, show warning
    if (validation.siweSignatureValid === true && validation.statementMatches === true && validation.merkleProofValid === null) {
      return '⚠️';
    }
    
    // Default case for other scenarios
    return passed > 0 ? '⚠️' : '🚨';
  };

  const { passed, total } = getPassedChecks();

  return (
    <div className="safety-checklist-inline">
      <div 
        className={`validation-summary ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>
          {isExpanded ? '▼' : '▶'}
        </span>
        <span style={{ fontWeight: 600 }}>
          Security Checks: {passed}/{total} passed
        </span>
        <span>
          {getStatusIcon()}
        </span>
      </div>
      
      {isExpanded && (
        <div className="validation-details">
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
        </div>
      )}
    </div>
  );
};
