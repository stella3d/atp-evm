import React from 'react';
import { useAccount } from 'wagmi';
import { getDoraTransactionUrl } from "../../shared/common.ts";
import { clearTokenBalanceCache } from "../../shared/useTokenBalances.ts";
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
  const { address } = useAccount();

  // clear token balance cache when transaction is successful,
  // so the updated balance is fetched in and shown to the user
  React.useEffect(() => {
    if (address && txHash && chainId) {
      clearTokenBalanceCache(address, chainId);
      console.log('cleared token balance cache after successful transaction');
    }
  }, [address, chainId]);

  return (
    <div className="step-success">
      <div className="success-icon">✅</div>
      <h4>Payment Successful!</h4>
      <p>Your payment has been confirmed and recorded on the blockchain.</p>
      <div className="tx-hash">
        <div style={{ marginBottom: '8px', fontWeight: '500' }}>View Transaction:</div>
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
