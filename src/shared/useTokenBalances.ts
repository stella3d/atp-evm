import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { chainForId } from './WalletConnector.tsx';

export interface TokenBalance {
  address: `0x${string}` | 'native';
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  chainId: number;
  logoUrl?: string;
}

const isProd = import.meta.env.PROD;
const prefix = isProd ? '' : '/public';

const ETH_LOGO_URL = `${prefix}/token_logos/eth.png`;
const USDC_LOGO_URL = `${prefix}/token_logos/usdc.png`;
const USDT_LOGO_URL = `${prefix}/token_logos/usdt.png`;
const DAI_LOGO_URL = `${prefix}/token_logos/dai.png`;

// Common ERC20 tokens for each chain (you can expand this)
const COMMON_TOKENS: Record<number, Array<{address: `0x${string}`, symbol: string, name: string, decimals: number, logoUrl: string}>> = {
  1: [ // Ethereum mainnet
    { 
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 
      symbol: 'USDC', 
      name: 'USD Coin',
      decimals: 6,
      logoUrl: USDC_LOGO_URL
    },
    { 
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', 
      symbol: 'USDT', 
      name: 'Tether USD',
      decimals: 6,
      logoUrl: USDT_LOGO_URL
    },
    { 
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', 
      symbol: 'DAI', 
      name: 'Dai Stablecoin',
      decimals: 18,
      logoUrl: DAI_LOGO_URL
    },
	{
		address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
		symbol: 'EURC',
		name: 'Euro Coin',
		decimals: 6,
		logoUrl: `${prefix}/token_logos/eurc.png`
	}
  ],
  8453: [ // Base
    { 
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 
      symbol: 'USDC', 
      name: 'USD Coin',
      decimals: 6,
      logoUrl: USDC_LOGO_URL
    },
    { 
      address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', 
      symbol: 'DEGEN', 
      name: 'Degen',
      decimals: 18,
      logoUrl: 'https://assets.coingecko.com/coins/images/34515/small/degen.png'
    },
  ],
  10: [ // Optimism
    { 
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 
      symbol: 'USDC', 
      name: 'USD Coin',
      decimals: 6,
      logoUrl: USDC_LOGO_URL
    },
    { 
      address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', 
      symbol: 'USDT', 
      name: 'Tether USD',
      decimals: 6,
      logoUrl: USDT_LOGO_URL
    },
  ],
  42161: [ // Arbitrum
    { 
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 
      symbol: 'USDC', 
      name: 'USD Coin',
      decimals: 6,
      logoUrl: USDC_LOGO_URL
    },
    { 
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 
      symbol: 'USDT', 
      name: 'Tether USD',
      decimals: 6,
      logoUrl: USDT_LOGO_URL
    },
  ],
};

// Helper function to get native token logos
const getNativeTokenLogo = (chainId: number): string => {
  const logoMap: Record<number, string> = {
    1: ETH_LOGO_URL, // Ethereum
    8453: ETH_LOGO_URL, // Base (uses ETH)
    10: ETH_LOGO_URL, // Optimism (uses ETH)
    42161: ETH_LOGO_URL, // Arbitrum (uses ETH)
  };
  return logoMap[chainId] || ETH_LOGO_URL;
};

// Helper function to fetch native token balance
const fetchNativeBalance = async (
  client: { getBalance: (args: { address: `0x${string}` }) => Promise<bigint> },
  address: `0x${string}`,
  chain: { nativeCurrency: { symbol: string; name: string; decimals: number } },
  chainId: number
): Promise<TokenBalance> => {
  try {
    const nativeBalance = await client.getBalance({ address });
    return {
      address: 'native' as const,
      symbol: chain.nativeCurrency.symbol,
      name: chain.nativeCurrency.name,
      balance: formatUnits(nativeBalance, chain.nativeCurrency.decimals),
      decimals: chain.nativeCurrency.decimals,
      chainId,
      logoUrl: getNativeTokenLogo(chainId),
    };
  } catch (nativeError) {
    console.warn('failed to fetch native balance:', nativeError);
    // Still add native token with 0 balance if fetch fails
    return {
      address: 'native' as const,
      symbol: chain.nativeCurrency.symbol,
      name: chain.nativeCurrency.name,
      balance: '0',
      decimals: chain.nativeCurrency.decimals,
      chainId,
      logoUrl: getNativeTokenLogo(chainId),
    };
  }
};

export const useTokenBalances = (address?: `0x${string}`, chainId?: number) => {
  const { isConnected } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenBalances = async () => {
    if (!isConnected || !address || !chainId) {
      setTokenBalances([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const chain = chainForId(chainId);
      if (!chain) {
        throw new Error(`unsupported chain ID: ${chainId}`);
      }

      const client = createPublicClient({
        chain,
        transport: http()
      });

      const balances: TokenBalance[] = [];

      // Fetch ERC20 token balances in batches
      const tokens = COMMON_TOKENS[chainId] || [];
      const batchSize = 4;

      for (let i = 0; i < tokens.length; i += batchSize) {
        let promises: Promise<TokenBalance | null>[] = [];
        // If it's the first batch, add native token balance promise
        if (i === 0) {
          promises.push(fetchNativeBalance(client, address, chain, chainId));
        }
        
        const batch = tokens.slice(i, i + batchSize);
        const erc20Batch = batch.map(async (token) => {
          try {
            const balance = await client.readContract({
              address: token.address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            });
            const formattedBalance = formatUnits(balance as bigint, token.decimals);
            if (parseFloat(formattedBalance) > 0) {
              return {
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                balance: formattedBalance,
                decimals: token.decimals,
                chainId,
                logoUrl: token.logoUrl,
              };
            }
          } catch (tokenError) {
            console.warn(`failed to fetch balance for token ${token.symbol}:`, tokenError);
          }
          return null;
        });

        promises.push(...erc20Batch);

        const results = await Promise.all(promises);
        results.forEach((result) => {
          if (result) balances.push(result);
        });
      }

      // Handle case where there are no ERC20 tokens to fetch, so we only fetch native
      if (tokens.length === 0) {
        const nativeBalance = await fetchNativeBalance(client, address, chain, chainId);
        balances.push(nativeBalance);
      }

      setTokenBalances(balances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token balances');
      console.error('error fetching token balances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenBalances();
  }, [address, chainId, isConnected]);

  return { tokenBalances, loading, error, refetch: fetchTokenBalances };
};
