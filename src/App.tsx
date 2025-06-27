import './App.css'
import AuthLinker from './AuthLinker.tsx';

function App() {
  return (
    <>
      <h1>ATProto Wallet Linker</h1>
      <p>This allows you to link an Ethereum wallet address to your <a href="https://atproto.com/specs/did">ATProto DID</a> in a way that can be cryptographically verified on both sides.</p>
      <b style={{ color: "#ee5f90" }}>Only use this if you are OK with being publicly associated to the linked wallet.</b>
      <p>It works by writing a record to your PDS that contains the wallet address and a Sign In With Ethereum message from the wallet.</p>
      <br/>
      <AuthLinker />
    </>
  );
}

export default App;
