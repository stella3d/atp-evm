import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { ConnectButton, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './WalletConnector.tsx';

export function ConnectWallet() {
  return <ConnectButton />
}

export const SimpleWalletConnector = () => {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ConnectWallet/>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
