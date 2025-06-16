import * as React from 'react'
import { type Connector, type CreateConnectorFn, useConnect } from 'wagmi'

export default function WalletOptions() {
  const { connectors, connect } = useConnect()
  //console.log('All connectors:', connectors);

  // wagmi shows a bunch of duplicates for some reason, so we filter them out.
  let allowedConnectors: Connector<CreateConnectorFn>[] = [];
  connectors.forEach((connector) => {
    if (connector.name === 'Safe' && connector.id === 'safe') {
      allowedConnectors.push(connector);
      return;
    }
    // wagmi shows 2 Metamask connectors sometimes, idk why
    if (connector.name === 'MetaMask') {
      if (connector.id === 'io.metamask') {
        allowedConnectors.push(connector);
      }
      return;
    } 
    // wagmi usually shows a bunch of WalletConnect connectors, but only this one seems to work.
    if (connector.name === 'WalletConnect') {
      if ((connector['rkDetails'] as any)['isWalletConnectModalConnector']) {
        allowedConnectors.push(connector);
      } 
      return;
    } 
    if (connector.id === 'coinbaseWalletSDK') {
      // we can add this back if people ask, but for now, we're not promoting Coinbase.
    } else {
      // allow other connectors by default
      allowedConnectors.push(connector);
    }
  });

  //console.log('Allowed Connectors:', allowedConnectors);

  return (
    <div>
      <p>Please choose a wallet type to connect.</p>
      {allowedConnectors.map((connector) => (
        <WalletOption
          key={connector.uid}
          connector={connector}
          onClick={() => connect({ connector })}
        />
      ))}
    </div>
  )
}

function WalletOption({
  connector,
  onClick,
}: {
  connector: Connector
  onClick: () => void
}) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      const provider = await connector.getProvider()
      setReady(!!provider)
    })()
  }, [connector])

  return (
    <button disabled={!ready} onClick={onClick}>
      {connector.name}
    </button>
  )
}