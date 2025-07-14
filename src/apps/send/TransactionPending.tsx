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
      <p>Your payment is being processed on the blockchain. This usually takes a few seconds.</p>
      {txHash && (
        <div className="tx-hash">
          <div style={{ marginBottom: '8px', fontWeight: '500' }}>Transaction Hash:</div>
          <TransactionHash txHash={txHash} />
        </div>
      )}
    </div>
  );
};
