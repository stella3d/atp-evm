import './App.css'
import OauthUI from './oauthUI'
import { WalletConnector } from './WalletConnector'

function App() {
  return (
    <>
      <h1>ATProto Wallet Linker</h1>
      <OauthUI />
      <WalletConnector />
    </>
  )
}

export default App
