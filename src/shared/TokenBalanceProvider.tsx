import { createContext, useContext, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useTokenBalances, type TokenBalance } from './useTokenBalances.ts';
import '../apps/send/UserDetailCard.css'; // Reusing styles for consistency

interface TokenBalancesContextType {
  balances: TokenBalance[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const TokenBalancesContext = createContext<TokenBalancesContextType | undefined>(undefined);

export const useTokenBalancesContext = () => {
  const context = useContext(TokenBalancesContext);
  if (!context) {
    throw new Error('useTokenBalancesContext must be used within a TokenBalancesProvider');
  }
  return context;
};

export const TokenBalancesProvider = ({ children }: { children: ReactNode }) => {
  const { address, chain } = useAccount();
  const {
    tokenBalances,
    loading,
    error,
    refetch,
  } = useTokenBalances(address, chain?.id);

  const value = {
    balances: tokenBalances,
    loading,
    error,
    refetch,
  };

  return (
    <TokenBalancesContext.Provider value={value}>
      {children}
    </TokenBalancesContext.Provider>
  );
};

export const TokenBalanceLoader: React.FC = () => {
  const { loading, error } = useTokenBalancesContext();

  if (!loading && !error) {
    return null;
  }

  return (
    <div className="user-detail-card wallet-connection-card">
      <div className="wallet-connection-section">
        {loading && <p>Loading token balances...</p>}
        {error && <p style={{ color: 'red' }}>Error loading balances: {error}</p>}
      </div>
    </div>
  );
};
