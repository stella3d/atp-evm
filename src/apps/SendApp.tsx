import '../App.css'
import './SendApp.css'
import { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';

import { oauthClient } from "../shared/oauth.ts";
import { OAuthSession } from "@atproto/oauth-client-browser";
import { SearchUsers } from "./send/SearchUsers.tsx";
import { UserDetailCard } from "./send/UserDetailCard.tsx";
import { WalletConnectionCard } from './send/WalletConnectionCard.tsx';
import type { DidString, EnrichedUser } from "../shared/common.ts";
import { config } from '../shared/WalletConnector.tsx';
import { TokenBalancesProvider, TokenBalanceLoader } from '../shared/TokenBalanceProvider.tsx';

const queryClient = new QueryClient();

function SendApp() {
  const [_oauthSession, setOauthSession] = useState<OAuthSession | null>(null);
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [preSelectedUser, setPreSelectedUser] = useState<string | undefined>(undefined);
  const [shouldOpenPayment, setShouldOpenPayment] = useState<boolean>(false);
  const [triggerPayment, setTriggerPayment] = useState<DidString | null>(null);

  // Extract URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const userParam = urlParams.get('user');
    const payParam = urlParams.get('pay');
    
    if (userParam) {
      setPreSelectedUser(userParam);
      // If pay parameter is present and equals "true", enable payment modal
      if (payParam === 'true') {
        setShouldOpenPayment(true);
      }
    }
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const initRes = await oauthClient.init();
      setOauthSession(initRes?.session || null);
    };
    fetchSession();
  }, []);

  const handleUserSelect = (userDid: DidString) => {
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

  const handleTriggerPayment = (userDid: DidString) => {
    setTriggerPayment(userDid);
    // Reset after a short delay to prevent modal from reopening
    setTimeout(() => setTriggerPayment(null), 1000);
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <TokenBalancesProvider>
            <div id="app-header">
              <h1 style={{ fontFamily: 'sans-serif' }}>@Pay</h1>
              <p>Send value to ATProto accounts in a secure, p2p manner.</p>
              <p style={{ color: 'orange', fontWeight: 'bold', fontSize: '16px' }}>THIS IS PRE-RELEASE SOFTWARE</p>
            </div>
            <div className="app-container">
              <SearchUsers 
                onUserSelect={handleUserSelect} 
                onUsersUpdate={handleUsersUpdate}
                preSelectedUser={preSelectedUser}
                shouldOpenPayment={shouldOpenPayment}
                onTriggerPayment={handleTriggerPayment}
              />
              <WalletConnectionCard />
              {selectedUser && (
                <UserDetailCard 
                  selectedUser={selectedUser} 
                  onClose={handleCloseCard}
                  triggerPayment={triggerPayment}
                />
              )}
              <TokenBalanceLoader />
            </div>
          </TokenBalancesProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default SendApp;
