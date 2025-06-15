import { useState } from 'react'
import './App.css'
import { WalletConnector } from './WalletConnector'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>stellz React app</h1>
      <WalletConnector />
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App
