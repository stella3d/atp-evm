import '../App.css'
import './SendApp.css'
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { SearchUsers } from "./send/SearchUsers.tsx";
import { UserDetailCard } from "./send/UserDetailCard.tsx";
import { WalletConnectionCard } from './send/WalletConnectionCard.tsx';
import type { DidString, EnrichedUser } from "../shared/common.ts";
import { TokenBalanceLoader } from '../shared/TokenBalanceProvider.tsx';

function SendApp() {
  const [searchParams] = useSearchParams();
  // OAuth session not needed in this component currently
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [preSelectedUser, setPreSelectedUser] = useState<string | undefined>(undefined);
  const [shouldOpenPayment, setShouldOpenPayment] = useState<boolean>(false);
  const [triggerPayment, setTriggerPayment] = useState<DidString | null>(null);

  // Extract URL parameters on component mount
  useEffect(() => {
    const userParam = searchParams.get('user');
    const payParam = searchParams.get('pay');
    
    if (userParam) {
      setPreSelectedUser(userParam);
      // If pay parameter is present and equals "true", enable payment modal
      if (payParam === 'true') {
        setShouldOpenPayment(true);
      }
    }
  }, [searchParams]);


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
    <>
      <div id="app-header">
        <h1 style={{ fontFamily: 'sans-serif' }}>@Pay</h1>
        <p>Send value to ATProto accounts securely, via Ethereum.</p>
        <p>Looking to <Link to="/" style={{ textDecoration: 'none' }}>link your wallet</Link> instead?</p>
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
    </>
  );
}

export default SendApp;
