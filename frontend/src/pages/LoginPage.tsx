import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const onSubmit = async (data: any) => {
    setErrorMsg('');
    try {
      // Determine device description
      const agent = navigator.userAgent;
      let device = 'Web Browser';
      if (agent.includes('Windows')) device = 'Windows PC';
      else if (agent.includes('Macintosh')) device = 'Mac OSX';
      else if (agent.includes('Linux')) device = 'Linux PC';
      else if (agent.includes('iPhone') || agent.includes('iPad')) device = 'iOS Device';
      else if (agent.includes('Android')) device = 'Android Device';

      await login(data.emailOrUsername, data.password, device);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <span className="text-xl font-black tracking-tighter text-white">SK</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-505 dark:text-slate-400">Sign in to your SK Connect account to continue</p>
        </div>

        {/* Form panel */}
        <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl relative">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-650 dark:text-red-400 text-xs font-semibold items-start">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email or Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="name@example.com or username"
                  {...register('emailOrUsername', { required: 'Username or email is required' })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.emailOrUsername && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.emailOrUsername.message as string}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                <Link to="/reset-password" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full h-12 pl-11 pr-12 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-550 hover:text-slate-800 dark:hover:text-slate-305 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.password.message as string}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-650 dark:text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-500 focus:ring-indigo-500/20"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Register</Link>
        </p>
      </div>
    </div>
  );
}
