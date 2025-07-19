import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateDevClientMetadata } from './scripts/generate-dev-client-metadata.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    generateDevClientMetadata()
  ],
  base: '/', // Custom domain serves from root
  server: { 
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['wallet-link.stellz.club', '127.0.0.1'] 
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        send: './send.html',
        atpay: './atpay.html',
      }
    }
  }
})
