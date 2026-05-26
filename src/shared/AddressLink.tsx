import React from 'react';
import { getBlockExplorerAccountUrl } from './common.ts';

interface AddressLinkProps {
  address: string;
  className?: string;
  children?: React.ReactNode;
  showFullAddress?: boolean;
  monospace?: boolean;
  fontSize?: string | number;
  color?: string;
  style?: React.CSSProperties;
  chainId?: number; // Optional chainId to link to the correct explorer
}

export const AddressLink: React.FC<AddressLinkProps> = ({
  address,
  className = '',
  children,
  showFullAddress = true,
  monospace = true,
  fontSize,
  color,
  style,
  chainId = 1
}) => {
  // Validate that the address is a proper 42-character hex string
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.warn('AddressLink: Invalid Ethereum address provided:', address);
    return <span className={className}>{children || address}</span>;
  }

  const explorerUrl = getBlockExplorerAccountUrl(address, chainId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    globalThis.open(explorerUrl, '_blank');
  };

  const displayText = children || (showFullAddress ? address : `${address.slice(0, 6)}...${address.slice(-4)}`);

  const content = monospace ? (
    <code>{displayText}</code>
  ) : (
    displayText
  );

  // Combine custom styles with fontSize and color props
  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(fontSize && { fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize }),
    ...(color && { color })
  };

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`address-link ${className}`}
      onClick={handleClick}
      title={`View ${address} on block explorer`}
      style={combinedStyle}
    >
      {content}
    </a>
  );
};
