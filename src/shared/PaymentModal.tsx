import React, { useState } from 'react';
import { useAccount, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseUnits, isAddress } from 'viem';
import { SimpleWalletConnector } from './SimpleWalletConnector.tsx';
import { useTokenBalances, type TokenBalance } from './useTokenBalances.ts';
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

  const { tokenBalances, loading: loadingBalances } = useTokenBalances(chainId);
  
  const { sendTransaction, isPending: isSending } = useSendTransaction({
    mutation: {
      onSuccess: (hash) => {
        setTxHash(hash);
        setStep('sending');
      },
      onError: (error) => {
        setError(error.message);
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
        setError(error.message);
        setStep('error');
      }
    }
  });

  const { isSuccess } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  });

  React.useEffect(() => {
    if (isSuccess && step === 'sending') {
      setStep('success');
    }
  }, [isSuccess, step]);

  React.useEffect(() => {
    console.log('PaymentModal: checking step transition', { 
      isConnected, 
      tokenBalancesLength: tokenBalances.length, 
      step,
      tokenBalances 
    });
    
    if (isConnected && tokenBalances.length > 0 && step === 'connect') {
      console.log('PaymentModal: transitioning to select step');
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
    }
  }, [isOpen, recipientAddress]);

  // Update recipient address when recipientAddress prop changes
  React.useEffect(() => {
    setCustomRecipient(recipientAddress);
  }, [recipientAddress]);

  const handleSendPayment = () => {
    if (!selectedToken || !amount || !customRecipient) return;

    if (!isAddress(customRecipient)) {
      setError('Invalid recipient address');
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
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
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
                  <p>✅ Connected as: <code>{address}</code></p>
                  <button type="button" className="disconnect-btn" onClick={() => disconnect()}>
                    Change Wallet
                  </button>
                </div>
              </div>

              <div className="recipient-section">
                <label>Recipient Address:</label>
                <input 
                  type="text"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value as `0x${string}`)}
                  placeholder="0x..."
                  className="recipient-input"
                />
                {(recipientName || recipientHandle) && (
                  <div className="recipient-info">
                    <div className="recipient-header">which is controlled by</div>
                    <div className="recipient-profile">
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
                <label>Select Token & Amount:</label>
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
                        <div className="token-info">
                          <div className="token-symbol">{token.symbol}</div>
                          <div className="token-name">{token.name}</div>
                        </div>
                        <div className="token-balance">
                          {parseFloat(token.balance).toFixed(6)} {token.symbol}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedToken && (
                <div className="amount-input">
                  <label>Amount to send:</label>
                  <div className="amount-row">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      step="any"
                      max={selectedToken.balance}
                    />
                    <span className="token-symbol">{selectedToken.symbol}</span>
                  </div>
                  <div className="max-button-container">
                    <button 
                      type="button" 
                      className="max-button"
                      onClick={() => setAmount(selectedToken.balance)}
                    >
                      Max
                    </button>
                  </div>
                </div>
              )}

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
                  <small>Transaction: {txHash}</small>
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
                  <small>Transaction: {txHash}</small>
                </div>
              )}
              <button type="button" className="done-button" onClick={onClose}>
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="step-error">
              <div className="error-icon">❌</div>
              <h4>Payment Failed</h4>
              <p>{error}</p>
              <div className="modal-actions">
                <button type="button" className="back-button" onClick={() => {
                  setStep('select');
                  setError(null);
                  setTxHash(null);
                }}>
                  Try Again
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
