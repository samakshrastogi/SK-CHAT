import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { verifyEmailCode } = useAuthStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Missing parameters in verification link.');
      return;
    }

    const verify = async () => {
      try {
        await verifyEmailCode(token, email);
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
      }
    };

    verify();
  }, [searchParams, verifyEmailCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6 relative">
      <div className="w-full max-w-[440px] glass-panel rounded-3xl p-8 text-center shadow-2xl">
        {status === 'loading' && (
          <div className="py-8">
            <Loader className="h-12 w-12 text-indigo-400 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Verifying...</h3>
            <p className="text-slate-400 text-sm">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">Email Verified!</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all text-sm"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">Verification Failed</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">{message}</p>
            <Link
              to="/register"
              className="inline-block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all text-sm border border-slate-700"
            >
              Register Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
