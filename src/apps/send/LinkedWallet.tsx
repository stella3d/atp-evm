import React from 'react';
import { isAddress } from 'viem';
import type { AddressControlRecordWithMeta } from '../../shared/common.ts';
import type { AddressControlVerificationChecks } from '../../shared/verify.ts';
import { getChainName, getChainColor, getChainGradient } from '../../shared/common.ts';
import { AddressLink } from '../../shared/AddressLink.tsx';
import AtUriLink from '../../shared/AtUriLink.tsx';
import { ValidationChecks, isCriticalValidationFailure } from './ValidationChecks.tsx';

interface LinkedWalletProps {
  record: AddressControlRecordWithMeta;
  validationResults: Map<string, AddressControlVerificationChecks>;
  selectedChains: Record<string, number>;
  onChainChange: (recordUri: string, chainId: number) => void;
  isConnected: boolean;
  onSendClick: (address: `0x${string}`, chainId: number) => void;
  showValidationChecks: boolean;
}

export const LinkedWallet: React.FC<LinkedWalletProps> = ({
  record,
  validationResults,
  selectedChains,
  onChainChange,
  isConnected,
  onSendClick,
  showValidationChecks,
}) => {
  const val = record.value;
  const address = val.siwe.address;
  const issuedAt = val.siwe.issuedAt;
  const domain = val.siwe.domain;

  // Use the chain it was signed on as the default for user
  const primaryChain = {
    chainId: val.siwe.chainId,
    record,
    issuedAt,
  };

  const validation = validationResults.get(record.uri);
  const isCriticalFailure = validation && isCriticalValidationFailure(validation);

  const siwe = record.value.siwe;
  const on = Number(siwe.chainId);
  const alsoOn: number[] = Array.isArray(record.value.alsoOn)
    ? record.value.alsoOn.filter((n) => !isNaN(n))
    : [];
  const chainIds = Array.from(new Set([on, ...alsoOn]));
  const selected = selectedChains[record.uri] ?? chainIds[0];

  return (
    <div 
      key={record.uri} 
      className={`address-record ${isCriticalFailure ? 'critical-failure' : ''}`}
      data-address-hash={parseInt(address.slice(-2), 16) % 8}
    >
      <div className="address-info">
        <div className="address-header">
          {isAddress(address) ? (
            <AddressLink address={address as `0x${string}`} className="address-value" />
          ) : (
            <div className="address-value">{address}</div>
          )}
        </div>
        {showValidationChecks && validationResults.has(record.uri) && (
          <>
            {(() => {
              const validation = validationResults.get(record.uri);
              const isCriticalFailure = validation && isCriticalValidationFailure(validation);
              
              return isCriticalFailure ? (
                <div className="warning strong" style={{ marginBottom: '8px' }}>
                  🚨 This link failed validation and may be malicious 🚨
                </div>
              ) : null;
            })()}
            <ValidationChecks 
              validation={validationResults.get(record.uri)!}
            />
          </>
        )}
        <AtUriLink atUri={record.uri} caption="view record"></AtUriLink>

        {issuedAt && (
          <div>
          <div style={{ color: 'gray', fontWeight: 720 }}>signed on</div>
          <div className="address-metadata">
            <div className="metadata-column">
              <div className="metadata-label">⛓️</div>
              <div className="address-meta-value">
                {getChainName(primaryChain.chainId)}
              </div>
            </div>
            
            <div className="metadata-column">
              <div className="metadata-label">{domain === 'wallet-link.stellz.club' ? `🌐 ✅` : '🌐 ⚠️'}</div>
              <div className="address-meta-value">{domain}</div>
            </div>
            
            <div className="metadata-column">
              <div className="metadata-label">🗓️</div>
              <div className="address-meta-value">
                {new Date(primaryChain.issuedAt).toLocaleDateString()}<br />
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
      
      <div className="send-buttons-container">
        <div className="send-controls">
          <button
            type="button"
            className={`send-payment-button ${isCriticalFailure ? 'disabled' : ''}`}
            style={{
              background: isCriticalFailure ? '#6c757d' : getChainGradient(selected),
              color: 'white',
              filter: isCriticalFailure ? 'none' : 'blur(0.25px)',
              cursor: isCriticalFailure ? 'not-allowed' : 'pointer',
              opacity: isCriticalFailure ? 0.6 : 1
            }}
            disabled={isCriticalFailure}
            onClick={() => {
              if (isCriticalFailure) return;
              if (!isConnected) {
                alert('Please connect your wallet first to send payments');
                return;
              }
              onSendClick(address as `0x${string}`, selected);
            }}
          >
            Send
          </button>
          <span className="chain-label">on</span>
          <select
            value={selected}
            onChange={e => onChainChange(record.uri, Number(e.target.value))}
            className={`chain-select ${isCriticalFailure ? 'disabled' : ''}`}
            style={{
              backgroundColor: isCriticalFailure ? '#6c757d' : getChainColor(selected),
              color: 'white',
              cursor: isCriticalFailure ? 'not-allowed' : 'pointer',
              opacity: isCriticalFailure ? 0.6 : 1
            }}
            disabled={isCriticalFailure}
          >
            {chainIds.map(id => (
              <option key={id} value={id}>
                {getChainName(id)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
