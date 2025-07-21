import React, { useState } from 'react';
import { useAccount, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { isAddress, parseUnits } from 'viem';
import { type TokenBalance } from '../../shared/useTokenBalances.ts';
import { useTokenBalancesContext } from '../../shared/TokenBalanceProvider.tsx';
import { AddressLink } from '../../shared/AddressLink.tsx';
import { RecipientInfo } from './RecipientInfo.tsx';
import { ChainMismatchWarning } from './ChainMismatchWarning.tsx';
import { TokenSelector } from './TokenSelector.tsx';
import { AmountInput } from './AmountInput.tsx';
import { TransactionPending } from './TransactionPending.tsx';
import { TransactionSuccess } from './TransactionSuccess.tsx';
import { TransactionError, ErrorType, categorizeError, isWrongChainErr } from './TransactionError.tsx';
import './PaymentModal.css';

enum Step {
  SELECT,
  SENDING,
  SUCCESS,
  ERROR
}

// why doesn't this work as an import?
type ErrorState = {
  type: ErrorType;
  message: string;
}

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

type AmountValidationWarning = { 
  type: 'gentle' | 'strong'; 
  message: string;
};

const checkLargePaymentWarning = (amount: number, token: TokenBalance): AmountValidationWarning | null => {
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
    if (amount >= 0.5) {
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
  const [step, setStep] = useState<Step>(Step.SELECT);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const [error, setError] = useState<ErrorState | null>(null);

  const [amountError, setAmountError] = useState<string | null>(null);
  const [amountWarning, setAmountWarning] = useState<AmountValidationWarning | null>(null);
  const clearAmountValidation = () => { setAmountError(null); setAmountWarning(null); };

  const { getBalancesForChain, fetchBalancesForChain, isLoadingChain } = useTokenBalancesContext();

  // Get token balances specifically for the recipient's chain
  const recipientChainBalances = getBalancesForChain(chainId);
  const loadingBalances = isLoadingChain(chainId);

  // Check if wallet chain matches expected chain
  const isWrongChain = walletChain?.id !== chainId;
  const currentWalletChainId = walletChain?.id;

  // Helper function to validate amount
  const validateAmount = (value: string, token: TokenBalance | null) => {
    if (!token || !value)
      return clearAmountValidation();

    const numericAmount = parseFloat(value);
    if (numericAmount < 0) {
      setAmountWarning(null);
      setAmountError('amount must be greater than 0');
      return;
    }
    if (isNaN(numericAmount))
      return clearAmountValidation();

    const tokenBalance = parseFloat(token.balance);
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

  const { sendTransaction, isPending: isSending } = useSendTransaction({
    mutation: {
      onSuccess: (hash) => {
        setTxHash(hash);
        setStep(Step.SENDING);
      },
      onError: (error) => {
        const categorized = categorizeError(chainId, error.message);
        console.error('sendTransaction error:', error.message, categorized);
        setError(categorized);
        setStep(Step.ERROR);
      }
    }
  });

  const { writeContract, isPending: isWriting } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        setTxHash(hash);
        setStep(Step.SENDING);
      },
      onError: (error) => {
        const categorized = categorizeError(chainId, error.message);
        console.error('writeContract error:', error.message, categorized);
        if (isWrongChainErr(chainId, categorized, error.message)) {
          categorized.type = ErrorType.WRONG_CHAIN;
          setError(categorized);
          setStep(Step.ERROR);
        }
      }
    }
  });

  const { isSuccess, isError, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  });

  React.useEffect(() => {
    if (isSuccess && step === Step.SENDING) {
      // 1/2 second delay to allow block explorer to index the transaction
      setTimeout(() => { setStep(Step.SUCCESS); }, 500);
    }
  }, [isSuccess, step]);

  React.useEffect(() => {
    if (isError && receiptError && step === Step.SENDING) {
      const categorized = categorizeError(chainId, receiptError.message);
      console.error('transaction receipt error:', receiptError.message, categorized);
      setError(categorized);
      setStep(Step.ERROR);
    }
  }, [isError, receiptError, step]);

  React.useEffect(() => {
    // Auto-select first token when balances are loaded for better UX
    if (recipientChainBalances.length > 0 && !selectedToken) {
      setSelectedToken(recipientChainBalances[0]);
    }
  }, [isConnected, recipientChainBalances.length, recipientChainBalances, selectedToken]);

  // Fetch balances for recipient's chain when modal opens or chainId changes
  // TODO - should this be removed? would it help with rate limits?
  React.useEffect(() => {
    if (isOpen && address && recipientChainBalances.length === 0 && !loadingBalances) {
      fetchBalancesForChain(chainId);
    }
  }, [isOpen, address, chainId, recipientChainBalances.length, loadingBalances, fetchBalancesForChain]);

  // clear validation errors when balances are loading for a new chain
  React.useEffect(() => {
    if (loadingBalances) 
      clearAmountValidation();
  }, [loadingBalances]);

  React.useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStep(Step.SELECT);
      setSelectedToken(null);
      setAmount('');
      setCustomRecipient(recipientAddress);
      setTxHash(null);
      setError(null);
      clearAmountValidation();
    }
  }, [isOpen, recipientAddress]);

  // Update recipient address when recipientAddress prop changes
  React.useEffect(() => {
    setCustomRecipient(recipientAddress);
  }, [recipientAddress]);

  // Reset selected token when chainId changes to prevent validation against wrong chain balances
  React.useEffect(() => {
    setSelectedToken(null);
    clearAmountValidation();
  }, [chainId]);

  // Validate amount when selected token changes or chainId changes
  React.useEffect(() => {
    if (selectedToken && amount) {
      validateAmount(amount, selectedToken);
    } else {
      clearAmountValidation();
    }
  }, [selectedToken, amount, chainId]);

  const handleSendPayment = () => {
    if (!selectedToken || !amount || !customRecipient) return;

    if (!isAddress(customRecipient)) {
      const categorized = categorizeError(chainId, 'Invalid recipient address');
      setError(categorized);
      setStep(Step.ERROR);
      return;
    }

    // Check if selected token belongs to the correct chain
    // TODO - is this still needed? can we remove it?
    if (selectedToken.chainId !== chainId) {
      setError({
        message: `selected token is for chain ${selectedToken.chainId} but transaction requires chain ${chainId}`,
        type: ErrorType.OTHER
      });
      setStep(Step.ERROR);
      return;
    }

    // Check if amount exceeds balance
    const numericAmount = parseFloat(amount);
    const tokenBalance = parseFloat(selectedToken.balance);
    if (numericAmount > tokenBalance) {
      setError({
        message: `Amount ${amount} ${selectedToken.symbol} exceeds your balance of ${selectedToken.balance} ${selectedToken.symbol}`,
        type: ErrorType.INSUFFICIENT_FUNDS
      });
      setStep(Step.ERROR);
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
      const categorized = categorizeError(chainId, errorMessage);
      setError(categorized);
      setStep(Step.ERROR);
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
              {step === Step.SELECT && (
                <button type="button" className="change-wallet-btn" onClick={async () => {
                  // Clear all account-related state
                  setSelectedToken(null);
                  setAmount('');
                  setTxHash(null);
                  setError(null);
                  clearAmountValidation();

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
            <h3>
              {
                step === Step.SUCCESS 
                  ? 'Send Successful' 
                  : step === Step.SENDING ? 'Sending...' : 'Send'
              }
            </h3>
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
          {step === Step.SELECT && (
            <div className="step-select">
              <RecipientInfo
                recipientAddress={customRecipient}
                recipientName={recipientName}
                recipientHandle={recipientHandle}
                recipientAvatar={recipientAvatar}
                recipientDid={recipientDid}
                chainId={chainId}
              />

              <TokenSelector
                loadingBalances={loadingBalances}
                recipientChainBalances={recipientChainBalances}
                selectedToken={selectedToken}
                onTokenSelect={setSelectedToken}
              />

              <ChainMismatchWarning
                isWrongChain={isWrongChain}
                currentWalletChainId={currentWalletChainId}
                requiredChainId={chainId}
              />

              <AmountInput
                selectedToken={selectedToken}
                amount={amount}
                amountError={amountError}
                amountWarning={amountWarning}
                onAmountChange={(value) => {
                  setAmount(value);
                  validateAmount(value, selectedToken);
                }}
              />

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

          {step === Step.SENDING && (
            <TransactionPending txHash={txHash} />
          )}

          {step === Step.SUCCESS && txHash && (
            <TransactionSuccess
              txHash={txHash}
              chainId={chainId}
              onDone={onClose}
            />
          )}

          {step === Step.ERROR && error && (
            <TransactionError
              error={error}
              chainId={chainId}
              onRetry={() => {
                if (error.type === ErrorType.WRONG_CHAIN) {
                  // For wrong chain errors, just go back to select step
                  // The user can see the chain mismatch warning and choose to switch chains
                  setStep(Step.SELECT);
                  setError(null);
                  setTxHash(null);
                  setAmountWarning(null);
                } else {
                  // For other errors, just go back to select step
                  setStep(Step.SELECT);
                  setError(null);
                  setTxHash(null);
                  setAmountWarning(null);
                }
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
