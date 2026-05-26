import React from 'react';
import { useAccount } from 'wagmi';
import { getBlockExplorerTxUrl } from "../../shared/common.ts";
import { clearTokenBalanceCache } from "../../shared/useTokenBalances.ts";
import { TransactionHash } from './TransactionHash.tsx';

interface TransactionSuccessProps {
  txHash: `0x${string}`;
  chainId: number;
  onDone: () => void;
}

const getTransactionUrl = (txHash: string, chainId: number): string => {
  return getBlockExplorerTxUrl(txHash, chainId);
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
