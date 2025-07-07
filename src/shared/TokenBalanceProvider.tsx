import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useTokenBalances, fetchTokenBalancesForChain, type TokenBalance } from './useTokenBalances.ts';
import '../apps/send/UserDetailCard.css'; // Reusing styles for consistency

interface TokenBalancesContextType {
  balances: TokenBalance[]; // Current chain balances for backward compatibility
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getBalancesForChain: (chainId: number) => TokenBalance[];
  fetchBalancesForChain: (chainId: number) => void;
  isLoadingChain: (chainId: number) => boolean;
}

// Cache for token balances per chain per address
interface ChainBalanceCache {
  [address: string]: {
    [chainId: number]: {
      balances: TokenBalance[];
      timestamp: number;
      loading: boolean;
    };
  };
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
  const [cache, setCache] = useState<ChainBalanceCache>({});
  const [requestedChains, setRequestedChains] = useState<Set<number>>(new Set());
  
  // Current chain balances (for backward compatibility)
  const {
    tokenBalances,
    loading,
    error,
    refetch,
  } = useTokenBalances(address, chain?.id);

  // Cache expiration time (5 minutes)
  const CACHE_EXPIRY = 5 * 60 * 1000;

  // Update cache when current chain balances change
  useEffect(() => {
    if (address && chain?.id && tokenBalances.length > 0) {
      setCache(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          [chain.id]: {
            balances: tokenBalances,
            timestamp: Date.now(),
            loading: false,
          }
        }
      }));
    }
  }, [address, chain?.id, tokenBalances]);

  // Function to get balances for a specific chain
  const getBalancesForChain = useCallback((chainId: number): TokenBalance[] => {
    if (!address) return [];
    
    const addressCache = cache[address];
    const chainCache = addressCache?.[chainId];
    
    if (!chainCache) return [];
    
    // Check if cache is expired
    const isExpired = Date.now() - chainCache.timestamp > CACHE_EXPIRY;
    if (isExpired) return [];
    
    return chainCache.balances;
  }, [address, cache, CACHE_EXPIRY]);

  // Function to check if a chain is currently loading
  const isLoadingChain = useCallback((chainId: number): boolean => {
    if (!address) return false;
    
    const addressCache = cache[address];
    const chainCache = addressCache?.[chainId];
    
    return chainCache?.loading || false;
  }, [address, cache]);

  // Function to fetch balances for a specific chain
  const fetchBalancesForChain = useCallback(async (chainId: number) => {
    if (!address || requestedChains.has(chainId)) return;
    
    setRequestedChains(prev => new Set(prev).add(chainId));
    
    // Mark chain as loading
    setCache(prev => ({
      ...prev,
      [address]: {
        ...prev[address],
        [chainId]: {
          balances: prev[address]?.[chainId]?.balances || [],
          timestamp: prev[address]?.[chainId]?.timestamp || 0,
          loading: true,
        }
      }
    }));

    // Import and use the hook dynamically (this is a bit hacky but works)
    // In a real app, you'd want to extract the fetching logic into a separate function
    try {
      const balances = await fetchTokenBalancesForChain(address, chainId);
      
      // Update cache with fetched balances
      setCache(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          [chainId]: {
            balances,
            timestamp: Date.now(),
            loading: false,
          }
        }
      }));
    } catch (error) {
      console.error(`Failed to fetch token balances for chain ${chainId}:`, error);
      
      // Clear loading state on error
      setCache(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          [chainId]: {
            balances: prev[address]?.[chainId]?.balances || [],
            timestamp: prev[address]?.[chainId]?.timestamp || 0,
            loading: false,
          }
        }
      }));
    } finally {
      setRequestedChains(prev => {
        const newSet = new Set(prev);
        newSet.delete(chainId);
        return newSet;
      });
    }
  }, [address, requestedChains]);

  const value = {
    balances: tokenBalances, // Current chain balances for backward compatibility
    loading,
    error,
    refetch,
    getBalancesForChain,
    fetchBalancesForChain,
    isLoadingChain,
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
