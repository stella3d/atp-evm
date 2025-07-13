import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchUsersWithAddressRecord, enrichUsersProgressively, resolveUserIdentifier } from '../../shared/fetch.ts';
import './SearchUsers.css';
import type { DidString, EnrichedUser } from "../../shared/common.ts";
import { AtprotoUserCard, UserCardVariant } from '../../shared/AtprotoUserCard.tsx';

interface SearchUsersProps {
  onUserSelect?: (user: DidString) => void;
  onUsersUpdate?: (users: EnrichedUser[]) => void;
  preSelectedUser?: string; // Handle or DID to pre-select
  shouldOpenPayment?: boolean; // Whether to open payment modal for first wallet
  onTriggerPayment?: (userDid: DidString) => void; // Callback to trigger payment modal
}

export const SearchUsers: React.FC<SearchUsersProps> = ({ onUserSelect, onUsersUpdate, preSelectedUser, shouldOpenPayment, onTriggerPayment }) => {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUserDids, setAllUserDids] = useState<DidString[]>([]);
  const [enrichedUserDids, setEnrichedUserDids] = useState<Set<DidString>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingEnrichmentRef = useRef<Set<DidString>>(new Set());
  const enrichmentTimeoutRef = useRef<number | null>(null);
  
  const INITIAL_LOAD_COUNT = 6;
  const BATCH_DELAY_MS = 160; // Wait 160ms to collect more users before batching

  // Batched enrichment function for lazy loading
  const enqueueBatchEnrichment = useCallback((userDid: DidString) => {
    if (enrichedUserDids.has(userDid)) return;
    
    pendingEnrichmentRef.current.add(userDid);
    
    if (enrichmentTimeoutRef.current) {
      clearTimeout(enrichmentTimeoutRef.current);
    }
    
    // Set new timeout to process batch
    enrichmentTimeoutRef.current = setTimeout(async () => {
      const batch = Array.from(pendingEnrichmentRef.current);
      if (batch.length === 0) return;
      
      // Clear the pending set
      pendingEnrichmentRef.current.clear();
      
      // Mark these as being enriched
      setEnrichedUserDids(prev => {
        const newSet = new Set(prev);
        batch.forEach(did => newSet.add(did));
        return newSet;
      });
      
      //console.log(`Lazy loading batch of ${batch.length} users:`, batch);
      
      try {
        await enrichUsersProgressively(batch, (updatedUsers: EnrichedUser[]) => {
          setUsers(prevUsers => {
            const userMap = new Map(prevUsers.map(u => [u.did, u]));
            // Update with enriched data
            updatedUsers.forEach(enrichedUser => {
              userMap.set(enrichedUser.did, enrichedUser);
            });
            
            // Filter out users who failed handle verification
            const newUsers = Array.from(userMap.values()).filter(user => 
              user.handleVerified === true || user.handleVerified === undefined
            );
            
            if (onUsersUpdate) {
              onUsersUpdate(newUsers);
            }
            return newUsers;
          });
        });
      } catch (err) {
        console.warn(`Failed to enrich batch:`, err);
      }
    }, BATCH_DELAY_MS);
  }, [enrichedUserDids, onUsersUpdate]);

  // Intersection Observer for lazy loading
  const observeUserCard = useCallback((node: HTMLElement | null, userDid: DidString) => {
    if (!node) return;
    
    if (observerRef.current) {
      observerRef.current.observe(node);
    } else {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const didAttr = entry.target.getAttribute('data-user-did');
              if (didAttr && !enrichedUserDids.has(didAttr as DidString)) {
                // Add to batch instead of enriching immediately
                enqueueBatchEnrichment(didAttr as DidString);
              }
            }
          });
        },
        { rootMargin: '150px' } // More eager - start loading when within 150px
      );
      observerRef.current.observe(node);
    }
    
    // Set the DID as a data attribute for the observer
    node.setAttribute('data-user-did', userDid);
  }, [enrichedUserDids, enqueueBatchEnrichment]);

  // Clean up observer and timeouts on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (enrichmentTimeoutRef.current) {
        clearTimeout(enrichmentTimeoutRef.current);
      }
    };
  }, []);

  // Always load the initial user list first
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, load basic user list quickly
        const basicUsers = await fetchUsersWithAddressRecord();
        setAllUserDids(basicUsers);
        const basicEnrichedUsers: EnrichedUser[] = basicUsers.map((did: DidString) => ({ did }));
        setUsers(basicEnrichedUsers);
        if (onUsersUpdate) {
          onUsersUpdate(basicEnrichedUsers);
        }
        setLoading(false);

        // If no pre-selected user, start lazy enrichment
        if (!preSelectedUser) {
          // Only enrich the first 6 users initially
          const initialBatch = basicUsers.slice(0, INITIAL_LOAD_COUNT);
          if (initialBatch.length > 0) {
            setEnriching(true);
            // Mark these as being enriched
            setEnrichedUserDids(new Set(initialBatch));
            
      await enrichUsersProgressively(initialBatch, (updatedUsers: EnrichedUser[]) => {
        setUsers(prevUsers => {
          const userMap = new Map(prevUsers.map(u => [u.did, u]));
          // Update with enriched data
          updatedUsers.forEach(enrichedUser => {
            userMap.set(enrichedUser.did, enrichedUser);
          });
          
          // Filter out users who failed handle verification
          const newUsers = Array.from(userMap.values()).filter(user => 
            user.handleVerified === true || user.handleVerified === undefined
          );
          
          if (onUsersUpdate) {
            onUsersUpdate(newUsers);
          }
          return newUsers;
        });
      });
            setEnriching(false);
          }
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
          setError(`${preSelectedUser} has no linked Ethereum addresses.`);
          return;
        }
        
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
        setEnriching(true);
        try {
          await enrichUsersProgressively([resolvedDid], (updatedUsers: EnrichedUser[]) => {
            // For pre-selected users, we show them even if handle verification fails
            // since the user specifically requested this user
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
    // First filter to only include users with verified handles
    // If a user hasn't been enriched yet (handleVerified is undefined), 
    // we still show them temporarily until enrichment completes
    const verifiedUsers = users.filter(user => 
      user.handleVerified === true || user.handleVerified === undefined
    );
    
    if (!searchTerm.trim()) {
      return verifiedUsers;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return verifiedUsers.filter(user => 
      // Search in handle (if available), DID, and display name (if available)
      user.handle?.toLowerCase().includes(searchLower) ||
      user.did.toLowerCase().includes(searchLower) ||
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
              Only users who have linked their Ethereum wallets to their ATProto accounts and have verified handles can receive payments.
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
              ref={(node) => {
                // Only set up lazy loading if this user hasn't been enriched yet
                if (node && !enrichedUserDids.has(user.did)) {
                  observeUserCard(node, user.did);
                }
              }}
            >
              <AtprotoUserCard
                name={user.displayName}
                handle={user.handle}
                did={user.did}
                avatar={user.avatar}
                clickable
                onClick={() => handleUserClick(user)}
                variant={UserCardVariant.PAYMENT}
                showDid
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};




