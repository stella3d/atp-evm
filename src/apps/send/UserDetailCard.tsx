import React from 'react';
import type { EnrichedUser } from "../../shared/common.ts";
import './UserDetailCard.css';

interface UserDetailCardProps {
  selectedUser: EnrichedUser;
  onClose?: () => void;
}

export const UserDetailCard: React.FC<UserDetailCardProps> = ({ selectedUser, onClose }) => {
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
