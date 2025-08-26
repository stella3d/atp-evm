import '../App.css'
import AuthLinker from '../shared/AuthLinker.tsx';
import { Link } from 'react-router-dom';

function LinkerApp() {
  return (
    <>
      <h1>@Pay Linker</h1>
      <p>This allows you to link an Ethereum wallet address to your <a href="https://atproto.com/specs/did">ATProto identity</a> in a way that can be cryptographically verified on both sides.</p>
      <b style={{ color: "#ee5f90" }}>Only use this if you are OK with being publicly associated to the linked wallet.</b>
      <p>looking to <Link to="/send" style={{ textDecoration: 'none' }}>send money to an existing user</Link> instead?</p>
      <p></p>
      <AuthLinker />
    </>
  );
}

export default LinkerApp;
