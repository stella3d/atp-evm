import React from 'react';

interface AddressLinkProps {
  address: `0x${string}`;
  className?: string;
  children?: React.ReactNode;
  showFullAddress?: boolean;
  monospace?: boolean;
}

export const AddressLink: React.FC<AddressLinkProps> = ({
  address,
  className = '',
  children,
  showFullAddress = true,
  monospace = true
}) => {
  // Validate that the address is a proper 42-character hex string
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.warn('AddressLink: Invalid Ethereum address provided:', address);
    return <span className={className}>{children || address}</span>;
  }

  const ondoraUrl = `https://www.ondora.xyz/accounts/${address}/all`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    globalThis.open(ondoraUrl, '_blank');
  };

  const displayText = children || (showFullAddress ? address : `${address.slice(0, 6)}...${address.slice(-4)}`);

  const content = monospace ? (
    <code>{displayText}</code>
  ) : (
    displayText
  );

  return (
    <a
      href={ondoraUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`address-link ${className}`}
      onClick={handleClick}
      title={`View ${address} on Ondora`}
    >
      {content}
    </a>
  );
};
