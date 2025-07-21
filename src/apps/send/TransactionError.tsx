import React from 'react';
import { ChainIndicator } from '../../shared/ChainIndicator.tsx';
import { getChainName } from "../../shared/common.ts";

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

export const extractCurrentChainIdFromError = (errorMessage: string): number | null => {
    // Match against "The current chain of the wallet (id: 8453) does not match the target chain for the transaction (id: 1"
    let match = errorMessage.match(/The current chain of the wallet \(id: (\d+)\)/i);
    if (match) {
      console.log('matched wallet chain id:', match);
      return parseInt(match[1]);
    }
    
    // match against like "Your wallet is connected to Base (Chain 8453)"
    match = errorMessage.match(/Your wallet is connected to [^(]+ \(Chain (\d+)\)/i);
    if (match) {
      console.log('matched wrapper chainId:', match);
      return parseInt(match[1]);
    }
    return null;
  };

export const isWrongChainErr = (chainId: number, err: ErrorState, originalErrorMessage: string) => {
  if (err.type === ErrorType.WRONG_CHAIN)
    return true;
  
  // Check if this is a chain mismatch error by looking for current chain ID in the message
  const currentChainId = extractCurrentChainIdFromError(originalErrorMessage);
  if (currentChainId !== null && currentChainId !== chainId) {
    // This is definitely a wrong chain error - update the message with specific chain info
    const currentChainName = getChainName(currentChainId);
    const expectedChainName = getChainName(chainId);
    err.message = `Your wallet is connected to ${currentChainName} (Chain ${currentChainId}), but this transaction requires ${expectedChainName} (Chain ${chainId}).`;
    return true;
  }
  
  return false;
}

// Helper function to categorize errors
export const categorizeError = (chainId: number, errorMessage: string): ErrorState => {
  const msg = errorMessage.toLowerCase();
  
  if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('rejected') || msg.includes('user cancelled')) {
    return {
      type: ErrorType.USER_REJECTED,
      message: 'Transaction was cancelled. You can try again when ready.'
    };
  }
  
  if (msg.includes('wrong chain') || msg.includes('chain mismatch') || msg.includes('unsupported chain') || msg.includes('switch chain') || msg.includes('does not match the target chain')) {
    // Try to extract current chain from error message and compare with expected
    const currentChainId = extractCurrentChainIdFromError(errorMessage);
    if (currentChainId !== null && currentChainId !== chainId) {
      const currentChainName = getChainName(currentChainId);
      const expectedChainName = getChainName(chainId);
      return {
        type: ErrorType.WRONG_CHAIN,
        message: `Your wallet is connected to ${currentChainName} (Chain ${currentChainId}), but this transaction requires ${expectedChainName} (Chain ${chainId}).`
      };
    } else {
      // Fallback for when we can't extract chain info
      return {
        type: ErrorType.WRONG_CHAIN,
        message: `Your wallet is connected to the wrong network. Please switch to ${getChainName(chainId)} to complete this transaction.`
      };
    }
  }
  
  if (msg.includes('insufficient funds') || msg.includes('insufficient balance') || msg.includes('not enough')) {
    return {
      type: ErrorType.INSUFFICIENT_FUNDS,
      message: 'Insufficient funds to complete this transaction. Please check your balance and try again.'
    };
  }
  
  return {
    type: ErrorType.OTHER,
    message: errorMessage
  };
};

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
