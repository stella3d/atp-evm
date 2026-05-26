import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './shared/WalletConnector.tsx';
import { TokenBalancesProvider } from './shared/TokenBalanceProvider.tsx';
import ThemedRainbowKitProvider from "./shared/ThemedRainbowKitProvider.tsx";

import LinkerApp from './apps/LinkerApp.tsx';
import SendApp from './apps/SendApp.tsx';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemedRainbowKitProvider>
          <TokenBalancesProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LinkerApp />} />
                <Route path="/send" element={<SendApp />} />
                <Route path="/atpay" element={<SendApp />} />
                {/* Back-compat: redirect any stray index.html access to root */}
                <Route path="/index.html" element={<Navigate to="/" replace />} />
                {/* Fallback to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TokenBalancesProvider>
        </ThemedRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
