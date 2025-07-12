import React, { useState, useEffect } from 'react';
import { isAddress } from 'viem';
import { useAccount, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { EnrichedUser, AddressControlRecord, DefinedDidString } from "../../shared/common.ts";
import { getChainName, getChainColor, getChainGradient } from "../../shared/common.ts";
import { fetchAddressControlRecords } from "../../shared/fetch.ts";
import type { AddressControlVerificationChecks } from "../../shared/verify.ts";
import { PaymentModal } from "./PaymentModal.tsx";
import { AddressLink } from "../../shared/AddressLink.tsx";
import { AtprotoUserCard, UserCardVariant } from "../../shared/AtprotoUserCard.tsx";
import { ConnectWallet } from "../../shared/WalletConnector.tsx";
import { config } from '../../shared/WalletConnector.tsx';
import './UserDetailCard.css';

interface UserDetailCardProps {
  selectedUser: EnrichedUser;
  onClose?: () => void;
  triggerPayment?: DefinedDidString | null; // DID to trigger payment for
}

const linkifyText = (text: string): React.ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const handleRegex = /(\s@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;
  // Combined regex to split by both URLs and handles
  const combinedRegex = /(https?:\/\/[^\s]+|\s@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;

  return text.split(combinedRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#1d9bf0',
            textDecoration: 'underline',
          }}
        >
          {part}
        </a>
      );
    } else if (part.match(handleRegex)) {
      // Remove the space and @ symbol for the URL but keep them in the display text
      const handleWithoutSpaceAndAt = part.trim().substring(1);
      return (
        <span key={index}>
          {part.charAt(0)}
          <a
            href={`https://bsky.app/profile/${handleWithoutSpaceAndAt}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1d9bf0',
              textDecoration: 'underline',
            }}
          >
            {part.trim()}
          </a>
        </span>
      );
    }
    return part;
  });
};

// Group records by address, collecting all chains for each address
const aggregateWallets = (records: AddressControlRecord[]): AddressControlRecord[] => {
  const addressMap = new Map<string, AddressControlRecord>();
  
  for (const record of records) {
    const val = record.value;
    const address = val?.siwe?.address?.toLowerCase();
    if (!address) continue; // Skip records without valid addresses

    const existing = addressMap.get(address);
    if (!existing) {
      // first time seeing this address
      addressMap.set(address, record);
    } else {
      // add chains if not already present
      const thisChains = Array.from([val.siwe.chainId, ...(val?.alsoOn || [])]);
      if (!existing.value.alsoOn) 
        existing.value.alsoOn = new Set<number>(thisChains);
      else
        thisChains.forEach(chain => existing.value.alsoOn?.add(chain));
    }
  }

  return Array.from(addressMap.values());
}

// Inner component that uses wagmi hooks
const UserDetailCardInner: React.FC<UserDetailCardProps> = ({ selectedUser, onClose, triggerPayment }) => {
  const { isConnected } = useAccount();
  const [addressRecords, setAddressRecords] = useState<AddressControlRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Map<string, AddressControlVerificationChecks>>(new Map());
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    recipientAddress: `0x${string}`;
    chainId: number;
  }>({
    isOpen: false,
    recipientAddress: '0x0' as `0x${string}`,
    chainId: 1,
  });
  // Track selected chain per address record
  const [selectedChains, setSelectedChains] = useState<Record<string, number>>({});

  // Flag to show/hide validation checks
  const showValidationChecks = false;

  // Initialize default selected chain when addressRecords change
  useEffect(() => {
    const defaults: Record<string, number> = {};
    addressRecords.forEach(rec => {
      const siwe = (rec.value?.siwe || {}) as { chainId?: number; alsoOn?: number[] };
      const base = siwe.chainId || 1;
      const alsoOn: number[] = Array.isArray(siwe.alsoOn) ? siwe.alsoOn : [];
      const ids = Array.from(new Set([base, ...alsoOn]));
      defaults[rec.uri] = ids[0];
    });
    setSelectedChains(defaults);
  }, [addressRecords]);

  // Handle automatic payment modal trigger
  useEffect(() => {
    if (triggerPayment && triggerPayment === selectedUser.did) {
      console.log(`Auto-triggering payment modal for user: ${selectedUser.did}`);
      
      if (addressRecords.length === 0) {
        console.warn('Cannot trigger payment: user has no address records');
        return;
      }
      
      // Get the first address record
      const firstRecord = addressRecords[0];
      const address = firstRecord.value?.siwe?.address;
      const chainId = firstRecord.value?.siwe?.chainId || 1;
      
      if (address && isAddress(address)) {
        setPaymentModal({
          isOpen: true,
          recipientAddress: address as `0x${string}`,
          chainId: chainId,
        });
        console.log(`Payment modal opened for address: ${address} on chain ${chainId}`);
      } else {
        console.warn('First address record is not valid for payment');
      }
    }
  }, [triggerPayment, selectedUser.did, addressRecords]);

  useEffect(() => {
    const loadAddressRecords = async () => {
      if (!selectedUser.pds) {
        setRecordsError('PDS not available for this user');
        return;
      }

      setLoadingRecords(true);
      setRecordsError(null);
      try {
        const records = await fetchAddressControlRecords(selectedUser.did, selectedUser.pds);
        //console.log('Raw address records:', records);
        
        const deduplicatedRecords = aggregateWallets(records);
        setAddressRecords(deduplicatedRecords);

        // stub for record validation results
        const validationMap = new Map<string, AddressControlVerificationChecks>();
        for (const record of deduplicatedRecords) {
          try {
            validationMap.set(record.uri, {
              statementMatches: null,
              siweSignatureValid: null, // placeholder before actual verification
              merkleProofValid: null,
              domainIsTrusted: record.value?.siwe?.domain === 'wallet-link.stellz.club'
            });
          } catch (error) {
            console.error('failed to validate record:', record.uri, error);
            // set default failed validation
            validationMap.set(record.uri, {
              statementMatches: false,
              siweSignatureValid: false,
              merkleProofValid: null,
              domainIsTrusted: false
            });
          }
        }
        setValidationResults(validationMap);
      } catch (error) {
        setRecordsError(`Failed to load address records: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Error loading address records:', error);
      } finally {
        setLoadingRecords(false);
      }
    };

    loadAddressRecords();
  }, [selectedUser.did, selectedUser.pds]);

  return (
    <div className="user-detail-card">
      <div className="card-header">
        <h3>Selected User</h3>
        {onClose && (
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>
      
      <div className="card-content">
        <div className="user-profile">
          <AtprotoUserCard
            name={selectedUser.displayName}
            handle={selectedUser.handle}
            did={selectedUser.did}
            avatar={selectedUser.avatar}
            variant={UserCardVariant.PROFILE}
            clickable={!!selectedUser.handle}
            showDid
          />
          {(selectedUser.createdAt || selectedUser.followersCount !== undefined || selectedUser.postsCount !== undefined) && (
            <div className="profile-stats">
              <div className="stats-grid">
                {selectedUser.createdAt && (
                  <div className="stat-item">
                    <span className="stat-label">Joined:</span>
                    <span className="stat-value">
                      {(() => {
                        try {
                          const date = selectedUser.createdAt instanceof Date 
                            ? selectedUser.createdAt 
                            : new Date(selectedUser.createdAt);
                          return date.toLocaleDateString();
                        } catch {
                          return 'Unknown';
                        }
                      })()}
                    </span>
                  </div>
                )}
                {selectedUser.followersCount !== undefined && (
                  <div className="stat-item">
                    <span className="stat-label">Followers:</span>
                    <span className="stat-value">{selectedUser.followersCount.toLocaleString()}</span>
                  </div>
                )}
                {selectedUser.postsCount !== undefined && (
                  <div className="stat-item">
                    <span className="stat-label">Posts:</span>
                    <span className="stat-value">{selectedUser.postsCount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {selectedUser.description && (
            <div className="profile-description">
              {selectedUser.description.split('\n').map((line, index) => (
                <p key={index}>{linkifyText(line)}</p>
              ))}
            </div>
          )}
        </div>

        <div className="address-records">
          <label>Linked Ethereum Addresses</label>
          {loadingRecords ? (
            <div className="loading-records">Loading addresses...</div>
          ) : recordsError ? (
            <div className="records-error">{recordsError}</div>
          ) : addressRecords.length === 0 ? (
            <div className="no-records">No Ethereum addresses found</div>
          ) : (
            <div className="records-list">
              {addressRecords.map((record, index) => {
                const val = record.value;
                // Extract address from the SIWE structure
                const address = val.siwe.address;
                const issuedAt = val.siwe.issuedAt;
                const domain = val.siwe.domain;

                // Use the chain it was signed on as the default for user
                const primaryChain = {
                  chainId: val.siwe.chainId,
                  record,
                  issuedAt,
                };

                return (
                  <div key={record.uri || index} className="address-record">
                    <div className="address-info">
                      <div className="address-header">
                        {isAddress(address) ? (
                          <AddressLink address={address as `0x${string}`} className="address-value" />
                        ) : (
                          <div className="address-value">{address}</div>
                        )}
                      </div>
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
                      
                      {showValidationChecks && (() => {
                        const validation = validationResults.get(record.uri);
                        if (!validation) return null;
                        
                        return (
                          <div className="safety-checklist-inline">
                            <div className={`checklist-item ${validation.siweSignatureValid ? 'verified' : 'failed'}`}>
                              <span className="check-icon">{validation.siweSignatureValid ? '✅' : '❌'}</span>
                              <span className="check-text">Wallet Signature {validation.siweSignatureValid ? 'Valid' : 'Invalid'}</span>
                            </div>
                            <div className={`checklist-item ${validation.statementMatches ? 'verified' : 'failed'}`}>
                              <span className="check-icon">{validation.statementMatches ? '✅' : '❌'}</span>
                              <span className="check-text">Statement {validation.statementMatches ? 'Matches' : 'Mismatch'}</span>
                            </div>
                            {validation.domainIsTrusted !== undefined && (
                              <div className={`checklist-item ${validation.domainIsTrusted ? 'verified' : 'warning'}`}>
                                <span className="check-icon">{validation.domainIsTrusted ? '✅' : '⚠️'}</span>
                                <span className="check-text">Domain {validation.domainIsTrusted ? 'Trusted' : 'Untrusted'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    <div className="send-buttons-container">
                      {/* Dropdown + Send button */}
                      {(() => {
                        const siwe = (record.value?.siwe || {}) as { chainId?: number };
                        const on = Number(siwe.chainId) || 1;

                        const alsoOn: number[] = Array.isArray(record.value.alsoOn)
                          ? record.value.alsoOn.filter((n) => !isNaN(n))
                          : [];
                        const chainIds = Array.from(new Set([on, ...alsoOn]));

                        const selected = selectedChains[record.uri] ?? chainIds[0];
                        return (
                          <div className="send-controls">
                            <button
                              type="button"
                              className="send-payment-button"
                              style={{
                                background: getChainGradient(selected),
                                color: 'white',
                                filter: 'blur(0.25px)'
                              }}
                              onClick={() => {
                                if (!isConnected) {
                                  alert('Please connect your wallet first to send payments');
                                  return;
                                }
                                setPaymentModal({
                                  isOpen: true,
                                  recipientAddress: address as `0x${string}`,
                                  chainId: selected,
                                });
                              }}
                            >
                              Send
                            </button>
                            <span className="chain-label">on</span>
                            <select
                              value={selected}
                              onChange={e => setSelectedChains(prev => ({ ...prev, [record.uri]: Number(e.target.value) }))}
                              className="chain-select"
                              style={{
                                backgroundColor: getChainColor(selected),
                                color: 'white'
                              }}
                            >
                              {chainIds.map(id => (
                                <option key={id} value={id}>
                                  {getChainName(id)}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {!isConnected && (
          <div className="wallet-connection-section">
            <label>Connect Wallet to Send:</label>
            <ConnectWallet />
          </div>
        )}
      </div>
      
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        recipientAddress={paymentModal.recipientAddress}
        recipientName={selectedUser.displayName || undefined}
        recipientHandle={selectedUser.handle || undefined}
        recipientDid={selectedUser.did || undefined}
        recipientAvatar={selectedUser.avatar || undefined}
        chainId={paymentModal.chainId}
      />
    </div>
  );
};

// Main component that provides Wagmi context
export const UserDetailCard: React.FC<UserDetailCardProps> = ({ selectedUser, onClose, triggerPayment }) => {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <UserDetailCardInner selectedUser={selectedUser} onClose={onClose} triggerPayment={triggerPayment} />
      </QueryClientProvider>
    </WagmiProvider>
  );
};
