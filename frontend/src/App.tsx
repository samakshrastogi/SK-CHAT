import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useThemeStore } from './store/themeStore.js';
const ChatDashboard = lazy(() => import('./pages/ChatDashboard.tsx'));
import LandingPage from './pages/LandingPage.tsx';
import { getCentralSessionState, redirectToCentralLogin } from './api/centralAuth.js';
import RegisterPage from './pages/RegisterPage.tsx';
import VerifyEmailPage from './pages/VerifyEmailPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import JoinGroupPage from './pages/JoinGroupPage.tsx';

const DashboardRoute = () => (
  <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading Connect…</div>}>
    <ChatDashboard />
  </Suspense>
);

function CentralLoginRedirect() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) redirectToCentralLogin();
  }, [isAuthenticated, isLoading]);

  return isAuthenticated
    ? <Navigate to="/chat" replace />
    : <div className="min-h-screen grid place-items-center bg-slate-950 text-white font-bold">Connecting to SK Central...</div>;
}
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
  const { checkAuth, clearLocalSession, isAuthenticated } = useAuthStore();
  const { applyTheme, theme } = useThemeStore();

  // Re-apply theme whenever the store's theme value changes
  useEffect(() => {
    applyTheme();
  }, [theme, applyTheme]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let checkInFlight = false;

    const verifyCentralSession = async () => {
      if (checkInFlight) return;
      checkInFlight = true;
      const active = await getCentralSessionState();
      checkInFlight = false;
      if (active === false) await clearLocalSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void verifyCentralSession();
    };

    void verifyCentralSession();
    window.addEventListener('focus', verifyCentralSession);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = window.setInterval(verifyCentralSession, 30_000);
    return () => {
      window.removeEventListener('focus', verifyCentralSession);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [clearLocalSession, isAuthenticated]);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<LandingPage />} />
        <Route path="/login"          element={<CentralLoginRedirect />} />
        <Route path="/register"       element={<CentralLoginRedirect />} />
        <Route path="/verify-email"   element={<CentralLoginRedirect />} />
        <Route path="/reset-password" element={<CentralLoginRedirect />} />
        <Route path="/join/:codeOrToken" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />

        {/* Main Dashboard */}
        <Route path="/chat"    element={<ProtectedRoute><DashboardRoute /></ProtectedRoute>} />
        <Route path="/chat/*"  element={<ProtectedRoute><DashboardRoute /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/chat" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
