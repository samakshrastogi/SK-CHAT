import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useThemeStore } from './store/themeStore.js';
import ChatDashboard from './pages/ChatDashboard.tsx';

function App() {
  const { checkAuth } = useAuthStore();
  const { applyTheme } = useThemeStore();

  useEffect(() => {
    // Apply application visual themes
    applyTheme();
    // Silently synchronize profile details
    checkAuth();
  }, [checkAuth, applyTheme]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Render the Dashboard directly on the root path and sub-paths */}
        <Route path="/" element={<ChatDashboard />} />
        <Route path="/chat/*" element={<ChatDashboard />} />
        
        {/* Fallback routes also redirect straight to dashboard */}
        <Route path="*" element={<ChatDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
