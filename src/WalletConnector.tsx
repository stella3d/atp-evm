import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { useSignMessage, useAccount, WagmiProvider } from 'wagmi';
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

export const SignMessageComponent = () => {
  const account = useAccount();
  const { signMessage } = useSignMessage()

  console.log(account.address);

  return (
    <button onClick={() => signMessage({ message: `I control ${account.address}` })}>
      Sign message
    </button>
  )
};

export const WalletConnector = () => {
    const queryClient = new QueryClient();
    
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <p>the below button should only be usable after OAuth completes</p>
          <SignMessageComponent />
        </QueryClientProvider>
      </WagmiProvider>
    );
}