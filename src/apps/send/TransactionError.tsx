import React from 'react';
import { ChainIndicator } from '../../shared/ChainIndicator.tsx';

type ErrorType = 'user_rejected' | 'wrong_chain' | 'insufficient_funds' | 'other' | null;

interface TransactionErrorProps {
  error: string | null;
  errorType: ErrorType;
  chainId: number;
  onRetry: () => void;
  onCancel: () => void;
}

export const TransactionError: React.FC<TransactionErrorProps> = ({
  error,
  errorType,
  chainId,
  onRetry,
  onCancel
}) => {
  // Helper function to render a network name with chain indicator styling
  const renderNetworkWithIndicator = (chainId: number) => {
    return (
      <ChainIndicator chainId={chainId} variant="payment-modal" />
    );
  };

  // Helper function to extract current chain ID from error message
  const extractCurrentChainIdFromError = (errorMessage: string): number | null => {
    // Match against "The current chain of the wallet (id: 8453) does not match the target chain for the transaction (id: 1"
    let match = errorMessage.match(/The current chain of the wallet \(id: (\d+)\)/i);
    if (match) {
      return parseInt(match[1]);
    }
    
    // match against like "Your wallet is connected to Base (Chain 8453)"
    match = errorMessage.match(/Your wallet is connected to [^(]+ \(Chain (\d+)\)/i);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  };

  // Helper function to render the wrong chain error message with styled chain indicators
  const renderWrongChainError = (error: string) => {
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
        {errorType === 'user_rejected' ? '🚫' : 
         errorType === 'wrong_chain' ? '⛓️' : 
         errorType === 'insufficient_funds' ? '💰' : '❌'}
      </div>
      <h4>
        {errorType === 'user_rejected' ? 'Transaction Cancelled' :
         errorType === 'wrong_chain' ? 'Wrong Network' :
         errorType === 'insufficient_funds' ? 'Insufficient Funds' :
         'Payment Failed'}
      </h4>
      {errorType === 'other' ? (
        <p>{error}</p>
      ) : (
        <p>
          {errorType === 'user_rejected' ? 'You cancelled the transaction in your wallet. No worries - you can try again when ready.' :
           errorType === 'wrong_chain' ? renderWrongChainError(error || '') :
           errorType === 'insufficient_funds' ? 'You don\'t have enough funds to complete this transaction. Please check your balance.' :
           error}
        </p>
      )}
      {errorType === 'wrong_chain' && (
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
          {errorType === 'user_rejected' ? 'Try Again' : 
           errorType === 'wrong_chain' ? 'Switch Network & Try Again' :
           'Try Again'}
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
