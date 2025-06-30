// deno-lint-ignore-file jsx-button-has-type
import '@rainbow-me/rainbowkit/styles.css';
import { useAccount, WagmiProvider, useEnsName, useDisconnect, useEnsAvatar} from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import WalletOptions from './WalletOptions.tsx';
import { config } from './WalletConnector.tsx';

export function Account() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })

  const acctLabel = ensName ? `${ensName} (${address})` : address

  return (
    <div>
      <p>✅ connected on EVM wallet side as:</p>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && <div>{acctLabel}</div>}
      <br/>
      <button onClick={() => disconnect()}>Disconnect Wallet</button>
      <br/>
      <br/>
    </div>
  )
}

export function ConnectWallet() {
  const { isConnected } = useAccount()
  if (isConnected) return <Account />
  return <WalletOptions />
}

export const SimpleWalletConnector = () => {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectWallet/>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
