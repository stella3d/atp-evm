import React from 'react';

interface TransactionSuccessProps {
  txHash: `0x${string}`;
  chainId: number;
  onDone: () => void;
}

// Helper function to get transaction URL
const getDoraTransactionUrl = (txHash: string, chainId: number): string => {
  const baseUrls: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    42161: 'https://arbiscan.io/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    100: 'https://gnosisscan.io/tx/',
  };
  
  const baseUrl = baseUrls[chainId] || 'https://etherscan.io/tx/';
  return `${baseUrl}${txHash}`;
};

export const TransactionSuccess: React.FC<TransactionSuccessProps> = ({
  txHash,
  chainId,
  onDone
}) => {
  return (
    <div className="step-success">
      <div className="success-icon">✅</div>
      <h4>Payment Successful!</h4>
      <p>Your payment has been confirmed on the blockchain.</p>
      <div className="tx-hash">
        <div>View Transaction: </div>
        <a 
          href={getDoraTransactionUrl(txHash, chainId)}
          target="_blank"
          rel="noopener noreferrer"
          className="tx-hash-link"
        >
          <code>{txHash}</code>
        </a>
      </div>
      <button type="button" className="done-button" onClick={onDone}>
        Done
      </button>
    </div>
  );
};
