// deno-lint-ignore-file
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { config } from './WalletConnector.tsx';
import ThemedRainbowKitProvider from "./ThemedRainbowKitProvider.tsx";

export function ConnectWallet() {
  return <ConnectButton />
}

export const SimpleWalletConnector = () => {
  const queryClient = new QueryClient();
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; 

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemedRainbowKitProvider>
          <ConnectWallet/>
        </ThemedRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
