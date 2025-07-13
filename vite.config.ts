import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Custom domain serves from root
  server: { 
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['wallet-link.stellz.club', '127.0.0.1', '0.0.0.0', 'b254f3f3fffe.ngrok-free.app'] 
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
