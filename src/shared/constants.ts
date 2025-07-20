
export const appName = '@Pay';

// Chain ID to friendly name mapping
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  10: 'Optimism',
  100: 'Gnosis',
  42161: 'Arbitrum'
};

// Chain ID to brand color mapping
export const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA',     // Ethereum - blue
  8453: 'rgb(0, 82, 255)',  // Base - blue
  10: '#ff0420',    // Optimism - red
  100: 'rgb(62, 105, 87)', // Gnosis Chain - dark green
  42161: '#213147'  // Arbitrum - dark blue/gray
};