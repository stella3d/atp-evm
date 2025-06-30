import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { chainForId } from './WalletConnector.tsx';

export interface TokenBalance {
  address: `0x${string}` | 'native';
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  chainId: number;
}

// Common ERC20 tokens for each chain (you can expand this)
const COMMON_TOKENS: Record<number, Array<{address: `0x${string}`, symbol: string, name: string}>> = {
  1: [ // Ethereum mainnet
    { address: '0xA0b86a33E6441C44D0c3b4D00b4e10E9a76e54Cf', symbol: 'USDC', name: 'USD Coin' },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD' },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin' },
  ],
  8453: [ // Base
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin' },
    { address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', symbol: 'DEGEN', name: 'Degen' },
  ],
  10: [ // Optimism
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin' },
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', name: 'Tether USD' },
  ],
  42161: [ // Arbitrum
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin' },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD' },
  ],
};

export const useTokenBalances = (chainId?: number) => {
  const { address, isConnected } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get native token balance using wagmi
  const { data: nativeBalance } = useBalance({
    address,
    chainId,
  });

  useEffect(() => {
    if (!isConnected || !address || !chainId) {
      setTokenBalances([]);
      return;
    }

    const fetchTokenBalances = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const chain = chainForId(chainId);
        if (!chain) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        const client = createPublicClient({
          chain,
          transport: http()
        });

        const balances: TokenBalance[] = [];

        // Add native token balance
        if (nativeBalance) {
          balances.push({
            address: 'native',
            symbol: chain.nativeCurrency.symbol,
            name: chain.nativeCurrency.name,
            balance: formatUnits(nativeBalance.value, nativeBalance.decimals),
            decimals: nativeBalance.decimals,
            chainId,
          });
        }

        // Fetch ERC20 token balances
        const tokens = COMMON_TOKENS[chainId] || [];
        
        for (const token of tokens) {
          try {
            const [balance, decimals, symbol, name] = await Promise.all([
              client.readContract({
                address: token.address,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [address],
              }),
              client.readContract({
                address: token.address,
                abi: erc20Abi,
                functionName: 'decimals',
              }),
              client.readContract({
                address: token.address,
                abi: erc20Abi,
                functionName: 'symbol',
              }),
              client.readContract({
                address: token.address,
                abi: erc20Abi,
                functionName: 'name',
              }),
            ]);

            const formattedBalance = formatUnits(balance as bigint, decimals as number);
            
            // Only include tokens with non-zero balance
            if (parseFloat(formattedBalance) > 0) {
              balances.push({
                address: token.address,
                symbol: symbol as string,
                name: name as string,
                balance: formattedBalance,
                decimals: decimals as number,
                chainId,
              });
            }
          } catch (tokenError) {
            console.warn(`Failed to fetch balance for token ${token.symbol}:`, tokenError);
          }
        }

        setTokenBalances(balances);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch token balances');
        console.error('Error fetching token balances:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenBalances();
  }, [address, chainId, isConnected, nativeBalance]);

  return { tokenBalances, loading, error, refetch: () => {} };
};
