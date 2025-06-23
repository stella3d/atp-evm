import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { useSignMessage, useAccount, WagmiProvider, useEnsName, useDisconnect, useEnsAvatar } from 'wagmi';
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
import { uid, type DidString } from './common';
import WalletOptions from './WalletOptions';
import { createAddressControlRecord, writeAddressControlRecord } from './recordWrite';
import type { OAuthSession } from '@atproto/oauth-client-browser';
import type { Address } from 'viem';
import { SiweMessage, type SiweResponse } from 'siwe'
import { useState } from 'react';


export const config = getDefaultConfig({
  appName: 'ATProto Wallet Linker',
  projectId: '9314bee13462fde2ec9f13451ea0f01c',
  chains: [mainnet, optimism, arbitrum, base],
});

const makeSiweMessage = (address: Address, chainId: number = 1): SiweMessage => {
  return new SiweMessage({
    domain: window.location.host,
    address,
    statement: `Prove control of address ${address} to link your wallet to your DID.`,
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce: uid(48),
  })
}

const NO_ACCOUNT_ERROR = 'No Ethereum account found for signing message. Please connect your wallet first.';

export const SignMessageComponent = ({ disabled, did, oauth }: { disabled: boolean, did: DidString, oauth: OAuthSession }) => {
	const account = useAccount();
	const [siweMsg, setSiweMsg] = useState<SiweMessage | null>(null);
	// Added state to track verification error.
	const [verificationError, setVerificationError] = useState<SiweResponse | null>(null);
	disabled = disabled || !account?.address;

	const { signMessage } = useSignMessage({
		mutation: {
			onSuccess: async (sig) => {
				console.log('message signature', sig);

				if (!account?.address) {
					console.warn(NO_ACCOUNT_ERROR);
				} else {
					if (!siweMsg) {
						console.error('SIWE message is not initialized before signing!');
					} else {
						const verifyResult = await siweMsg.verify({
						  signature: sig, 
							domain: siweMsg.domain
						});

						console.log('SIWE verification result:', verifyResult);
            // Set verification error if verification failed.
						if (!verifyResult.success) {
							setVerificationError(verifyResult);
						} else {
							setVerificationError(null);
						}
					}

					const record = createAddressControlRecord(account.address, sig);
					await writeAddressControlRecord(did, record, 'https://bsky.network', oauth);
				}
			}
		}
	});

	const onClick = () => {
		if (!account?.address) {
			alert(NO_ACCOUNT_ERROR);
			return;
		}
		const siwe = makeSiweMessage(account.address, account.chainId);
		setSiweMsg(siwe);

		const message = siwe.prepareMessage();
		signMessage({ message });
	};

	return disabled ? <></> : (
		<>
			<button disabled={disabled} onClick={onClick}>
				Link DID to Wallet
			</button>
			{/* Render VerificationError only when verification fails */}
			{verificationError && <VerificationError siwe={verificationError} />}
		</>
	)
};

const VerificationError = ({ siwe }: { siwe: SiweResponse }) => {
  return (
    <div>
      <h3>Verification Error</h3>
      <p>Signature of your Sign in With Ethereum message could not be verified:</p>
      <pre>{JSON.stringify(siwe.error, null, 2)}</pre>
    </div>
  );
};

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

export const WalletConnector = ({ isAuthenticated, did, oauth }: { isAuthenticated: boolean, did: DidString | undefined, oauth: OAuthSession }) => {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectWallet/>
        {did && oauth ? (
          <div>
            <SignMessageComponent disabled={!isAuthenticated} did={did} oauth={oauth} />
          </div>
        ) : null}
      </QueryClientProvider>
    </WagmiProvider>
  );
}