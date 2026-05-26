import { isAddress } from "viem/utils";
import { useEnsName } from "wagmi";
import { AddressLink } from "./AddressLink.tsx";

export interface EnrichedEthAddressProps {
  address: `0x${string}`;
  caption?: string;
  className?: string;
}

export const EnrichedEthAddress: React.FC<EnrichedEthAddressProps> = ({
  address,
  caption,
  className = undefined
}: EnrichedEthAddressProps) => {
  const { data: ensName } = useEnsName({
	address: isAddress(address) ? address : undefined,
	chainId: 1, 
    query: {
      retry: false,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
    }
  });

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
