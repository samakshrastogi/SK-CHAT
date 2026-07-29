import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/authStore.js';
import { Mail, Lock, User, AlertTriangle, CheckCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const HAS_GOOGLE_CLIENT_ID = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your_google_client_id_here');

function RegisterForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { registerUser, googleLogin, checkAuth, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setVerifyStatus('error');
      setVerifyMessage('Please enter a 6-digit OTP code.');
      return;
    }
    setVerifyStatus('loading');
    setVerifyMessage('Verifying code...');
    try {
      const { verifyEmailCode } = useAuthStore.getState();
      await verifyEmailCode(otp, registeredEmail);
      setVerifyStatus('success');
      setVerifyMessage('Email verified successfully! Redirecting to Sign In...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setVerifyStatus('error');
      setVerifyMessage(err.response?.data?.message || 'Invalid or expired OTP code.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      if (credentialResponse.credential) {
        await googleLogin(credentialResponse.credential);
        navigate('/chat');
      } else {
        setErrorMsg('Google Sign-In failed. No credential returned.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 py-8 relative overflow-y-auto">
        {/* Background neon blur blobs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/20 dark:bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-purple-500/20 dark:bg-purple-500/10 blur-[100px] pointer-events-none" />

        <div className="w-full max-w-[420px] bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-indigo-500/20 backdrop-blur-2xl rounded-[28px] px-6 py-6 shadow-2xl shadow-indigo-500/5 dark:shadow-purple-500/10 text-center z-10 transition-all duration-300">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-3 animate-logo-glow">
            <img src="/sk-logo.png" alt="" className="h-full w-full rounded-xl object-cover" />
          </div>

          {verifyStatus === 'success' ? (
            <div className="space-y-4 py-4">
              <CheckCircle className="h-14 w-14 text-emerald-500 dark:text-emerald-450 mx-auto" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Email Verified!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-350 font-semibold leading-relaxed">{verifyMessage}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Verify Your Email</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                We sent a 6-digit verification code to <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{registeredEmail}</strong>.<br />Please enter it below to activate your account.
              </p>

              {verifyMessage && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  verifyStatus === 'error' 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-500' 
                    : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500'
                }`}>
                  {verifyMessage}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full h-10 px-3.5 text-center tracking-[6px] text-base font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 text-slate-800 dark:text-indigo-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={verifyStatus === 'loading'}
                  className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow shadow-indigo-500/10 transition-all flex items-center justify-center rounded-lg"
                >
                  {verifyStatus === 'loading' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : 'Verify Code'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setSuccess(false); setOtp(''); setVerifyMessage(''); setVerifyStatus('idle'); }}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 mt-2 block mx-auto transition-colors"
              >
                Back to Registration
              </button>
            </div>
          )}
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-3 animate-logo-glow">
            <img src="/sk-logo.png" alt="" className="h-full w-full rounded-xl object-cover" />
          </div>
          <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300">Create an account</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Join SK Connect today to experience next-gen chatting</p>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-indigo-500/20 backdrop-blur-2xl rounded-[28px] px-6 py-5 shadow-2xl shadow-indigo-500/5 dark:shadow-purple-500/10 transition-all duration-300">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold items-start">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  {...register('username', {
                    required: 'Name is required',
                    minLength: { value: 3, message: 'Name must be at least 3 characters' }
                  })}
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
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
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
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
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
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
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
                <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
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
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : 'Create Account'}
            </button>
          </form>

          {/* Google SSO Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
            <span className="relative px-2.5 text-[9px] uppercase font-bold text-slate-400 bg-white dark:bg-slate-900 rounded">Or continue with</span>
          </div>

          {/* Real Google OAuth Button wrapper */}
          <div className="flex justify-center mt-2 w-full">
            {HAS_GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
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
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RegisterForm />
    </GoogleOAuthProvider>
  );
}
