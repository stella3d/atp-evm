import React from 'react';
import { ChainIndicator } from '../../shared/ChainIndicator.tsx';

interface ChainMismatchWarningProps {
  isWrongChain: boolean;
  currentWalletChainId: number | undefined;
  requiredChainId: number;
}

export const ChainMismatchWarning: React.FC<ChainMismatchWarningProps> = ({
  isWrongChain,
  currentWalletChainId,
  requiredChainId
}) => {
  if (!isWrongChain) {
    return null;
  }

  return (
    <div className="chain-mismatch-warning">
      <div className="warning-content">
        <div className="warning-text">
          <div className="warning-title">⚠️ Network Switch Required</div>
          <div className="warning-message">
            Your wallet is currently connected on <ChainIndicator chainId={currentWalletChainId || 1} variant="payment-modal" />, 
            but this payment requires <ChainIndicator chainId={requiredChainId} variant="payment-modal" />.
          </div>
        </div>
      </div>
    </div>
  );
};
