import '../App.css'
import AuthLinker from '../shared/AuthLinker.tsx';

function LinkerApp() {
  return (
    <>
      <h1>ATProto Wallet Linker</h1>
      <p>
        <a href="/send" style={{
          display: 'inline-block',
          padding: '10px 14px',
          backgroundColor: '#2563eb',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 700
        }}>
          Go to @Pay (Send)
        </a>
      </p>
      <p>This allows you to link an Ethereum wallet address to your <a href="https://atproto.com/specs/did">ATProto identity</a> in a way that can be cryptographically verified on both sides.</p>
      <b style={{ color: "#ee5f90" }}>Only use this if you are OK with being publicly associated to the linked wallet.</b>
      <p>It works by writing a record to your PDS that contains the wallet address and a Sign In With Ethereum message from the wallet.</p>
      <AuthLinker />
    </>
  );
}

export default LinkerApp;
