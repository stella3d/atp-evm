import React from 'react';
import { AddressLink } from '../../shared/AddressLink.tsx';
import { AtprotoUserCard, UserCardVariant } from '../../shared/AtprotoUserCard.tsx';
import { ChainIndicator } from '../../shared/ChainIndicator.tsx';
import { useEnsName } from 'wagmi';
import { isAddress } from 'viem';

interface RecipientInfoProps {
  recipientAddress: `0x${string}`;
  recipientName?: string;
  recipientHandle?: string;
  recipientAvatar?: string;
  recipientDid?: string;
  chainId: number;
}

export const RecipientInfo: React.FC<RecipientInfoProps> = ({
  recipientAddress,
  recipientName,
  recipientHandle,
  recipientAvatar,
  recipientDid,
  chainId
}) => {
  // Get ENS name for the recipient address
  const { data: ensName } = useEnsName({
    address: isAddress(recipientAddress) ? recipientAddress : undefined,
    chainId: 1, // ENS is on mainnet
  });

  return (
    <div className="recipient-section">
      <label>Recipient on <ChainIndicator chainId={chainId} variant="payment-modal" /></label>
      <div className="recipient-address-display">
        <AddressLink address={recipientAddress} className="recipient-input" />
      </div>
      {ensName && (
        <div className="ens-info">
          <div className="ens-header">also known as</div>
          <div className="ens-name">
            <span className="ens-value">{ensName}</span>
          </div>
        </div>
      )}
      {(recipientName || recipientHandle) && (
        <div className="recipient-info">
          <div className="recipient-header">which is controlled by</div>
          <AtprotoUserCard
            name={recipientName}
            handle={recipientHandle}
            did={recipientDid}
            avatar={recipientAvatar}
            clickable={!!recipientHandle}
            variant={UserCardVariant.PAYMENT}
            showDid
          />
        </div>
      )}
    </div>
  );
};
