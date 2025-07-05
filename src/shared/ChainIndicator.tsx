import React from 'react';
import { getChainName, getChainColor, getChainClass } from './common.ts';
import './ChainIndicator.css';

// Enum for supported chains
export enum SupportedChain {
  ETHEREUM = 1,
  BASE = 8453,
  OPTIMISM = 10,
  GNOSIS = 100,
  ARBITRUM = 42161,
}

// Chain ID to icon mapping
const CHAIN_ICONS: Record<number, string> = {
  1: '/chain_logos/ethereum.svg',
  8453: '/chain_logos/base.svg',
  10: '⚡', // Optimism - using emoji as fallback
  100: '/chain_logos/gnosis.png', // Gnosis - using emoji as fallback
  42161: '/chain_logos/arbitrum.svg'
};

interface ChainIndicatorProps {
  chainId: number | SupportedChain;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'payment-modal';
  style?: React.CSSProperties;
}

export const ChainIndicator: React.FC<ChainIndicatorProps> = ({
  chainId,
  className = '',
  showIcon = true,
  variant = 'default',
  style
}) => {
  const chainName = getChainName(chainId);
  const chainColor = getChainColor(chainId);
  const chainClass = getChainClass(chainId);
  const chainIcon = CHAIN_ICONS[chainId];

  const baseClasses = `chain-indicator ${chainClass} ${className}`;
  const variantClasses = variant === 'compact' ? 'chain-indicator-compact' : 
                        variant === 'payment-modal' ? 'chain-indicator-payment-modal' : '';

  const defaultStyle: React.CSSProperties = {
    backgroundColor: chainColor,
    color: 'white',
    ...style
  };

  const renderIcon = () => {
    if (!showIcon) return null;

    // Determine icon size based on variant
    const iconSize = variant === 'compact' ? '12px' : 
                    variant === 'payment-modal' ? '16px' : '14px';
    const emojiSize = variant === 'compact' ? '10px' : 
                     variant === 'payment-modal' ? '20px' : '12px';

    // If it's an .svg/.png file, render as img
    if (chainIcon && (chainIcon.endsWith('.svg') || chainIcon.endsWith('.png'))) {
      return (
        <img 
          src={chainIcon} 
          alt={`${chainName} logo`}
          className="chain-indicator-icon"
          style={{ 
            width: iconSize, 
            height: iconSize,
            marginRight: '4px'
          }}
        />
      );
    }

    // If it's an emoji, render as span
    if (chainIcon) {
      return (
        <span 
          className="chain-indicator-emoji"
          style={{ 
            fontSize: emojiSize,
            marginRight: '3px'
          }}
        >
          {chainIcon}
        </span>
      );
    }

    return null;
  };

  return (
    <span 
      className={`${baseClasses} ${variantClasses}`.trim()}
      style={defaultStyle}
    >
      {renderIcon()}
      {chainName}
    </span>
  );
};

// Helper function to get chain ID from enum
export const getChainId = (chain: SupportedChain): number => {
  return chain as number;
};

// Helper function to check if a chain ID is supported
export const isSupportedChain = (chainId: number): chainId is SupportedChain => {
  return Object.values(SupportedChain).includes(chainId as SupportedChain);
};
