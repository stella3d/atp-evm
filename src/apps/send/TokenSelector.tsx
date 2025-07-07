import React from 'react';
import { TokenBalance } from '../../shared/useTokenBalances.ts';

interface TokenSelectorProps {
  loadingBalances: boolean;
  recipientChainBalances: TokenBalance[];
  selectedToken: TokenBalance | null;
  onTokenSelect: (token: TokenBalance) => void;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  loadingBalances,
  recipientChainBalances,
  selectedToken,
  onTokenSelect
}) => {
  return (
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
              onClick={() => onTokenSelect(token)}
            >
              <div className="token-header">
                <div className="token-logo-container">
                  {token.logoUrl && (
                    <img 
                      src={token.logoUrl} 
                      alt={`${token.symbol} logo`}
                      className="token-logo"
                      onLoad={() => {
                        // Image loaded successfully
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
  );
};
