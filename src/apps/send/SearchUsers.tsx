import React, { useState, useEffect, useMemo } from 'react';
import { fetchUsersWithAddressRecord, enrichUsersProgressively, resolveUserIdentifier } from '../../shared/fetch.ts';
import './SearchUsers.css';
import type { DefinedDidString, EnrichedUser } from "../../shared/common.ts";
import { AtprotoUserCard } from '../../shared/AtprotoUserCard.tsx';

interface SearchUsersProps {
  onUserSelect?: (user: DefinedDidString) => void;
  onUsersUpdate?: (users: EnrichedUser[]) => void;
  preSelectedUser?: string; // Handle or DID to pre-select
  shouldOpenPayment?: boolean; // Whether to open payment modal for first wallet
  onTriggerPayment?: (userDid: DefinedDidString) => void; // Callback to trigger payment modal
}

export const SearchUsers: React.FC<SearchUsersProps> = ({ onUserSelect, onUsersUpdate, preSelectedUser, shouldOpenPayment, onTriggerPayment }) => {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUserDids, setAllUserDids] = useState<DefinedDidString[]>([]);

  // Always load the initial user list first
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, load basic user list quickly
        const basicUsers = await fetchUsersWithAddressRecord();
        setAllUserDids(basicUsers);
        const basicEnrichedUsers: EnrichedUser[] = basicUsers.map((did: DefinedDidString) => ({ did }));
        setUsers(basicEnrichedUsers);
        if (onUsersUpdate) {
          onUsersUpdate(basicEnrichedUsers);
        }
        setLoading(false);

        // If no pre-selected user, start progressive enrichment for all users
        if (!preSelectedUser) {
          setEnriching(true);
          await enrichUsersProgressively(basicUsers, (updatedUsers: EnrichedUser[]) => {
            setUsers(updatedUsers);
            if (onUsersUpdate) {
              onUsersUpdate(updatedUsers);
            }
          });
          setEnriching(false);
        }
      } catch (err) {
        setError(`Failed to fetch users: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error fetching users:', err);
        setLoading(false);
        setEnriching(false);
      }
    };

    loadUsers();
  }, []); // Only run once on mount

  // Handle pre-selected user resolution after we have the user list
  useEffect(() => {
    const resolvePreSelectedUser = async () => {
      if (!preSelectedUser || allUserDids.length === 0) return;
      
      console.log(`Resolving pre-selected user: ${preSelectedUser}`);
      const resolvedDid = await resolveUserIdentifier(preSelectedUser);
      
      if (resolvedDid) {
        console.log(`Resolved ${preSelectedUser} to DID: ${resolvedDid}`);
        
        // Check if this user is in our list of users with address records
        if (!allUserDids.includes(resolvedDid)) {
          setError(`User "${preSelectedUser}" was found but has no linked Ethereum addresses in our system.`);
          return;
        }
        
        // Create a basic enriched user object
        const basicUser: EnrichedUser = { did: resolvedDid };
        setUsers([basicUser]);
        if (onUsersUpdate) {
          onUsersUpdate([basicUser]);
        }
        
        // Auto-select the resolved user
        if (onUserSelect) {
          onUserSelect(resolvedDid);
        }
        
        // Set search term to show what was resolved
        setSearchTerm(preSelectedUser);
        
        // Start enriching this specific user
        setEnriching(true);
        try {
          await enrichUsersProgressively([resolvedDid], (updatedUsers: EnrichedUser[]) => {
            setUsers(updatedUsers);
            if (onUsersUpdate) {
              onUsersUpdate(updatedUsers);
            }
            
            // Trigger payment modal if requested and this is the final enrichment
            if (shouldOpenPayment && onTriggerPayment && updatedUsers.length > 0) {
              // Small delay to ensure the UserDetailCard is rendered and ready
              setTimeout(() => {
                onTriggerPayment(resolvedDid);
              }, 500);
            }
          });
        } catch (err) {
          console.warn('Failed to enrich pre-selected user:', err);
        } finally {
          setEnriching(false);
        }
      } else {
        console.warn(`Failed to resolve pre-selected user: ${preSelectedUser}`);
        setError(`Failed to resolve user "${preSelectedUser}". Please check the handle or DID.`);
      }
    };
    
    resolvePreSelectedUser();
  }, [preSelectedUser, allUserDids]); // Run when preSelectedUser changes or when we get the user list

  // simple case-insensitive substring match - no attempt to rank results yet
  const filteredUsers = useMemo(() => {
    // First filter to only show users with handles (verification is already done in fetch.ts)
    const usersWithHandles = users.filter(user => user.handle);
    
    if (!searchTerm.trim()) {
      return usersWithHandles;
    }
    const searchLower = searchTerm.toLowerCase();
    return usersWithHandles.filter(user => 
	  // handles & DIDs are already lowercase
      user.handle?.includes(searchLower) ||
	  user.did.includes(searchLower) ||
      user.displayName?.toLowerCase().includes(searchLower)
    );
  }, [users, searchTerm]);

  // Auto-select user when there's exactly one match
  useEffect(() => {
    if (filteredUsers.length === 1 && searchTerm.trim() && onUserSelect) {
      onUserSelect(filteredUsers[0].did);
    }
  }, [filteredUsers, searchTerm, onUserSelect]);

  const handleUserClick = (user: EnrichedUser) => {
    if (onUserSelect) {
      onUserSelect(user.did);
    }
  };

  if (loading) {
    return (
      <div className="search-users">
        <div className="loading">
          {preSelectedUser ? `Resolving user: ${preSelectedUser}...` : 'Loading users...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-users">
        <div className="error">{error}</div>
        {preSelectedUser && (
          <div style={{ marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={() => globalThis.location.href = globalThis.location.pathname}
              className="retry-button"
              style={{ marginRight: '10px', padding: '8px 16px' }}
            >
              Browse All Users Instead
            </button>
            <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
              Only users who have linked their Ethereum wallets to their ATProto accounts can receive payments.
            </small>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="search-users">
      <div className="search-box">
        <input
          type="text"
          placeholder={preSelectedUser ? 
            `Showing user: ${preSelectedUser}` : 
            "Search users by handle, name, or DID..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          readOnly={!!preSelectedUser}
        />
        {preSelectedUser && (
          <button 
            type="button" 
            onClick={() => globalThis.location.href = globalThis.location.pathname}
            className="clear-selection-button"
            style={{ marginLeft: '10px', padding: '8px 16px' }}
          >
            Browse All Users
          </button>
        )}
      </div>
      
      <div className="users-count">
        {preSelectedUser ? (
          <>
            Showing user from URL parameter: <strong>{preSelectedUser}</strong>
            {enriching && (
              <span className="enriching-indicator">
                {" • "}Loading profile...
              </span>
            )}
          </>
        ) : (
          <>
            {filteredUsers.length} matching user{filteredUsers.length !== 1 ? 's' : ''} with linked wallets found
            {enriching && (
              <span className="enriching-indicator">
                {" • "}Enriching profiles...
              </span>
            )}
          </>
        )}
      </div>

      <div className="users-list" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {filteredUsers.length === 0 ? (
          <div className="no-results">
            {searchTerm ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.did}
              className="user-card-wrapper"
            >
              <AtprotoUserCard
                name={user.displayName}
                handle={user.handle}
                did={user.did}
                avatar={user.avatar}
                clickable
                onClick={() => handleUserClick(user)}
                variant="payment"
                showDid
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};




