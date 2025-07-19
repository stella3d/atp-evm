import React from 'react';
import { useAccount } from 'wagmi';
import './UserDetailCard.css';
import { ConnectWallet } from "../../shared/WalletConnector.tsx";

export const WalletConnectionCard: React.FC = () => {
  const { isConnected } = useAccount();

  if (isConnected) {
    return null;
  }

  return (
    <div className="wallet-connection-standalone">
      <div className="wallet-connection-content">
        <ConnectWallet prompt="Please connect your wallet to send." successText="Wallet connected successfully!" />
      </div>
    </div>
  );
};
