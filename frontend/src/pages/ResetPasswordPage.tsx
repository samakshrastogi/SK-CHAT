import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiClient } from '../api/client.js';
import { Mail, Lock, CheckCircle, AlertTriangle, KeyRound, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [userEmail, setUserEmail] = useState('');

  const onSubmitRequest = async (data: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setUserEmail(data.email);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Request failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitReset = async (data: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await apiClient.post('/auth/reset-password', {
        email: userEmail,
        otp: data.otp,
        newPassword: data.newPassword
      });
      setSuccess(true);
      setSuccessMsg('Your password has been reset successfully! Please log in with your new password.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'The OTP code is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 py-8 relative overflow-y-auto">
        <div className="w-full max-w-[420px] bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[24px] px-6 py-5 text-center shadow-2xl">
          <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Password Updated</h3>
          <p className="text-slate-655 dark:text-slate-350 text-xs leading-relaxed mb-4">{successMsg}</p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-bold transition-all text-xs shadow-md shadow-indigo-500/10"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 py-8 relative overflow-y-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        <div className="text-center mb-4">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-500 mb-2 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-2">
            <img src="/sk-logo.png" alt="" className="h-full w-full rounded-xl object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            {step === 2 ? 'Enter Reset OTP' : 'Reset password'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {step === 2 ? 'We sent a 6-digit verification code to your email' : 'Enter your email address to receive a 6-digit OTP code'}
          </p>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[24px] px-6 py-5 shadow-2xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2.5 text-red-655 dark:text-red-400 text-xs font-semibold items-start">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 2 ? (
            // Mode 2: Reset Form
            <form onSubmit={handleSubmit(onSubmitReset)} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={userEmail}
                    className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-slate-100/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 cursor-not-allowed"
                  />
                  <Mail className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">6-Digit Reset OTP</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    {...register('otp', {
                      required: 'Reset OTP is required',
                      pattern: { value: /^\d{6}$/, message: 'Must be exactly 6 digits' }
                    })}
                    className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 transition-colors outline-none"
                  />
                  <KeyRound className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                </div>
                {errors.otp && (
                  <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.otp.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register('newPassword', {
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-955/40 text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 transition-colors outline-none"
                  />
                  <Lock className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                </div>
                {errors.newPassword && (
                  <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.newPassword.message as string}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow hover:shadow-md transition-all flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          ) : (
            // Mode 1: Request OTP Form
            <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-3">
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
                    className="w-full h-10 pl-10 pr-4 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-950/40 text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 transition-colors outline-none"
                  />
                  <Mail className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                </div>
                {errors.email && (
                  <p className="mt-0.5 text-[10px] text-red-500 font-semibold">{errors.email.message as string}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow hover:shadow-md transition-all flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'Send Verification OTP'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Back to{' '}
          <Link to="/login" className="font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
