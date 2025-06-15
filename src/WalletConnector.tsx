import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { useSignMessage, useAccount, WagmiProvider, useEnsName, /*useDisconnect,*/ useEnsAvatar } from 'wagmi';
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
import WalletOptions from './WalletOptions';
import { createAddressControlRecord, writeAddressControlRecord } from './recordWrite';


export const config = getDefaultConfig({
  appName: 'ATProto Wallet Linker',
  projectId: '9314bee13462fde2ec9f13451ea0f01c',
  chains: [mainnet, optimism, arbitrum, base],
});

export const SignMessageComponent = ({ disabled, did, oauthToken }: { disabled: boolean, did: DidString, oauthToken: string }) => {
  const account = useAccount();
  const { signMessage } = useSignMessage({
    mutation: {
        onSuccess: async (sig) => {
          console.log('message signature', sig);
          if (!account?.address) {
            console.warn('no account found for signing message');
          } else {
            const record = createAddressControlRecord(account.address, sig);
            await writeAddressControlRecord(did, record, 'https://bsky.network', oauthToken);
          }
        }
    }
  })
  
  return (
    <button disabled={disabled} onClick={() => signMessage({ message: `${did} controls ${account.address}` })}>
      Link DID to Wallet
    </button>
  )
};

export function Account() {
  const { address } = useAccount()
  //const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })

  const acctLabel = ensName ? `${ensName} (${address})` : address

  return (
    <div>
      <p>✅ connected on EVM wallet side as:</p>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && <div>{acctLabel}</div>}
      <br/>
    </div>
  )
}

function ConnectWallet() {
  const { isConnected } = useAccount()
  if (isConnected) return <Account />
  return <WalletOptions />
}

export const WalletConnector = ({ isAuthenticated, did, oauthToken }: { isAuthenticated: boolean, did: DidString | undefined, oauthToken?: string }) => {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectWallet />
        {did && oauthToken ? (
          <SignMessageComponent disabled={!isAuthenticated} did={did} oauthToken={oauthToken} />
        ) : null}
      </QueryClientProvider>
    </WagmiProvider>
  );
}