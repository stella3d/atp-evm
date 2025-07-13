import React from 'react';

interface TransactionHashProps {
  txHash: string;
  isClickable?: boolean;
  href?: string;
  className?: string;
}

export const shortenTxHash = (txHash: string): string => {
  if (txHash.length <= 16) return txHash;
  return `${txHash.slice(0, 14)}...${txHash.slice(-12)}`;
};

export const TransactionHash: React.FC<TransactionHashProps> = ({
  txHash,
  isClickable = false,
  href,
  className = ''
}) => {
  const content = (
    <code 
      style={{ fontSize: '16px', fontWeight: '640' }}
      title={txHash} // This provides the hover tooltip
    >
      {shortenTxHash(txHash)}
    </code>
  );

  if (isClickable && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return content;
};
