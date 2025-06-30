import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import LinkerApp from './LinkerApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LinkerApp />
  </StrictMode>,
)
