import React from 'react';
import { TokenBalance } from '../../shared/useTokenBalances.ts';

interface AmountInputProps {
  selectedToken: TokenBalance | null;
  amount: string;
  amountError: string | null;
  amountWarning: { type: 'gentle' | 'strong', message: string } | null;
  onAmountChange: (value: string) => void;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  selectedToken,
  amount,
  amountError,
  amountWarning,
  onAmountChange
}) => {
  return (
    <div className={`amount-input ${!selectedToken ? 'disabled' : ''}`}>
      <label>Amount to Send</label>
      <div className="amount-row">
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
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
  );
};
