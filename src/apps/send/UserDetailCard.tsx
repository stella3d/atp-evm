import React, { useState, useEffect } from 'react';
import type { EnrichedUser, AddressControlRecord } from "../../shared/common.ts";
import { fetchAddressControlRecords } from "../../shared/fetch.ts";
import './UserDetailCard.css';

interface UserDetailCardProps {
  selectedUser: EnrichedUser;
  onClose?: () => void;
}

export const UserDetailCard: React.FC<UserDetailCardProps> = ({ selectedUser, onClose }) => {
  const [addressRecords, setAddressRecords] = useState<AddressControlRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

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
            {selectedUser.description && (
              <div className="profile-description">{selectedUser.description}</div>
            )}
          </div>
        </div>

        <div className="user-info">
          <label>DID:</label>
          <div className="user-did-display">{selectedUser.did}</div>
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

                return (
                  <div key={record.uri || index} className="address-record">
                    <div className="address-value">{address}</div>
                    {issuedAt && (
                      <div className="address-date">
                        Issued: {new Date(issuedAt).toLocaleDateString()} at {new Date(issuedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="user-actions">
          <button type="button" className="action-button primary">
            Send Payment
          </button>
          {selectedUser.handle && (
            <button 
              type="button" 
              className="action-button secondary"
              onClick={handleViewProfile}
            >
              View Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
