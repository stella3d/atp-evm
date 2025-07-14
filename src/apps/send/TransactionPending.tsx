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
      <h4>Processing Payment</h4>
      <p>Your transaction has been submitted to the blockchain network and is being confirmed by miners.</p>
      {txHash && (
        <div className="tx-hash">
          <div style={{ 
            marginBottom: '12px', 
            fontWeight: '600',
            fontSize: '0.9rem',
            color: 'inherit',
            opacity: 0.8
          }}>
            Transaction Hash
          </div>
          <TransactionHash txHash={txHash} />
        </div>
      )}
    </div>
  );
};
