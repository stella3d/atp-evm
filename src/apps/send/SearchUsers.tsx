import React, { useState, useEffect, useMemo } from 'react';
import { OAuthSession } from "@atproto/oauth-client-browser";
import { fetchUsersWithAddressRecord } from '../../shared/fetch.ts';
import './SearchUsers.css';
import type { DefinedDidString } from "../../shared/common.ts";

interface SearchUsersProps {
  onUserSelect?: (user: DefinedDidString) => void;
}

export const SearchUsers: React.FC<SearchUsersProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<DefinedDidString[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedUsers = await fetchUsersWithAddressRecord();
		console.log('Fetched users:', fetchedUsers);
        setUsers(fetchedUsers);
      } catch (err) {
        setError(`Failed to fetch users: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users;
    }
    return users.filter(user => 
      user.includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleUserClick = (user: DefinedDidString) => {
    if (onUserSelect) {
      onUserSelect(user);
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
          placeholder="Search users by DID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="users-count">
        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <div className="no-results">
            {searchTerm ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div 
              key={user}
              className="user-item"
              onClick={() => handleUserClick(user)}
            >
              <div className="user-did">{user}</div>
              {/* TODO: Add avatar and handle display here */}
            </div>
          ))
        )}
      </div>
    </div>
  );
};




