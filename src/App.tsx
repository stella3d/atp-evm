import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LinkerApp from './apps/LinkerApp.tsx';
import SendApp from './apps/SendApp.tsx';

function App() {
  return (
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
  );
}

export default App;
