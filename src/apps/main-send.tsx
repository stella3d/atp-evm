import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import SendApp from './SendApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SendApp />
  </StrictMode>,
)
