import React from 'react';
import type { DefinedDidString } from "../../shared/common.ts";
import './UserDetailCard.css';

interface UserDetailCardProps {
  selectedUser: DefinedDidString;
  onClose?: () => void;
}

export const UserDetailCard: React.FC<UserDetailCardProps> = ({ selectedUser, onClose }) => {
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
        <div className="user-info">
          <label>DID:</label>
          <div className="user-did-display">{selectedUser}</div>
        </div>
        
        <div className="user-actions">
          <button type="button" className="action-button primary">
            Send Payment
          </button>
          <button type="button" className="action-button secondary">
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
};
