import React from 'react';
import { ChainIndicator } from '../../shared/ChainIndicator.tsx';

export enum ErrorType {
  USER_REJECTED,
  WRONG_CHAIN,
  INSUFFICIENT_FUNDS,
  OTHER
}

export type ErrorState = {
  type: ErrorType;
  message: string;
}

interface TransactionErrorProps {
  error: ErrorState | null;
  chainId: number;
  onRetry: () => void;
  onCancel: () => void;
}

export const TransactionError: React.FC<TransactionErrorProps> = ({
  error,
  chainId,
  onRetry,
  onCancel
}) => {
  if (error === null || error === undefined)
    return;

  // Helper function to render a network name with chain indicator styling
  const renderNetworkWithIndicator = (chainId: number) => {
    return (
      <ChainIndicator chainId={chainId} variant="payment-modal" />
    );
  };

  // Helper function to extract current chain ID from error message
  const extractCurrentChainIdFromError = (error: ErrorState): number | null => {
    // Match against "The current chain of the wallet (id: 8453) does not match the target chain for the transaction (id: 1"
    let match = error.message.match(/The current chain of the wallet \(id: (\d+)\)/i);
    if (match) {
      return parseInt(match[1]);
    }
    
    // match against like "Your wallet is connected to Base (Chain 8453)"
    match = error.message.match(/Your wallet is connected to [^(]+ \(Chain (\d+)\)/i);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  };

  // Helper function to render the wrong chain error message with styled chain indicators
  const renderWrongChainError = (error: ErrorState) => {
    console.warn(error);
    // Try to extract chain IDs from the error message to render with styling
    const currentChainId = extractCurrentChainIdFromError(error);
    if (currentChainId !== null) {
      // We found the current chain ID in the error message
      return (
        <>
          Your wallet is connected to {renderNetworkWithIndicator(currentChainId)} (Chain {currentChainId}), 
          but this transaction requires {renderNetworkWithIndicator(chainId)} (Chain {chainId}).
        </>
      );
    } 

    // Final fallback - just show the expected network with styling
    return (
      <>
        Your wallet is connected to the wrong network. 
        Please switch to {renderNetworkWithIndicator(chainId)} to complete this transaction.
      </>
    );
  };

  return (
    <div className="step-error">
      <div className="error-icon">
        {error.type === ErrorType.USER_REJECTED ? '🚫' : 
         error.type === ErrorType.WRONG_CHAIN ? '⛓️' : 
         error.type === ErrorType.INSUFFICIENT_FUNDS ? '💰' : '❌'}
      </div>
      <h4>
        {error.type === ErrorType.USER_REJECTED ? 'Transaction Cancelled' :
         error.type === ErrorType.WRONG_CHAIN ? 'Wrong Network' :
         error.type === ErrorType.INSUFFICIENT_FUNDS ? 'Insufficient Funds' :
         'Payment Failed'}
      </h4>
      {error.type === ErrorType.OTHER ? (
        <p>{error.message}</p>
      ) : (
        <p>
          {error.type === ErrorType.USER_REJECTED ? 'You cancelled the transaction in your wallet. No worries - you can try again when ready.' :
           error.type === ErrorType.WRONG_CHAIN ? renderWrongChainError(error || '') :
           error.type === ErrorType.INSUFFICIENT_FUNDS ? 'You don\'t have enough funds to complete this transaction. Please check your balance.' :
           error.message}
        </p>
      )}
      {error.type === ErrorType.WRONG_CHAIN && (
        <div className="chain-help">
          <p>To complete this transaction, please:</p>
          <ol>
            <li>Open your wallet</li>
            <li>Switch to {renderNetworkWithIndicator(chainId)}</li>
            <li>Try the payment again</li>
          </ol>
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="back-button" onClick={onRetry}>
          {error.type === ErrorType.USER_REJECTED ? 'Try Again' : 
           error.type === ErrorType.WRONG_CHAIN ? 'Switch Network & Try Again' :
           'Try Again'}
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
