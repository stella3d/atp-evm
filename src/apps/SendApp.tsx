import '../App.css'
import { useEffect, useState } from 'react';

import { oauthClient } from "../shared/oauth.ts";
import { OAuthSession } from "@atproto/oauth-client-browser";
import { SearchUsers } from "./send/SearchUsers.tsx";
import { UserDetailCard } from "./send/UserDetailCard.tsx";
import type { DefinedDidString, EnrichedUser } from "../shared/common.ts";

function SendApp() {
  const [_oauthSession, setOauthSession] = useState<OAuthSession | null>(null);
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      const initRes = await oauthClient.init();
      setOauthSession(initRes?.session || null);
    };
    fetchSession();
  }, []);

  const handleUserSelect = (userDid: DefinedDidString) => {
    const enrichedUser = enrichedUsers.find(user => user.did === userDid);
    setSelectedUser(enrichedUser || { did: userDid });
  };

  const handleUsersUpdate = (users: EnrichedUser[]) => {
    setEnrichedUsers(users);
    // Update selected user if it gets enriched
    if (selectedUser) {
      const updatedSelectedUser = users.find(user => user.did === selectedUser.did);
      if (updatedSelectedUser && (updatedSelectedUser.handle || updatedSelectedUser.displayName || updatedSelectedUser.avatar)) {
        setSelectedUser(updatedSelectedUser);
      }
    }
  };

  const handleCloseCard = () => {
    setSelectedUser(null);
  };

  return (
    <>
      <h1>DID Pay Demo</h1>
      <p>This demo lets you send value to a recipient based on their ATProto DID & linked Ethereum wallet.</p>
      <SearchUsers 
        onUserSelect={handleUserSelect} 
        onUsersUpdate={handleUsersUpdate} 
      />
      {selectedUser && (
        <UserDetailCard 
          selectedUser={selectedUser} 
          onClose={handleCloseCard}
        />
      )}
    </>
  );
}

export default SendApp;
