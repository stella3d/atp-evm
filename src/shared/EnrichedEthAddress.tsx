import { isAddress } from "viem/utils";
import { useState, useEffect } from "react";
import { AddressLink } from "./AddressLink.tsx";
import { getEthClient } from "./useTokenBalances.ts";
import { LocalstorageTtlCache } from "./LocalstorageTtlCache.ts";

export interface EnrichedEthAddressProps {
  address: `0x${string}`;
  caption?: string;
  className?: string;
}

// Cache ENS names for 24 hours (cache both string names and null for failures/no-name)
const ensCache = new LocalstorageTtlCache<string | null>(24 * 60 * 60 * 1000);

export const EnrichedEthAddress: React.FC<EnrichedEthAddressProps> = ({
  address,
  caption,
  className = undefined
}: EnrichedEthAddressProps) => {
  const [ensName, setEnsName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAddress(address)) return;

    const cacheKey = `ens:${address.toLowerCase()}`;
    const cached = ensCache.get(cacheKey);
    
    // If it's explicitly in the cache (even as null, meaning no name or failed previously)
    if (cached !== undefined) {
      setEnsName(cached);
      return;
    }

    let isMounted = true;
    const fetchEns = async () => {
      try {
        const client = getEthClient(1); // ENS is on mainnet (chainId 1)
        const name = await client.getEnsName({ address });
        
        if (isMounted) {
          setEnsName(name);
          ensCache.set(cacheKey, name);
        }
      } catch (e) {
        console.warn('Failed to fetch ENS name for', address, e);
        if (isMounted) {
          // Cache null to prevent retries on failures (like 429 rate limits)
          ensCache.set(cacheKey, null);
        }
      }
    };

    fetchEns();

    return () => {
      isMounted = false;
    };
  }, [address]);

  return (
	<div>
	  <AddressLink address={address} className={className}/>
	  {ensName && (
		<div className="ens-info">
		  {caption && (
			<div className="ens-header">{caption}</div>
		  )}
		  <div className="ens-name">
			<span className="ens-value">{ensName}</span>
		  </div>
		</div>
	  )}
	</div>
  );
};
