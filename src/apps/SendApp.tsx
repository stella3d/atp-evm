import '../App.css'
import { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { oauthClient } from "../shared/oauth.ts";
import { OAuthSession } from "@atproto/oauth-client-browser";
import { SearchUsers } from "./send/SearchUsers.tsx";
import { UserDetailCard } from "./send/UserDetailCard.tsx";
import { WalletConnectionCard } from './send/WalletConnectionCard.tsx';
import type { DefinedDidString, EnrichedUser } from "../shared/common.ts";
import { config } from '../shared/WalletConnector.tsx';

const queryClient = new QueryClient();

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
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <h1>ATPay</h1>
        <p>This demo lets you send value to a recipient based on their ATProto DID & linked Ethereum wallet.</p>
        <div className="app-container">
          <SearchUsers 
            onUserSelect={handleUserSelect} 
            onUsersUpdate={handleUsersUpdate} 
          />
          <WalletConnectionCard />
          {selectedUser && (
            <UserDetailCard 
              selectedUser={selectedUser} 
              onClose={handleCloseCard}
            />
          )}
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default SendApp;
