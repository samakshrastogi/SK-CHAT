import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/authStore.js';
import { Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { setAccessTokenInMemory } from '../api/client.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const HAS_GOOGLE_CLIENT_ID = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your_google_client_id_here');

/* ── Inner login form (needs GoogleOAuthProvider in scope) ── */
function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, googleLogin, checkAuth, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setErrorMsg('Your session has expired due to 48 hours of inactivity. Please sign in again.');
    }
  }, [location]);

  const redirectAfterLogin = () => {
    const from = location.state?.from?.pathname || '/chat';
    navigate(from, { replace: true });
  };

  const onSubmit = async (data: any) => {
    setErrorMsg('');
    try {
      const agent = navigator.userAgent;
      let device = 'Web Browser';
      if (agent.includes('Windows')) device = 'Windows PC';
      else if (agent.includes('Macintosh')) device = 'Mac OSX';
      else if (agent.includes('Linux')) device = 'Linux PC';
      else if (agent.includes('iPhone') || agent.includes('iPad')) device = 'iOS Device';
      else if (agent.includes('Android')) device = 'Android Device';

      await login(data.emailOrUsername, data.password, device);
      redirectAfterLogin();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please verify credentials.');
    }
  };

  /* ── Real Google OAuth2 via @react-oauth/google ── */
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      if (credentialResponse.credential) {
        await googleLogin(credentialResponse.credential);
        redirectAfterLogin();
      } else {
        setErrorMsg('Google Sign-In failed. No credential returned.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 py-8 relative overflow-y-auto">
      {/* Background neon blur blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/20 dark:bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-purple-500/20 dark:bg-purple-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-pink-500/15 dark:bg-pink-500/5 blur-[90px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        <div className="text-center mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-3 animate-logo-glow">
            <img src="/sk-logo.png" alt="" className="h-full w-full rounded-xl object-cover" />
          </div>
          <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300">Welcome back</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Sign in to your SK Connect account to continue</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-indigo-500/20 backdrop-blur-2xl rounded-[28px] px-6 py-5 shadow-2xl shadow-indigo-500/5 dark:shadow-purple-500/10 transition-all duration-300 relative"
        >
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold items-start">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email or Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="name@example.com or username"
                  {...register('emailOrUsername', { required: 'Username or email is required' })}
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.emailOrUsername && (
                <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.emailOrUsername.message as string}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                <Link to="/reset-password" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full h-11 pl-10 pr-11 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.password.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
            <span className="relative px-3 text-[10px] uppercase font-bold tracking-widest text-slate-400">or continue with</span>
          </div>

          {/* Real Google OAuth Button wrapper */}
          <div className="flex justify-center mt-2 w-full">
            {HAS_GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                ux_mode="redirect"
                login_uri={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google-sso-redirect`}
                onSuccess={() => {}}
                onError={() => setErrorMsg('Google Sign-In failed or cancelled.')}
                useOneTap
                theme="outline"
                size="large"
                shape="rectangular"
                width="100%"
              />
            ) : (
              <button
                type="button"
                disabled
                className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-not-allowed"
              >
                Google Sign-In unavailable
              </button>
            )}
          </div>
        </motion.div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Register</Link>
        </p>
      </div>
    </div>
  );
}

/* ── Outer wrapper providing the Google OAuth context ── */
export default function LoginPage() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Save token in memory
      setAccessTokenInMemory(token);
      // Clean query parameters from address bar to keep URL clean
      window.history.replaceState({}, document.title, window.location.pathname);
      // Fetch user profile and navigate
      checkAuth().then((success) => {
        if (success) {
          const from = location.state?.from?.pathname || '/chat';
          navigate(from, { replace: true });
        }
      });
      return;
    }

    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/chat';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location, checkAuth]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}
