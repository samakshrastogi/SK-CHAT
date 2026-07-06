import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useThemeStore } from './store/themeStore.js';
import ChatDashboard from './pages/ChatDashboard.tsx';
import LandingPage from './pages/LandingPage.tsx';
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
      // Use CSS vars so spinner background respects active theme
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" state={{ from: location }} replace />;
}

function App() {
  const { checkAuth } = useAuthStore();
  const { applyTheme, theme } = useThemeStore();

  // Re-apply theme whenever the store's theme value changes
  useEffect(() => {
    applyTheme();
  }, [theme, applyTheme]);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<LandingPage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/register"       element={<RegisterPage />} />
        <Route path="/verify-email"   element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join/:codeOrToken" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />

        {/* Main Dashboard */}
        <Route path="/chat"    element={<ProtectedRoute><ChatDashboard /></ProtectedRoute>} />
        <Route path="/chat/*"  element={<ProtectedRoute><ChatDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/chat" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
