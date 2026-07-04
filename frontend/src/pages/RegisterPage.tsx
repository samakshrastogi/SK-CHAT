import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Mail, Lock, User, AlertTriangle, CheckCircle, ArrowLeft, X } from 'lucide-react';

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { registerUser, googleLogin, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: any) => {
    setErrorMsg('');
    try {
      await registerUser(data.email, data.username, data.password);
      setRegisteredEmail(data.email);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const handleGoogleAccountSelect = async (email: string, username: string, googleId: string) => {
    setShowGoogleModal(false);
    setErrorMsg('');
    try {
      await googleLogin(email, username, googleId);
      navigate('/chat');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Google Sign-In failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 relative">
        <div className="w-full max-w-[440px] bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[32px] p-8 text-center shadow-2xl">
          <CheckCircle className="h-16 w-16 text-emerald-500 dark:text-emerald-450 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Check Your Email</h3>
          <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed mb-6">
            We have sent a 6-digit OTP code to <strong>{registeredEmail}</strong>. Please enter the code to verify your email.
          </p>
          <Link
            to={`/verify-email?email=${encodeURIComponent(registeredEmail)}`}
            className="inline-block w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all text-sm shadow-md shadow-indigo-500/10"
          >
            Enter Verification Code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 py-8 relative overflow-y-auto">
      {/* Vibrant Background Blobs */}
      <div className="absolute top-10 left-10 w-[300px] h-[300px] rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] rounded-full bg-purple-500/15 dark:bg-purple-500/25 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] rounded-full bg-pink-500/10 dark:bg-pink-500/15 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        <div className="text-center mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-3 animate-pulse">
            <span className="text-sm font-black tracking-tighter text-white">SK</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300">Create an account</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Join SK Connect today to experience next-gen chatting</p>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-indigo-500/20 backdrop-blur-2xl rounded-[28px] px-6 py-5 shadow-2xl shadow-indigo-500/5 dark:shadow-purple-500/10 transition-all duration-300">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2.5 text-red-655 dark:text-red-400 text-xs font-semibold items-start">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' }
                  })}
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <User className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.username && (
                <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.username.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                  })}
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Mail className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.email && (
                <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.email.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Lock className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.password && (
                <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.password.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Confirm Password</label>
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
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-650 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Lock className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              </div>
              {errors.confirmPassword && (
                <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.confirmPassword.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow hover:shadow-md transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Google SSO Divider */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
            <span className="relative px-2.5 text-[9px] uppercase font-bold text-slate-400 bg-white dark:bg-slate-900 rounded">Or</span>
          </div>

          {/* Continue with Google SSO Trigger */}
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm bg-white dark:bg-slate-950/20"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.38C21.68,11.83 21.56,11.43 21.35,11.1z" fill="#4285F4" />
                <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.58c-0.92,0.62 -2.1,0.98 -3.3,0.98 -2.35,0 -4.33,-1.58 -5.04,-3.7H2.88v2.66C4.38,18.8 8.02,20.62 12,20.62z" fill="#34A853" />
                <path d="M6.96,13.22c-0.18,-0.54 -0.28,-1.12 -0.28,-1.72s0.1,-1.18 0.28,-1.72V7.12H2.88c-0.6,1.2 -0.94,2.56 -0.94,4s0.34,2.8 0.94,4L6.96,13.22z" fill="#FBBC05" />
                <path d="M12,6.38c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.68 14.42,3 12,3c-3.98,0 -7.62,1.82 -9.12,4.82l4.08,3.16C7.67,7.96 9.65,6.38 12,6.38z" fill="#EA4335" />
              </g>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Sign In</Link>
        </p>
      </div>

      {/* Google SSO Chooser Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.38C21.68,11.83 21.56,11.43 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.58c-0.92,0.62 -2.1,0.98 -3.3,0.98 -2.35,0 -4.33,-1.58 -5.04,-3.7H2.88v2.66C4.38,18.8 8.02,20.62 12,20.62z" fill="#34A853" />
                  <path d="M6.96,13.22c-0.18,-0.54 -0.28,-1.12 -0.28,-1.72s0.1,-1.18 0.28,-1.72V7.12H2.88c-0.6,1.2 -0.94,2.56 -0.94,4s0.34,2.8 0.94,4L6.96,13.22z" fill="#FBBC05" />
                  <path d="M12,6.38c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.68 14.42,3 12,3c-3.98,0 -7.62,1.82 -9.12,4.82l4.08,3.16C7.67,7.96 9.65,6.38 12,6.38z" fill="#EA4335" />
                </svg>
                <span className="text-sm font-bold text-slate-800 dark:text-white">Choose Google Account</span>
              </div>
              <button 
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-850 dark:hover:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-normal">Choose an account to continue to SK Connect Platform.</p>

            <div className="space-y-2">
              <button
                onClick={() => handleGoogleAccountSelect('samaksh.rastogi@gmail.com', 'Samaksh', 'google_11111')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800 transition-all text-left"
              >
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Samaksh Rastogi</h4>
                  <p className="text-[10px] text-slate-500">samaksh.rastogi@gmail.com</p>
                </div>
              </button>

              <button
                onClick={() => handleGoogleAccountSelect('alice.vance@gmail.com', 'Alice', 'google_22222')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800 transition-all text-left"
              >
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Alice Vance</h4>
                  <p className="text-[10px] text-slate-500">alice.vance@gmail.com</p>
                </div>
              </button>

              <button
                onClick={() => handleGoogleAccountSelect('bob.smith@gmail.com', 'Bob', 'google_33333')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800 transition-all text-left"
              >
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Bob Smith</h4>
                  <p className="text-[10px] text-slate-500">bob.smith@gmail.com</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
