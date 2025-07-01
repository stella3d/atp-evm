import React, { useState } from 'react';
import { useAccount, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useWriteContract, useEnsName } from 'wagmi';
import { isAddress, parseUnits } from 'viem';
import { SimpleWalletConnector } from './SimpleWalletConnector.tsx';
import { useTokenBalances, type TokenBalance } from './useTokenBalances.ts';
import { getChainName, getChainClass, getDoraTransactionUrl } from './common.ts';
import { AddressLink } from './AddressLink.tsx';
import './PaymentModal.css';

// ERC20 ABI for transfer function
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: `0x${string}`;
  recipientName?: string;
  recipientHandle?: string;
  recipientAvatar?: string;
  chainId?: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  recipientAddress,
  recipientName,
  recipientHandle,
  recipientAvatar,
  chainId = 1
}) => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [customRecipient, setCustomRecipient] = useState(recipientAddress);
  const [step, setStep] = useState<'connect' | 'select' | 'sending' | 'success' | 'error'>('connect');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'user_rejected' | 'wrong_chain' | 'insufficient_funds' | 'other' | null>(null);

  const isWrongChainErr = (err: {
    type: "user_rejected" | "wrong_chain" | "insufficient_funds" | "other";
    message: string;
  }, originalErrorMessage: string) => {
    if (err.type === 'wrong_chain') {
      return true;
    }
    
    // Check if this is a chain mismatch error by looking for current chain ID in the message
    const currentChainId = extractCurrentChainIdFromError(originalErrorMessage);
    if (currentChainId !== null && currentChainId !== chainId) {
      // This is definitely a wrong chain error - update the message with specific chain info
      const currentChainName = getChainName(currentChainId);
      const expectedChainName = getChainName(chainId);
      err.message = `Your wallet is connected to ${currentChainName} (Chain ${currentChainId}), but this transaction requires ${expectedChainName} (Chain ${chainId}). Please switch networks to complete this transaction.`;
      return true;
    }
    
    return false;
  }

  // Helper function to extract current chain ID from error messages
  const extractCurrentChainIdFromError = (errorMessage: string): number | null => {
    // Pattern for "The current chain of the wallet (id: 1) does not match"
    const chainIdMatch = errorMessage.match(/current chain of the wallet \(id: (\d+)\) does not match/i);
    if (chainIdMatch) {
      return parseInt(chainIdMatch[1]);
    }
    
    // Pattern for "Connected to chain 1, but expected 8453" or "Connected to chain 1 but expected chain 8453"
    const connectedChainMatch = errorMessage.match(/connected to chain (\d+)(?:,?\s*but expected(?:\s+chain)?\s+\d+)?/i);
    if (connectedChainMatch) {
      return parseInt(connectedChainMatch[1]);
    }
    
    // Pattern for "Chain ID 1 is not supported" or "Chain ID 1 not supported"
    const chainNotSupportedMatch = errorMessage.match(/chain id (\d+)\s+(?:is\s+)?not supported/i);
    if (chainNotSupportedMatch) {
      return parseInt(chainNotSupportedMatch[1]);
    }
    
    // Pattern for "wallet chain 1" or "wallet is on chain 1"
    const walletChainMatch = errorMessage.match(/wallet(?:\s+is)?\s+(?:on\s+)?chain (\d+)/i);
    if (walletChainMatch) {
      return parseInt(walletChainMatch[1]);
    }
    
    // Pattern for "unsupported chain 1" or "chain 1 unsupported"
    const unsupportedChainMatch = errorMessage.match(/(?:unsupported\s+chain\s+(\d+)|chain\s+(\d+)\s+unsupported)/i);
    if (unsupportedChainMatch) {
      return parseInt(unsupportedChainMatch[1] || unsupportedChainMatch[2]);
    }
    
    // Pattern for "wrong network, currently on chain 1"
    const wrongNetworkMatch = errorMessage.match(/wrong network(?:,)?\s+currently on chain (\d+)/i);
    if (wrongNetworkMatch) {
      return parseInt(wrongNetworkMatch[1]);
    }
    
    return null;
  };


  // Helper function to categorize errors
  const categorizeError = (errorMessage: string): { type: 'user_rejected' | 'wrong_chain' | 'insufficient_funds' | 'other', message: string } => {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('rejected') || msg.includes('user cancelled')) {
      return {
        type: 'user_rejected',
        message: 'Transaction was cancelled. You can try again when ready.'
      };
    }
    
    if (msg.includes('wrong chain') || msg.includes('chain mismatch') || msg.includes('unsupported chain') || msg.includes('switch chain')) {
      // Try to extract current chain from error message and compare with expected
      const currentChainId = extractCurrentChainIdFromError(errorMessage);
      if (currentChainId !== null && currentChainId !== chainId) {
        const currentChainName = getChainName(currentChainId);
        const expectedChainName = getChainName(chainId);
        return {
          type: 'wrong_chain',
          message: `Your wallet is connected to ${currentChainName} (Chain ${currentChainId}), but this transaction requires ${expectedChainName} (Chain ${chainId}). Please switch networks to complete this transaction.`
        };
      } else {
        // Fallback for when we can't extract chain info
        const currentChainInfo = extractCurrentChainFromError(errorMessage);
        const currentChainText = currentChainInfo ? ` You're currently connected to ${currentChainInfo}.` : '';
        return {
          type: 'wrong_chain',
          message: `Your wallet is connected to the wrong network.${currentChainText} Please switch to ${getChainName(chainId)} to complete this transaction.`
        };
      }
    }
    
    if (msg.includes('insufficient funds') || msg.includes('insufficient balance') || msg.includes('not enough')) {
      return {
        type: 'insufficient_funds',
        message: 'Insufficient funds to complete this transaction. Please check your balance and try again.'
      };
    }
    
    return {
      type: 'other',
      message: errorMessage
    };
  };

  // Helper function to extract current chain information from error messages
  const extractCurrentChainFromError = (errorMessage: string): string | null => {
    const currentChainId = extractCurrentChainIdFromError(errorMessage);
    if (currentChainId !== null) {
      return getChainName(currentChainId);
    }
    return null;
  };

  const { tokenBalances, loading: loadingBalances } = useTokenBalances(chainId);
  
  // Get ENS name for the recipient address
  const { data: ensName } = useEnsName({
    address: isAddress(customRecipient) ? customRecipient : undefined,
    chainId: 1, // ENS is on mainnet
  });
  
  const { sendTransaction, isPending: isSending } = useSendTransaction({
    mutation: {
      onSuccess: (hash) => {
        setTxHash(hash);
        setStep('sending');
      },
      onError: (error) => {
        const categorized = categorizeError(error.message);
        console.error('sendTransaction error:', error.message, categorized);
        if (categorized.type !== 'other') {
          // For typed errors, only store the user-friendly message but log the raw error
          setError(categorized.message);
        } else {
          // For unknown errors, show the raw message
          setError(categorized.message);
        }
        setErrorType(categorized.type);
        setStep('error');
      }
    }
  });

  const { writeContract, isPending: isWriting } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        setTxHash(hash);
        setStep('sending');
      },
      onError: (error) => {
        const categorized = categorizeError(error.message);
        console.error('writeContract error:', error.message, categorized);
        if (isWrongChainErr(categorized, error.message))
          categorized.type = 'wrong_chain';
        
        if (categorized.type !== 'other') {
          // For typed errors, only store the user-friendly message but log the raw error
          setError(categorized.message);
        } else {
          // For unknown errors, show the raw message
          setError(categorized.message);
        }
        setErrorType(categorized.type);
        setStep('error');
      }
    }
  });

  const { isSuccess, isError, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  });

  React.useEffect(() => {
    if (isSuccess && step === 'sending') {
      setStep('success');
    }
  }, [isSuccess, step]);

  React.useEffect(() => {
    if (isError && receiptError && step === 'sending') {
      const categorized = categorizeError(receiptError.message);
      console.error('transaction receipt error:', receiptError.message, categorized);
      
      if (categorized.type !== 'other') {
        // For typed errors, only store the user-friendly message but log the raw error
        setError(categorized.message);
      } else {
        // For unknown errors, show the raw message
        setError(categorized.message);
      }
      setErrorType(categorized.type);
      setStep('error');
    }
  }, [isError, receiptError, step]);

  React.useEffect(() => {
    if (isConnected && tokenBalances.length > 0 && step === 'connect') {
      setStep('select');
    }
  }, [isConnected, tokenBalances.length, step, tokenBalances]);

  React.useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStep('connect');
      setSelectedToken(null);
      setAmount('');
      setCustomRecipient(recipientAddress);
      setTxHash(null);
      setError(null);
      setErrorType(null);
    }
  }, [isOpen, recipientAddress]);

  // Update recipient address when recipientAddress prop changes
  React.useEffect(() => {
    setCustomRecipient(recipientAddress);
  }, [recipientAddress]);

  const handleSendPayment = () => {
    if (!selectedToken || !amount || !customRecipient) return;

    if (!isAddress(customRecipient)) {
      const categorized = categorizeError('Invalid recipient address');
      setError(categorized.message);
      setErrorType(categorized.type);
      setStep('error');
      return;
    }

    try {
      const parsedAmount = parseUnits(amount, selectedToken.decimals);
      
      if (selectedToken.address === 'native') {
        // Send native token (ETH)
        sendTransaction({
          to: customRecipient,
          value: parsedAmount,
          chainId,
        });
      } else {
        // Send ERC20 token
        writeContract({
          address: selectedToken.address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [customRecipient, parsedAmount],
          chainId,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      const categorized = categorizeError(errorMessage);
      setError(categorized.message);
      setErrorType(categorized.type);
      setStep('error');
    }
  };

  const isTransactionPending = isSending || isWriting;

  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Send Payment</h3>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {step === 'connect' && (
            <div className="step-connect">
              <p>Connect your wallet to send a payment{recipientName && ` to ${recipientName}`}</p>
              <SimpleWalletConnector />
            </div>
          )}

          {step === 'select' && (
            <div className="step-select">
              <div className="wallet-info">
                <div className="wallet-status">
                  <p>✅ Connected on <span className="chain-name">{getChainName(chainId)}</span> as: {address ? <AddressLink address={address} /> : <code>No address</code>}</p>
                  <button type="button" className="disconnect-btn" onClick={() => disconnect()}>
                    Change Wallet
                  </button>
                </div>
              </div>

              <div className="recipient-section">
                <label>Recipient Address on<span className={`chain-indicator ${getChainClass(chainId)}`}>{getChainName(chainId)}</span></label>
                <div className="recipient-address-display">
                  <AddressLink address={customRecipient} className="recipient-input" />
                </div>
                {ensName && (
                  <div className="ens-info">
                    <div className="ens-header">also known as</div>
                    <div className="ens-name">
                      <span className="ens-value">{ensName}</span>
                    </div>
                  </div>
                )}
                {(recipientName || recipientHandle) && (
                  <div className="recipient-info">
                    <div className="recipient-header">which is controlled by</div>
                    <div 
                      className={`recipient-profile ${recipientHandle ? 'clickable' : ''}`}
                      onClick={() => {
                        if (recipientHandle) {
                          globalThis.open(`https://bsky.app/profile/${recipientHandle}`, '_blank');
                        }
                      }}
                      title={recipientHandle ? `View @${recipientHandle} on Bluesky` : undefined}
                    >
                      {recipientAvatar ? (
                        <img 
                          src={recipientAvatar} 
                          alt={`${recipientHandle || recipientName} avatar`}
                          className="recipient-avatar"
                        />
                      ) : (
                        <div className="recipient-avatar-placeholder">
                          {(recipientHandle || recipientName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="recipient-details">
                        {recipientName && <div className="recipient-name">{recipientName}</div>}
                        {recipientHandle && <div className="recipient-handle">@{recipientHandle}</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="token-selection">
                <label>Select Token</label>
                {loadingBalances ? (
                  <div className="loading">Loading token balances...</div>
                ) : tokenBalances.length === 0 ? (
                  <div className="no-tokens">No tokens with balance found</div>
                ) : (
                  <div className="token-list">
                    {tokenBalances.map((token, index) => (
                      <div 
                        key={`${token.address}-${index}`}
                        className={`token-item ${selectedToken === token ? 'selected' : ''}`}
                        onClick={() => setSelectedToken(token)}
                      >
                        <div className="token-header">
                          <div className="token-logo-container">
                            {token.logoUrl && (
                              <img 
                                src={token.logoUrl} 
                                alt={`${token.symbol} logo`}
                                className="token-logo"
                                onLoad={() => {
                                }}
                                onError={(e) => {
                                  console.warn(`Token logo failed to load for ${token.symbol}:`, token.logoUrl);
                                  e.currentTarget.style.display = 'none';
                                  const placeholder = e.currentTarget.parentElement?.querySelector('.token-logo-placeholder') as HTMLElement;
                                  if (placeholder) {
                                    placeholder.classList.remove('hidden');
                                  }
                                }}
                              />
                            )}
                            <div className={`token-logo-placeholder ${token.logoUrl ? 'hidden' : ''}`}>
                              {token.symbol.charAt(0)}
                            </div>
                          </div>
                          <div className="token-info">
                            <div className="token-symbol">{token.symbol}</div>
                            <div className="token-name">{token.name}</div>
                          </div>
                        </div>
                        <div className="token-balance-section">
                          <div className="token-balance-label">Balance</div>
                          <div className="token-balance">
                            {parseFloat(token.balance).toFixed(6)} {token.symbol}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`amount-input ${!selectedToken ? 'disabled' : ''}`}>
                <label>Amount to send:</label>
                <div className="amount-row">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={selectedToken ? "0.0" : "Select a token first"}
                    step="any"
                    max={selectedToken?.balance}
                    disabled={!selectedToken}
                  />
                  <span className="token-symbol">{selectedToken?.symbol || '---'}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="confirm-button"
                  disabled={!selectedToken || !amount || !customRecipient || parseFloat(amount) <= 0 || isTransactionPending}
                  onClick={handleSendPayment}
                >
                  {isTransactionPending ? 'Sending...' : `Send ${selectedToken?.symbol || 'Payment'}`}
                </button>
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div className="step-sending">
              <div className="loading-spinner">⏳</div>
              <h4>Transaction Sent</h4>
              <p>Waiting for confirmation...</p>
              {txHash && (
                <div className="tx-hash">
                  <div>Transaction Hash:</div>
                  <code>{txHash}</code>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="step-success">
              <div className="success-icon">✅</div>
              <h4>Payment Successful!</h4>
              <p>Your payment has been confirmed on the blockchain.</p>
              {txHash && (
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
              )}
              <button type="button" className="done-button" onClick={onClose}>
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
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
                   errorType === 'wrong_chain' ? error :
                   errorType === 'insufficient_funds' ? 'You don\'t have enough funds to complete this transaction. Please check your balance.' :
                   error}
                </p>
              )}
              {errorType === 'wrong_chain' && (
                <div className="chain-help">
                  <p>To complete this transaction, please:</p>
                  <ol>
                    <li>Open your wallet</li>
                    <li>Switch to <strong>{getChainName(chainId)}</strong></li>
                    <li>Try the payment again</li>
                  </ol>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="back-button" onClick={() => {
                  setStep('select');
                  setError(null);
                  setErrorType(null);
                  setTxHash(null);
                }}>
                  {errorType === 'user_rejected' ? 'Try Again' : 
                   errorType === 'wrong_chain' ? 'Switch Network & Try Again' :
                   'Try Again'}
                </button>
                <button type="button" className="cancel-button" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
