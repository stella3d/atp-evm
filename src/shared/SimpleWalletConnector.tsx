// deno-lint-ignore-file
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { ConnectButton, lightTheme, midnightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './WalletConnector.tsx';

export function ConnectWallet() {
  return <ConnectButton />
}

export const SimpleWalletConnector = () => {
  const queryClient = new QueryClient();
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; 

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={isDarkMode ? midnightTheme() : lightTheme()}>
          <ConnectWallet/>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
