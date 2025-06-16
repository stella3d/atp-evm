import './App.css'
import AuthLinker from './AuthLinker';

function App() {
  return (
    <>
      <h1>ATProto Wallet Linker</h1>
      <b>Only use this if you are OK with being publicly associated to the linked wallet.</b>
      <p>A security & privacy guide will accompany a production release.</p>
      <br/>
      <AuthLinker />
    </>
  );
}

export default App;
