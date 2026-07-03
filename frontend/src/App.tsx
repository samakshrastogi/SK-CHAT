import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useThemeStore } from './store/themeStore.js';
import ChatDashboard from './pages/ChatDashboard.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import VerifyEmailPage from './pages/VerifyEmailPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import JoinGroupPage from './pages/JoinGroupPage.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" state={{ from: location }} replace />;
}

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join/:codeOrToken" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />
        
        {/* Render the Dashboard directly on the root path and sub-paths */}
        <Route path="/" element={<ProtectedRoute><ChatDashboard /></ProtectedRoute>} />
        <Route path="/chat/*" element={<ProtectedRoute><ChatDashboard /></ProtectedRoute>} />
        
        {/* Fallback routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
