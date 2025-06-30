import React, { useState, useEffect, useMemo } from 'react';
import { fetchUsersWithAddressRecord, enrichUsersProgressively } from '../../shared/fetch.ts';
import './SearchUsers.css';
import type { DefinedDidString, EnrichedUser } from "../../shared/common.ts";

interface SearchUsersProps {
  onUserSelect?: (user: DefinedDidString) => void;
  onUsersUpdate?: (users: EnrichedUser[]) => void;
}

export const SearchUsers: React.FC<SearchUsersProps> = ({ onUserSelect, onUsersUpdate }) => {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, load basic user list quickly
        const basicUsers = await fetchUsersWithAddressRecord();
        const basicEnrichedUsers: EnrichedUser[] = basicUsers.map((did: DefinedDidString) => ({ did }));
        setUsers(basicEnrichedUsers);
        onUsersUpdate?.(basicEnrichedUsers);
        setLoading(false);

        // Then start progressive enrichment in background
        setEnriching(true);
        await enrichUsersProgressively(basicUsers, (updatedUsers: EnrichedUser[]) => {
          setUsers(updatedUsers);
          onUsersUpdate?.(updatedUsers);
        });
        setEnriching(false);
      } catch (err) {
        setError(`Failed to fetch users: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error fetching users:', err);
        setLoading(false);
        setEnriching(false);
      }
    };

    loadUsers();
  }, []);

  // simple case-insensitive substring match - no attempt to rank results yet
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users;
    }
    const searchLower = searchTerm.toLowerCase();
    return users.filter(user => 
	  // handles & DIDs are already lowercase
      user.handle?.includes(searchLower) ||
	  user.did.includes(searchLower) ||
      user.displayName?.toLowerCase().includes(searchLower)
    );
  }, [users, searchTerm]);

  const handleUserClick = (user: EnrichedUser) => {
    if (onUserSelect) {
      onUserSelect(user.did);
    }
  };

  if (loading) {
    return (
      <div className="search-users">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-users">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="search-users">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search users by handle, name, or DID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="users-count">
        at least {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} with linked wallets found
        {enriching && (
          <span className="enriching-indicator">
            {" • "}Enriching profiles...
          </span>
        )}
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <div className="no-results">
            {searchTerm ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div 
              key={user.did}
              className="user-item"
              onClick={() => handleUserClick(user)}
            >
              <div className="user-avatar">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={`${user.handle || user.did} avatar`}
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {(user.handle || user.displayName || user.did).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="user-info">
                <div className="user-handle">
                  {user.handle ? `@${user.handle}` : 'No handle'}
                </div>
                {user.displayName && (
                  <div className="user-display-name">{user.displayName}</div>
                )}
                <div className="user-did">{user.did}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};




