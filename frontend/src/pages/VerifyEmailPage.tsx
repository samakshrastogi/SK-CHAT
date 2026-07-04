import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { CheckCircle, XCircle, Loader, KeyRound, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { verifyEmailCode } = useAuthStore();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || otp.length !== 6) {
      setStatus('error');
      setMessage('Please enter a valid email and 6-digit OTP code.');
      return;
    }

    setStatus('loading');
    setMessage('Verifying your OTP code...');
    try {
      await verifyEmailCode(otp, email);
      setStatus('success');
      setMessage('Your email has been verified successfully!');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'The OTP code is invalid or has expired.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 py-8 relative overflow-y-auto">
      <div className="w-full max-w-[420px] bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[24px] px-6 py-5 shadow-2xl">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-500 mb-4 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>

        {status === 'loading' && (
          <div className="py-6 text-center">
            <Loader className="h-10 w-10 text-indigo-400 animate-spin mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Verifying...</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="h-14 w-14 text-emerald-500 dark:text-emerald-450 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Email Verified!</h3>
            <p className="text-slate-655 dark:text-slate-350 text-xs leading-relaxed mb-4">{message}</p>
            <Link
              to="/login"
              className="inline-block w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-bold transition-all text-xs shadow"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Verification Failed</h3>
            <p className="text-slate-655 dark:text-slate-350 text-xs leading-relaxed mb-4">{message}</p>
            <button
              onClick={() => { setStatus('idle'); setOtp(''); }}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-bold transition-all text-xs mb-2"
            >
              Try Again
            </button>
            <Link
              to="/register"
              className="inline-block w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold transition-all text-xs border border-slate-300 dark:border-slate-700"
            >
              Register Page
            </Link>
          </div>
        )}

        {status === 'idle' && (
          <div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white mb-1">Enter OTP Code</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">We sent a 6-digit verification code to your email. Enter it below to activate your account.</p>

            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">6-Digit Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-10 px-3.5 text-center tracking-[6px] text-base font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-800 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 mt-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-bold transition-all text-xs shadow-md shadow-indigo-500/15"
              >
                Verify Code
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
