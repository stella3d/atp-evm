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
    <div className="wallet-connection-standalone">
      <div className="wallet-connection-content">
        <p>Connect your wallet to send payments to ATProto accounts</p>
        <div className="connect-button-container">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
};
