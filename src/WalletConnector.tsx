import '@rainbow-me/rainbowkit/styles.css';
import {
    ConnectButton,
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  optimism,
  arbitrum,
  base,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";



export const config = getDefaultConfig({
  appName: 'ATProto Wallet Linker',
  projectId: '9314bee13462fde2ec9f13451ea0f01c',
  chains: [mainnet, optimism, arbitrum, base],
});


export const WalletConnector = () => {
    const queryClient = new QueryClient();
    
    return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
            <p>hi, this is the connector skeleton</p>
            <ConnectButton />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
    );
}