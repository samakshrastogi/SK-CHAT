import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Mail, Lock, User, AlertTriangle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { registerUser, isLoading } = useAuthStore();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6 relative">
        <div className="w-full max-w-[440px] glass-panel rounded-3xl p-8 text-center shadow-2xl">
          <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-3">Registration Successful</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            We have sent a verification link to your email address. Please open it to verify your account and unlock Connect.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors text-sm"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <span className="text-2xl font-extrabold tracking-tighter text-white">C</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Create an account</h2>
          <p className="mt-2 text-sm text-slate-400">Join Connect today to experience next-gen chatting</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-xs font-medium items-start">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' }
                  })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium glass-input text-white placeholder:text-slate-500"
                />
                <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-400 font-semibold">{errors.username.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                  })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium glass-input text-white placeholder:text-slate-500"
                />
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400 font-semibold">{errors.email.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium glass-input text-white placeholder:text-slate-500"
                />
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400 font-semibold">{errors.password.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
