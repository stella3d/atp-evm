import React, { useState } from 'react';
import type { AddressControlVerificationChecks } from "../../shared/verify.ts";
import './ValidationChecks.css';

interface ValidationChecksProps {
  validation: AddressControlVerificationChecks;
}

export enum RecordValidationStatus {
  FULLY_VALID = 'FULLY_VALID',
  CRITICAL_FAILURE = 'CRITICAL_FAILURE',
  MERKLE_UNCHECKED = 'MERKLE_UNCHECKED'
}

export const getRecordValidationStatus = (validation: AddressControlVerificationChecks): RecordValidationStatus => {
  const checks = [
    validation.siweSignatureValid,
    validation.statementMatches,
    validation.merkleProofValid !== undefined ? validation.merkleProofValid : false
  ];
  
  const passed = checks.filter(c => c === true).length;
  const total = checks.length;
  
  // If critical checks (signature or statement) failed, this is a critical failure
  if (validation.siweSignatureValid === false || validation.statementMatches === false) {
    return RecordValidationStatus.CRITICAL_FAILURE;
  }
  
  // If only merkle proof is unchecked/null but other checks passed
  if (validation.siweSignatureValid === true && validation.statementMatches === true && validation.merkleProofValid === null) {
    return RecordValidationStatus.MERKLE_UNCHECKED;
  }
  
  // If all checks passed and merkle proof was actually checked
  if (passed === total && validation.merkleProofValid !== null) {
    return RecordValidationStatus.FULLY_VALID;
  }
  
  // Default to critical failure for any other case
  return RecordValidationStatus.CRITICAL_FAILURE;
};

export const isCriticalValidationFailure = (validation: AddressControlVerificationChecks): boolean => {
  const status = getRecordValidationStatus(validation);
  return status === RecordValidationStatus.CRITICAL_FAILURE;
};

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

  const getValidationStatus = (): RecordValidationStatus => {
    return getRecordValidationStatus(validation);
  };

  const getStatusIcon = (status: RecordValidationStatus): string => {
    switch (status) {
      case RecordValidationStatus.FULLY_VALID:
        return '✅';
      case RecordValidationStatus.CRITICAL_FAILURE:
        return '🚨';
      case RecordValidationStatus.MERKLE_UNCHECKED:
        return '⚠️';
      default:
        return '❓';
    }
  };

  const { passed, total } = getPassedChecks();
  const validationStatus = getValidationStatus();

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
          {getStatusIcon(validationStatus)}
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
