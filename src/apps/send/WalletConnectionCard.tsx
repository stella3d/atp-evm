import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './UserDetailCard.css';

export const WalletConnectionCard: React.FC = () => {
  const { isConnected } = useAccount();

  if (isConnected) {
    return null;
  }

  return (
    <div className="user-detail-card wallet-connection-card">
      <div className="wallet-connection-section">
        <h2>Connect Wallet to Send</h2>
        <ConnectButton />
      </div>
    </div>
  );
};
