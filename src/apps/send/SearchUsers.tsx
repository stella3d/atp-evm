import React, { useState, useEffect, useMemo } from 'react';
import { fetchUsersWithAddressRecord, enrichUsersProgressively } from '../../shared/fetch.ts';
import './SearchUsers.css';
import type { DefinedDidString, EnrichedUser } from "../../shared/common.ts";
import { AtprotoUserCard } from '../../shared/AtprotoUserCard';

// Utility functions for user identity resolution
function isDidString(input: string): input is DefinedDidString {
  return input.startsWith('did:plc:') || input.startsWith('did:web:');
}

function isHandle(input: string): boolean {
  // Bluesky handles are domain-like (e.g., alice.bsky.social, example.com)
  // They should contain at least one dot and not start with did:
  return !input.startsWith('did:') && input.includes('.') && input.length > 3;
}

// Resolve a user identifier (handle or DID) to a DID
async function resolveUserIdentifier(identifier: string): Promise<DefinedDidString | null> {
  const trimmed = identifier.trim();
  
  // If it's already a DID, return it
  if (isDidString(trimmed)) {
    return trimmed;
  }
  
  // If it looks like a handle, resolve it to a DID
  if (isHandle(trimmed)) {
    try {
      const response = await fetch(
        `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(trimmed)}`
      );
      
      if (!response.ok) {
        console.warn(`Failed to resolve handle ${trimmed}: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      if (data.did && isDidString(data.did)) {
        return data.did;
      }
    } catch (error) {
      console.warn(`Error resolving handle ${trimmed}:`, error);
    }
  }
  
  return null;
}

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
                clickable={true}
                onClick={() => handleUserClick(user)}
                variant="payment"
                showDid={true}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};




