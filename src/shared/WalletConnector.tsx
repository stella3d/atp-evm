// deno-lint-ignore-file no-window jsx-button-has-type
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  ConnectButton,
} from '@rainbow-me/rainbowkit';
import { useSignMessage, useAccount, WagmiProvider, http } from 'wagmi';
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
import { serializeSiweAddressControlRecord, writeAddressControlRecord } from './recordWrite.ts';
import type { OAuthSession } from '@atproto/oauth-client-browser';
import { useState, useEffect } from 'react';
import type { SiweStatementString } from './common.ts';
import AtUriLink from './AtUriLink.tsx'; // added import for the new component
import { createSiweMessage, verifySiweMessage, type SiweMessage } from 'viem/siwe';
import { getEthClient } from "./useTokenBalances.ts";
import ThemedRainbowKitProvider from "./ThemedRainbowKitProvider.tsx";
import { ChainIndicator } from './ChainIndicator.tsx';
import { fetchAddressControlRecords } from "./fetch.ts";


export const config = getDefaultConfig({
  appName: '@Pay',
  projectId: '9314bee13462fde2ec9f13451ea0f01c',
  chains: [mainnet, optimism, arbitrum, base],
  transports: {
    [mainnet.id]: http(undefined, { batch: true, retryCount: 0 }),
    [optimism.id]: http(undefined, { batch: true, retryCount: 0 }),
    [arbitrum.id]: http(undefined, { batch: true, retryCount: 0 }),
    [base.id]: http(undefined, { batch: true, retryCount: 0 }),
  }
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

export const isWalletAlreadyLinked = async (did: DidString, pds: string, addr: `0x${string}`): Promise<boolean> => {
  const userRecords = await fetchAddressControlRecords(did, pds);
  return userRecords.some(r => r.value.siwe.address === addr);
}

const NO_ACCOUNT_ERROR = 'No Ethereum account found for signing message. Please connect your wallet first.';

export const SignMessageComponent = ({ disabled, oauth }: { disabled: boolean, oauth: OAuthSession }) => {
	const account = useAccount();
	const [siweMsg, setSiweMsg] = useState<SiweMessage | null>(null);
	const [verificationError, setVerificationError] = useState<string | null>(null);
	const [successUri, setSuccessUri] = useState<string | null>(null); // new state for writeResponse URI
  const [showMainnetTip, setShowMainnetTip] = useState<boolean>(false);
  const [alsoOn, setAlsoOn] = useState<Set<number>>(new Set<number>());
	disabled = disabled || !account?.address;
  const did = oauth.did;

  // Show a gentle info toast if connected to Ethereum mainnet (chainId 1)
  useEffect(() => {
    if (account?.chainId === 1) {
      setShowMainnetTip(true);
    } else {
      setShowMainnetTip(false);
    }
  }, [account?.chainId]);

  // Ensure the current primary chain isn't included in alsoOn
  useEffect(() => {
    if (!account?.chainId) return;
    setAlsoOn(prev => {
      const next = new Set(prev);
      if (typeof account.chainId === 'number') next.delete(account.chainId);
      return next;
    });
  }, [account?.chainId]);

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

        const alsoOnArray: undefined | number[] = alsoOn.size > 0 ? Array.from(alsoOn) : undefined;
        const record = serializeSiweAddressControlRecord(account.address, alsoOnArray, siweMsg, sig);
        // include optional alsoOn chains as an array to comply with the lexicon schema
        if (alsoOn.size > 0) {
          record.alsoOn = Array.from(alsoOn);
        }
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
      {showMainnetTip && (
        <div id="mainnet-warning"
          style={{
            margin: '4px auto',
            padding: '4px 6px',
            borderRadius: '8px',
            border: '1px solid #f59e0b',
            background: '#2a1f00',
            color: '#fbd38d',
            textAlign: 'center',
            maxWidth: 560
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, flex: 1, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <p>
                You’re setting your default chain to receive funds on as
                <ChainIndicator chainId={1} variant="compact" /> mainnet.
              </p>
              <p>
                A rollup chain like
                <ChainIndicator chainId={8453} variant="compact" />,
                <ChainIndicator chainId={10} variant="compact" />, or
                <ChainIndicator chainId={42161} variant="compact" /> is much cheaper to use. Consider switching networks before linking.
              </p>
            </span>
          </div>
        </div>
      )}
      {/* alsoOn chain selection checkboxes (always visible, exclude primary) */}
      <div style={{ margin: '10px auto 12px', maxWidth: 640, textAlign: 'center' }}>
        <div style={{ marginBottom: 6, fontSize: 13, color: '#ddd' }}>Check all other chains you accept funds on. Leave this blank if you don't know.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 1, label: 'Ethereum' },
            { id: 8453, label: 'Base' },
            { id: 10, label: 'Optimism' },
            { id: 42161, label: 'Arbitrum' },
          ]
            .filter(({ id }) => id !== account?.chainId)
            .map(({ id }) => (
              <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={alsoOn.has(id)}
                  onChange={(e) => {
                    setAlsoOn(prev => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(id); else next.delete(id);
                      return next;
                    });
                  }}
                />
                <ChainIndicator chainId={id} variant="compact" />
              </label>
            ))}
        </div>
        <br/>
      </div>
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

export function ConnectWallet({ prompt, successText }: { prompt?: string, successText?: string }) {
  const { address } = useAccount();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* only show the prompt if there's no connected wallet address */}
      {!address && prompt && <p style={{ marginBottom: '8px' }}>{prompt}</p>}
      {/* show successText if specified and connected */}
      {address && successText && <p style={{ marginBottom: '8px' }}>{successText}</p>}
      {/* insert <br/> if no successText and connected */}
      {address && !successText && <br />}
      <ConnectButton showBalance={false} accountStatus="address" chainStatus="full" />
    </div>
  );
}

export const WalletConnector = ({ isAuthenticated, did, oauth }: { isAuthenticated: boolean, did: MaybeDidString | undefined, oauth: OAuthSession }) => {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <ConnectWallet prompt="Please connect your wallet to continue." successText="Wallet connected successfully!" />
      </div>
      {did && oauth ? (
        <div>
          <SignMessageComponent disabled={!isAuthenticated} oauth={oauth} />
        </div>
      ) : null}
    </>
  );
}

export function chainForId(chainId: number): (typeof config)['chains'][number] | undefined{
  return config.chains.find(chain => chain.id === chainId)
}