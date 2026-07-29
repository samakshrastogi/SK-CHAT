import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore.js';
import { useThemeStore } from './store/themeStore.js';
import LandingPage from './pages/LandingPage.tsx';
import JoinGroupPage from './pages/JoinGroupPage.tsx';
import { getCentralSessionState, redirectToCentralLogin } from './api/centralAuth.js';
import { AppErrorBoundary } from './components/AppErrorBoundary.js';

const ChatDashboard = lazy(() => import('./pages/ChatDashboard.tsx'));

const Dashboard = () => (
  <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading Connect…</div>}>
    <ChatDashboard />
  </Suspense>
);

const usePathname = () => {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return pathname;
};

const replacePath = (path: string) => {
  if (window.location.pathname === path) return;
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function CentralLoginRedirect() {
  const { isAuthenticated, isLoading } = useAuthStore();
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) replacePath('/chat');
    else redirectToCentralLogin();
  }, [isAuthenticated, isLoading]);
  return <div className="min-h-screen grid place-items-center bg-slate-950 text-white font-bold">Connecting to SK Central…</div>;
}

function ProtectedRoute({ children }: React.PropsWithChildren) {
  const { isAuthenticated, isLoading } = useAuthStore();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) replacePath('/login');
  }, [isAuthenticated, isLoading]);
  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen grid place-items-center" style={{ backgroundColor: 'var(--bg-app)' }} aria-label="Loading session">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const pathname = usePathname();
  if (pathname === '/') return <LandingPage />;
  if (['/login', '/register', '/verify-email', '/reset-password'].includes(pathname)) return <CentralLoginRedirect />;
  if (pathname.startsWith('/join/')) return <ProtectedRoute><JoinGroupPage /></ProtectedRoute>;
  if (pathname === '/chat' || pathname.startsWith('/chat/')) return <ProtectedRoute><Dashboard /></ProtectedRoute>;
  replacePath('/chat');
  return null;
}

function App() {
  const { checkAuth, clearLocalSession, isAuthenticated } = useAuthStore();
  const { applyTheme, theme } = useThemeStore();

  useEffect(() => { applyTheme(); }, [theme, applyTheme]);
  useEffect(() => { checkAuth(); }, []);
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

  return <AppErrorBoundary><AppRoutes /></AppErrorBoundary>;
}

export default App;
