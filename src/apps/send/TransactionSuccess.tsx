import React from 'react';
import { getDoraTransactionUrl } from "../../shared/common.ts";
import { TransactionHash } from './TransactionHash.tsx';

interface TransactionSuccessProps {
  txHash: `0x${string}`;
  chainId: number;
  onDone: () => void;
}

const getTransactionUrl = (txHash: string, chainId: number): string => {
  switch (chainId) {
    // Dora currently supports these 3 chains out of the 5
    case 1: // Ethereum Mainnet
    case 8453: // Base
    case 42161: // Arbitrum
      return getDoraTransactionUrl(txHash, chainId);
    case 10: // Optimism
      return `https://optimistic.etherscan.io/tx/${txHash}`;
    case 100: // Gnosis
      return `https://gnosisscan.io/tx/${txHash}`;
    default:
      return "";
  }
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
        <TransactionHash
          txHash={txHash}
          isClickable
          href={getTransactionUrl(txHash, chainId)}
          className="tx-hash-link"
        />
      </div>
      <button type="button" className="done-button" onClick={onDone}>
        Done
      </button>
    </div>
  );
};
