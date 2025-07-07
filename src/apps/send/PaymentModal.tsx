import React, { useState } from 'react';
import { useAccount, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useWriteContract, useEnsName } from 'wagmi';
import { isAddress, parseUnits } from 'viem';
import { type TokenBalance } from '../../shared/useTokenBalances.ts';
import { useTokenBalancesContext } from '../../shared/TokenBalanceProvider.tsx';
import { getChainName, getDoraTransactionUrl } from '../../shared/common.ts';
import { ChainIndicator } from '../../shared/ChainIndicator.tsx';
import { AddressLink } from '../../shared/AddressLink.tsx';
import { AtprotoUserCard } from '../../shared/AtprotoUserCard.tsx';
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

// Utility function for robust wallet disconnection
const forceDisconnectAndClearState = async (disconnect: () => void, isConnected: boolean) => {
  console.log('Starting robust wallet disconnection...');
  
  // Force disconnect and clear any cached state
  try {
    await disconnect();
    console.log('Wallet disconnect completed');
  } catch (err) {
    console.warn('Disconnect failed:', err);
  }
  
  // Clear localStorage items that might cause auto-reconnection
  try {
    const keysToRemove = ['wagmi.store', 'wagmi.wallet', 'wagmi.connected'];
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage key: ${key}`);
      }
    });
    
    // Clear any RainbowKit and wallet-related storage
    const walletKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('rainbow') || key.startsWith('wagmi') || key.startsWith('wallet')
    );
    walletKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleared wallet-related localStorage key: ${key}`);
    });
  } catch (err) {
    console.warn('Failed to clear localStorage:', err);
  }
  
  // Force page refresh if still connected (nuclear option)
  if (isConnected) {
    console.warn('Wallet still connected after disconnect, will force page refresh in 500ms');
    setTimeout(() => {
      globalThis.location.reload();
    }, 500);
  }
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: `0x${string}`;
  recipientName?: string;
  recipientHandle?: string;
  recipientAvatar?: string;
  recipientDid?: string;
  chainId?: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  recipientAddress,
  recipientName,
  recipientHandle,
  recipientAvatar,
  recipientDid,
  chainId = 1
}) => {
  const { address, isConnected, chain: walletChain } = useAccount();
  const { disconnect } = useDisconnect();
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [customRecipient, setCustomRecipient] = useState(recipientAddress);
  const [step, setStep] = useState<'select' | 'sending' | 'success' | 'error'>('select');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'user_rejected' | 'wrong_chain' | 'insufficient_funds' | 'other' | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [amountWarning, setAmountWarning] = useState<{type: 'gentle' | 'strong', message: string} | null>(null);

  const { getBalancesForChain, fetchBalancesForChain, isLoadingChain } = useTokenBalancesContext();

  // Get token balances specifically for the recipient's chain
  const recipientChainBalances = getBalancesForChain(chainId);
  const loadingBalances = isLoadingChain(chainId);

  // Check if wallet chain matches expected chain
  const isWrongChain = walletChain?.id !== chainId;
  const currentWalletChainId = walletChain?.id;

  // Helper function to check for large payment warnings
  const checkLargePaymentWarning = (amount: number, token: TokenBalance) => {
    const symbol = token.symbol.toUpperCase();
    
    // Stablecoin thresholds
    const stablecoins = ['USDC', 'USDT', 'DAI', 'EURC'];
    if (stablecoins.includes(symbol)) {
      if (amount >= 1500) {
        return {
          type: 'strong' as const,
          message: `⚠️ Large payment alert: You're sending ${amount.toLocaleString()} ${symbol}. Please double-check this amount before proceeding.`
        };
      } else if (amount >= 500) {
        return {
          type: 'gentle' as const,
          message: `💰 Sending ${amount.toLocaleString()} ${symbol} - please verify this amount is correct.`
        };
      }
    }
    
    // ETH thresholds
    if (symbol === 'ETH') {
      if (amount >= 0.6) {
        return {
          type: 'strong' as const,
          message: `⚠️ Large payment alert: You're sending ${amount} ETH. Please double-check this amount before proceeding.`
        };
      } else if (amount >= 0.2) {
        return {
          type: 'gentle' as const,
          message: `💰 Sending ${amount} ETH - please verify this amount is correct.`
        };
      }
    }
    
    return null;
  };

  // Helper function to validate amount
  const validateAmount = (value: string, token: TokenBalance | null) => {
    if (!token || !value) {
      setAmountError(null);
      setAmountWarning(null);
      return;
    }

    // Ensure token belongs to the correct chain
    if (token.chainId !== chainId) {
      setAmountError(`token is for chain ${token.chainId} but expected chain ${chainId}`);
      setAmountWarning(null);
      return;
    }

    const numericAmount = parseFloat(value);
    const tokenBalance = parseFloat(token.balance);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError(null);
      setAmountWarning(null);
      return;
    }

    if (numericAmount > tokenBalance) {
      setAmountError(`amount exceeds your balance of ${token.balance} ${token.symbol}`);
      setAmountWarning(null);
    } else {
      setAmountError(null);
      // Check for large payment warnings
      const warning = checkLargePaymentWarning(numericAmount, token);
      setAmountWarning(warning);
    }
  };

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
      err.message = `Your wallet is connected to ${currentChainName} (Chain ${currentChainId}), but this transaction requires ${expectedChainName} (Chain ${chainId}).`;
      return true;
    }
    
    return false;
  }

  const extractCurrentChainIdFromError = (errorMessage: string): number | null => {
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

  // Helper function to categorize errors
  const categorizeError = (errorMessage: string): { type: 'user_rejected' | 'wrong_chain' | 'insufficient_funds' | 'other', message: string } => {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('rejected') || msg.includes('user cancelled')) {
      return {
        type: 'user_rejected',
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
          type: 'wrong_chain',
          message: `Your wallet is connected to ${currentChainName} (Chain ${currentChainId}), but this transaction requires ${expectedChainName} (Chain ${chainId}).`
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

  // Helper function to render a network name with chain indicator styling
  const renderNetworkWithIndicator = (chainId: number) => {
    return (
      <ChainIndicator chainId={chainId} variant="payment-modal" />
    );
  };

  // Helper function to render the wrong chain error message with styled chain indicators
  const renderWrongChainError = (error: string) => {
    console.warn(error);
    // Try to extract chain IDs from the error message to render with styling
    const currentChainId = extractCurrentChainIdFromError(error);
    console.log('renderWrongChainError currentChainId:', currentChainId, 'expected chainId:', chainId);
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
    // Auto-select first token when balances are loaded for better UX
    if (recipientChainBalances.length > 0 && !selectedToken) {
      setSelectedToken(recipientChainBalances[0]);
    }
  }, [isConnected, recipientChainBalances.length, recipientChainBalances, selectedToken]);

  // Fetch balances for recipient's chain when modal opens or chainId changes
  React.useEffect(() => {
    if (isOpen && address && recipientChainBalances.length === 0 && !loadingBalances) {
      fetchBalancesForChain(chainId);
    }
  }, [isOpen, address, chainId, recipientChainBalances.length, loadingBalances, fetchBalancesForChain]);

  // Clear validation errors when balances are loading for a new chain
  React.useEffect(() => {
    if (loadingBalances) {
      setAmountError(null);
      setAmountWarning(null);
    }
  }, [loadingBalances]);

  React.useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStep('select');
      setSelectedToken(null);
      setAmount('');
      setCustomRecipient(recipientAddress);
      setTxHash(null);
      setError(null);
      setErrorType(null);
      setAmountError(null);
      setAmountWarning(null);
    }
  }, [isOpen, recipientAddress]);

  // Update recipient address when recipientAddress prop changes
  React.useEffect(() => {
    setCustomRecipient(recipientAddress);
  }, [recipientAddress]);

  // Reset selected token when chainId changes to prevent validation against wrong chain balances
  React.useEffect(() => {
    setSelectedToken(null);
    setAmountError(null);
    setAmountWarning(null);
  }, [chainId]);

  // Validate amount when selected token changes or chainId changes
  React.useEffect(() => {
    if (selectedToken && amount) {
      validateAmount(amount, selectedToken);
    } else {
      setAmountError(null);
      setAmountWarning(null);
    }
  }, [selectedToken, amount, chainId]);

  const handleSendPayment = () => {
    if (!selectedToken || !amount || !customRecipient) return;

    if (!isAddress(customRecipient)) {
      const categorized = categorizeError('Invalid recipient address');
      setError(categorized.message);
      setErrorType(categorized.type);
      setStep('error');
      return;
    }

    // Check if selected token belongs to the correct chain
    if (selectedToken.chainId !== chainId) {
      setError(`Selected token is for chain ${selectedToken.chainId} but transaction requires chain ${chainId}`);
      setErrorType('other');
      setStep('error');
      return;
    }

    // Check if amount exceeds balance
    const numericAmount = parseFloat(amount);
    const tokenBalance = parseFloat(selectedToken.balance);
    if (numericAmount > tokenBalance) {
      setError(`Amount ${amount} ${selectedToken.symbol} exceeds your balance of ${selectedToken.balance} ${selectedToken.symbol}`);
      setErrorType('insufficient_funds');
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
          <div className="header-top-row">
            <div className="header-left">
              {step === 'select' && (
                <button type="button" className="change-wallet-btn" onClick={async () => {
                  // Clear all account-related state
                  setSelectedToken(null);
                  setAmount('');
                  setTxHash(null);
                  setError(null);
                  setErrorType(null);
                  setAmountError(null);
                  setAmountWarning(null);
                  
                  // Force disconnect and clear cached state
                  await forceDisconnectAndClearState(disconnect, isConnected);
                  
                  // Close modal after clearing state
                  setTimeout(() => {
                    onClose();
                  }, 100);
                }}>
                  Switch Wallet
                </button>
              )}
            </div>
            <h3>Send</h3>
            <div className="header-right">
              <button type="button" className="close-button" onClick={onClose}>×</button>
            </div>
          </div>
          {address && (
            <div className="sender-info">
              <span className="from-label">from:</span>
              <AddressLink 
                address={address} 
                fontSize="0.8rem" 
                style={{ 
                  color: 'inherit' // This will inherit the color from .sender-info CSS
                }} 
              />
            </div>
          )}
        </div>

        <div className="modal-content">
          {step === 'select' && (
            <div className="step-select">
              <div className="recipient-section">
                <label>Recipient on <ChainIndicator chainId={chainId} variant="payment-modal" /></label>
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
                    <AtprotoUserCard
                      name={recipientName}
                      handle={recipientHandle}
                      did={recipientDid}
                      avatar={recipientAvatar}
                      clickable={!!recipientHandle}
                      variant="payment"
                      showDid
                    />
                  </div>
                )}
              </div>

              {/* Chain mismatch warning */}
              {isWrongChain && (
                <div className="chain-mismatch-warning">
                  <div className="warning-content">
                    <div className="warning-text">
                      <div className="warning-title">⚠️ Network Switch Required</div>
                      <div className="warning-message">
                        Your wallet is currently connected on <ChainIndicator chainId={currentWalletChainId || 1} variant="payment-modal" />, 
                        but this payment requires <ChainIndicator chainId={chainId} variant="payment-modal" />.
                      </div>

                    </div>
                  </div>
                </div>
              )}

              <div className="token-selection">
                <label>Select Token</label>
                {loadingBalances ? (
                  <div className="loading">Loading token balances...</div>
                ) : recipientChainBalances.length === 0 ? (
                  <div className="no-tokens">No tokens with balance found</div>
                ) : (
                  <div className="token-list">
                    {recipientChainBalances.map((token, index) => (
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
                <label>Amount to Send</label>
                <div className="amount-row">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      validateAmount(e.target.value, selectedToken);
                    }}
                    placeholder={selectedToken ? "0.0" : "select a token"}
                    step="any"
                    max={selectedToken?.balance}
                    disabled={!selectedToken}
                  />
                  <div className="amount-token-display">
                    {selectedToken && selectedToken.logoUrl && (
                      <div className="amount-token-logo-container">
                        <img 
                          src={selectedToken.logoUrl} 
                          alt={`${selectedToken.symbol} logo`}
                          className="amount-token-logo"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.parentElement?.querySelector('.amount-token-logo-placeholder') as HTMLElement;
                            if (placeholder) {
                              placeholder.classList.remove('hidden');
                            }
                          }}
                        />
                        <div className={`amount-token-logo-placeholder ${selectedToken.logoUrl ? 'hidden' : ''}`}>
                          {selectedToken.symbol.charAt(0)}
                        </div>
                      </div>
                    )}
                    {selectedToken && !selectedToken.logoUrl && (
                      <div className="amount-token-logo-container">
                        <div className="amount-token-logo-placeholder">
                          {selectedToken.symbol.charAt(0)}
                        </div>
                      </div>
                    )}
                    <span className="token-symbol">{selectedToken?.symbol || '---'}</span>
                  </div>
                </div>
                {amountError && (
                  <div className="amount-error">
                    {amountError}
                  </div>
                )}
                {amountWarning && (
                  <div className={`amount-warning ${amountWarning.type}`}>
                    {amountWarning.message}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="confirm-button"
                  disabled={!selectedToken || !amount || !customRecipient || parseFloat(amount) <= 0 || isTransactionPending || !!amountError || isWrongChain}
                  onClick={handleSendPayment}
                >
                  {isTransactionPending ? 'Sending...' : `Send ${selectedToken?.symbol || ''}`}
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
                <button type="button" className="back-button" onClick={async () => {
                  if (errorType === 'wrong_chain') {
                    // Clear all account-related state and forcefully disconnect wallet
                    setSelectedToken(null);
                    setAmount('');
                    setTxHash(null);
                    setError(null);
                    setErrorType(null);
                    setAmountError(null);
                    
                    // Force disconnect and clear cached state
                    await forceDisconnectAndClearState(disconnect, isConnected);
                    
                    // Small delay to ensure state is cleared before closing
                    setTimeout(() => {
                      onClose();
                    }, 100);
                  } else {
                    // For other errors, just go back to select step
                    setStep('select');
                    setError(null);
                    setErrorType(null);
                    setTxHash(null);
                    setAmountWarning(null);
                  }
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
