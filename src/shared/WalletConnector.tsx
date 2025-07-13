// deno-lint-ignore-file no-window jsx-button-has-type
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { useSignMessage, useAccount, WagmiProvider, useEnsName, useDisconnect, useEnsAvatar} from 'wagmi';
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
import { uid, type DidString, type MaybeDidString } from './common.ts';
import WalletOptions from './WalletOptions.tsx';
import { serializeSiweAddressControlRecord, writeAddressControlRecord } from './recordWrite.ts';
import type { OAuthSession } from '@atproto/oauth-client-browser';
import { useState } from 'react';
import type { SiweStatementString } from './common.ts';
import AtUriLink from './AtUriLink.tsx'; // added import for the new component
import { createSiweMessage, verifySiweMessage, type SiweMessage } from 'viem/siwe';
import { getEthClient } from "./useTokenBalances.ts";


export const config = getDefaultConfig({
  appName: 'ATProto Wallet Linker',
  projectId: '9314bee13462fde2ec9f13451ea0f01c',
  chains: [mainnet, optimism, arbitrum, base],
});


// Generates a SIWE statement for linking an Ethereum address to a DID.
// the message MUST be in this format in order to be verified by a client.
export const makeSiweStatement = (address: `0x${string}`, did: DidString): SiweStatementString =>
  `Prove control of ${address} to link it to ${did}`;

export const makeSiweMessage = (did: DidString, address: `0x${string}`, chainId: number = 1): SiweMessage => {
  return {
    domain: window.location.host,
    address,
    statement: makeSiweStatement(address, did),
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce: uid(24),
    issuedAt: new Date()
  }
}

const NO_ACCOUNT_ERROR = 'No Ethereum account found for signing message. Please connect your wallet first.';

export const SignMessageComponent = ({ disabled, oauth }: { disabled: boolean, oauth: OAuthSession }) => {
	const account = useAccount();
	const [siweMsg, setSiweMsg] = useState<SiweMessage | null>(null);
	const [verificationError, setVerificationError] = useState<string | null>(null);
	const [successUri, setSuccessUri] = useState<string | null>(null); // new state for writeResponse URI
	disabled = disabled || !account?.address;
  const did = oauth.did;

	const { signMessage } = useSignMessage({
		mutation: {
			onSuccess: async (sig, { message }) => {
        if (!account?.address) 
          return console.error(NO_ACCOUNT_ERROR);
        if (!siweMsg) 
          return console.error('SIWE message is not initialized before signing!');
        if (typeof message !== 'string')
          return console.error('SIWE serialized message is not a string!');

        const chain = chainForId(siweMsg.chainId);
        if(!chain)
          return console.error(`SIWE message is for chain ID ${siweMsg.chainId}, which isn't one of our supported chains.`);

        const client = getEthClient(siweMsg.chainId);
        const verifyResult = await verifySiweMessage(client, {
          message,
          signature: sig,
          domain: siweMsg.domain,
          nonce: siweMsg.nonce,
          address: siweMsg.address,
          time: siweMsg.issuedAt
        });

        if (!verifyResult) {
          console.error('SIWE verification failed.');
          setVerificationError('SIWE verification failed.');
          return;
        }

        console.log('SIWE verification succeeded');
        setVerificationError(null);

        const record = serializeSiweAddressControlRecord(account.address, siweMsg, sig);
        const writeResponse = await writeAddressControlRecord(record, oauth);
        if (writeResponse.success) {
          setSuccessUri(writeResponse.data.uri);  // set the success URI
				}
			}
		}
	});

	const onClick = () => {
		if (!account?.address) {
			alert(NO_ACCOUNT_ERROR);
			return;
		}
		const siwe = makeSiweMessage(did, account.address, account.chainId);
		setSiweMsg(siwe);

		const message = createSiweMessage(siwe);
		signMessage({ message });
	};
  
  return disabled ? null : (
		<>
			<button disabled={disabled} onClick={onClick}>
				Link DID to Wallet
			</button>
			{ verificationError && <VerificationError error={verificationError} /> }
      {/* Render AtUriLink only when writeResponse was successful */}
			{ successUri && <div>
        <p>✅ successfully linked your wallet</p>
        <AtUriLink atUri={successUri as `at://${string}`} caption="view the link's record on your PDS"/>
      </div> }
		</>
	)
};

const VerificationError = ({ error }: { error: string }) => {
  return (
    <div>
      <h3>Verification Error</h3>
      <p>Signature of your Sign in With Ethereum message could not be verified:</p>
      <pre>{JSON.stringify(error, null, 2)}</pre>
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

export const WalletConnector = ({ isAuthenticated, did, oauth }: { isAuthenticated: boolean, did: MaybeDidString | undefined, oauth: OAuthSession }) => {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectWallet/>
        {did && oauth ? (
          <div>
            <SignMessageComponent disabled={!isAuthenticated} oauth={oauth} />
          </div>
        ) : null}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function chainForId(chainId: number): (typeof config)['chains'][number] | undefined{
  return config.chains.find(chain => chain.id === chainId)
}