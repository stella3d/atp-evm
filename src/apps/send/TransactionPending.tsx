import React from 'react';
import { TransactionHash } from './TransactionHash.tsx';

interface TransactionPendingProps {
  txHash: `0x${string}` | null;
}

export const TransactionPending: React.FC<TransactionPendingProps> = ({
  txHash
}) => {
  return (
    <div className="step-sending">
      <div className="loading-spinner">⏳</div>
      <h4>Transaction Sent</h4>
      <p>Waiting for confirmation...</p>
      {txHash && (
        <div className="tx-hash">
          <div>Transaction Hash:</div>
          <TransactionHash txHash={txHash} />
        </div>
      )}
    </div>
  );
};
