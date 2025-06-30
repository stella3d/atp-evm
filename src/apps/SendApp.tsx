import '../App.css'
import { useEffect, useState } from 'react';

import { oauthClient } from "../shared/oauth.ts";
import { OAuthSession } from "@atproto/oauth-client-browser";
import { SearchUsers } from "./send/SearchUsers.tsx";
import { UserDetailCard } from "./send/UserDetailCard.tsx";
import type { DefinedDidString } from "../shared/common.ts";

function SendApp() {
  const [_oauthSession, setOauthSession] = useState<OAuthSession | null>(null);
  const [selectedUser, setSelectedUser] = useState<DefinedDidString | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const initRes = await oauthClient.init();
      setOauthSession(initRes?.session || null);
    };
    fetchSession();
  }, []);

  const handleUserSelect = (user: DefinedDidString) => {
    setSelectedUser(user);
  };

  const handleCloseCard = () => {
    setSelectedUser(null);
  };

  return (
    <>
      <h1>DID Pay Demo</h1>
      <p>This demo lets you send value to a recipient based on their ATProto DID & linked Ethereum wallet.</p>
      <br/>
      <SearchUsers onUserSelect={handleUserSelect} />
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
