import React, { useState, useEffect } from 'react';
import type { EnrichedUser, AddressControlRecord } from "../../shared/common.ts";
import { fetchAddressControlRecords } from "../../shared/fetch.ts";
import { PaymentModal } from "../../shared/PaymentModal.tsx";
import { config } from '../../shared/WalletConnector.tsx';
import './UserDetailCard.css';
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface UserDetailCardProps {
  selectedUser: EnrichedUser;
  onClose?: () => void;
}

export const UserDetailCard: React.FC<UserDetailCardProps> = ({ selectedUser, onClose }) => {
  const [addressRecords, setAddressRecords] = useState<AddressControlRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    recipientAddress: `0x${string}`;
    chainId: number;
  }>({
    isOpen: false,
    recipientAddress: '0x0' as `0x${string}`,
    chainId: 1,
  });

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
        console.log('Raw address records:', records);
        setAddressRecords(records);
      } catch (error) {
        setRecordsError(`Failed to load address records: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Error loading address records:', error);
      } finally {
        setLoadingRecords(false);
      }
    };

    loadAddressRecords();
  }, [selectedUser.did, selectedUser.pds]);
  const handleViewProfile = () => {
    if (selectedUser.handle) {
      globalThis.open(`https://bsky.app/profile/${selectedUser.handle}`, '_blank');
    }
  };

  const queryClient = new QueryClient();

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
          <div className="profile-avatar">
            {selectedUser.avatar ? (
              <img 
                src={selectedUser.avatar} 
                alt={`${selectedUser.handle || selectedUser.did} avatar`}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                {(selectedUser.handle || selectedUser.displayName || selectedUser.did).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-handle">
              {selectedUser.handle ? `@${selectedUser.handle}` : 'No handle'}
            </div>
            {selectedUser.displayName && (
              <div className="profile-display-name">{selectedUser.displayName}</div>
            )}
            <div className="user-did">{selectedUser.did}</div>
		    <br/>
            {selectedUser.description && (
              <div className="profile-description">{selectedUser.description}</div>
            )}
          </div>
        </div>

        <div className="address-records">
          <label>Linked Ethereum Addresses:</label>
          {loadingRecords ? (
            <div className="loading-records">Loading addresses...</div>
          ) : recordsError ? (
            <div className="records-error">{recordsError}</div>
          ) : addressRecords.length === 0 ? (
            <div className="no-records">No Ethereum addresses found</div>
          ) : (
            <div className="records-list">
              {addressRecords.map((record, index) => {
                // Extract address from the SIWE structure
                const address = record.value?.siwe?.address || 'Unknown address';
                const issuedAt = record.value?.siwe?.issuedAt;
                const chainId = record.value?.siwe?.chainId;

                return (
                  <div key={record.uri || index} className="address-record">
                    <div className="address-info">
                      <div className="address-header">
                        <div className="address-value">{address}</div>
                      </div>
                      {issuedAt && (
                        <div className="address-date">
                          Issued: {new Date(issuedAt).toLocaleDateString()} at {new Date(issuedAt).toLocaleTimeString()}
                          {chainId && (
                            <span className="chain-info">
                              • Chain {chainId}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* fake safety checklist for stellz & Edmund, ONLY FOR DEMO */}
                      {(selectedUser.did === 'did:plc:7mnpet2pvof2llhpcwattscf' || selectedUser.did === 'did:plc:pyzlzqt6b2nyrha7smfry6rv') && (
                        <div className="safety-checklist-inline">
                          <div className="checklist-item verified">
                            <span className="check-icon">✅</span>
                            <span className="check-text">Wallet-Signed Message Checked</span>
                          </div>
                          <div className="checklist-item verified">
                            <span className="check-icon">✅</span>
                            <span className="check-text">Merkle Proof Checked</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      type="button" 
                      className="send-payment-button"
                      onClick={() => {
                        setPaymentModal({
                          isOpen: true,
                          recipientAddress: address as `0x${string}`,
                          chainId: chainId || 1,
                        });
                      }}
                    >
                      Send Payment
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {selectedUser.handle && (
          <div className="user-actions">
            <button 
              type="button" 
              className="action-button secondary"
              onClick={handleViewProfile}
            >
              View Profile
            </button>
          </div>
        )}
      </div>
      
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <PaymentModal
            isOpen={paymentModal.isOpen}
            onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
            recipientAddress={paymentModal.recipientAddress}
            recipientName={selectedUser.displayName || selectedUser.handle || undefined}
            chainId={paymentModal.chainId}
          />
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
};
