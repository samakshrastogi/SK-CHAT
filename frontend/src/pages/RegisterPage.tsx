import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Mail, Lock, User, AlertTriangle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { registerUser, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: any) => {
    setErrorMsg('');
    try {
      await registerUser(data.email, data.username, data.password);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 relative">
        <div className="w-full max-w-[440px] bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[32px] p-8 text-center shadow-2xl">
          <CheckCircle className="h-16 w-16 text-emerald-500 dark:text-emerald-450 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Registration Successful</h3>
          <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed mb-6">
            Your account has been created and verified successfully! You can now log in immediately.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors text-sm shadow-md shadow-indigo-500/10"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <span className="text-xl font-black tracking-tighter text-white">SK</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">Create an account</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Join SK Connect today to experience next-gen chatting</p>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-650 dark:text-red-400 text-xs font-semibold items-start">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' }
                  })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.username.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                  })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.email.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.password.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (val: string) => {
                      if (watch('password') !== val) {
                        return 'Passwords do not match';
                      }
                    }
                  })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.confirmPassword.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
