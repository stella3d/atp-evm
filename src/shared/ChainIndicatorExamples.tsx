import React from 'react';
import { ChainIndicator, SupportedChain } from './ChainIndicator.tsx';

// Example usage of the ChainIndicator component
export const ChainIndicatorExamples: React.FC = () => {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3>Chain Indicator Examples</h3>
      
      <div>
        <h4>Using Chain IDs:</h4>
        <ChainIndicator chainId={1} />
        <ChainIndicator chainId={8453} />
        <ChainIndicator chainId={10} />
        <ChainIndicator chainId={100} />
        <ChainIndicator chainId={42161} />
      </div>
      
      <div>
        <h4>Using Enum:</h4>
        <ChainIndicator chainId={SupportedChain.ETHEREUM} />
        <ChainIndicator chainId={SupportedChain.BASE} />
        <ChainIndicator chainId={SupportedChain.OPTIMISM} />
        <ChainIndicator chainId={SupportedChain.GNOSIS} />
        <ChainIndicator chainId={SupportedChain.ARBITRUM} />
      </div>
      
      <div>
        <h4>Compact Variant:</h4>
        <ChainIndicator chainId={1} variant="compact" />
        <ChainIndicator chainId={8453} variant="compact" />
        <ChainIndicator chainId={10} variant="compact" />
      </div>
      
      <div>
        <h4>Without Icons:</h4>
        <ChainIndicator chainId={1} showIcon={false} />
        <ChainIndicator chainId={8453} showIcon={false} />
        <ChainIndicator chainId={10} showIcon={false} />
      </div>
      
      <div>
        <h4>Custom Styling:</h4>
        <ChainIndicator 
          chainId={1} 
          style={{ fontSize: '16px', padding: '4px 8px' }}
          className="custom-chain-indicator"
        />
      </div>
    </div>
  );
};
