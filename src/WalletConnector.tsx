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
import type { DidString } from './common';


export const config = getDefaultConfig({
  appName: 'ATProto Wallet Linker',
  projectId: '9314bee13462fde2ec9f13451ea0f01c',
  chains: [mainnet, optimism, arbitrum, base],
});

export const SignMessageComponent = ({ disabled, did }: { disabled: boolean, did: DidString }) => {
  const account = useAccount();
  const { signMessage } = useSignMessage()

  console.log('SignMessageComponent state:', { disabled, did, address: account.address });

  return (
    <button disabled={disabled} onClick={() => signMessage({ message: `${did} controls ${account.address}` })}>
      Link DID to Wallet
    </button>
  )
};

export const WalletConnector = ({ isAuthenticated, did }: { isAuthenticated: boolean, did: DidString | undefined }) => {
  const queryClient = new QueryClient();

  console.log(`DID in WalletConnector: ${did}`);
    
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {did ? <SignMessageComponent disabled={!isAuthenticated} did={did} /> : null}
      </QueryClientProvider>
    </WagmiProvider>
  );
}