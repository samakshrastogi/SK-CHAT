import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import { useChatStore } from '../store/chatStore.js';
import { Compass, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

export default function JoinGroupPage() {
  const codeOrToken = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).at(-1) || '');
  const { upsertChat } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [message, setMessage] = useState('You have been invited to join this group chat.');

  const handleJoin = async () => {
    if (!codeOrToken) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiClient.post(`/chats/join/${codeOrToken}`);
      setSuccess(true);
      setMessage(response.data.message || 'Successfully joined group!');
      if (response.data.chat) {
        upsertChat(response.data.chat);
      }
      
      // Redirect to the main dashboard after a short delay
      setTimeout(() => {
        window.location.assign('/chat');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to join group chat. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60 transition-colors duration-500 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <span className="text-2xl font-extrabold tracking-tighter text-white">C</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">Group Invitation</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Connect Group Chat Network</p>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl rounded-[32px] p-8 text-center shadow-2xl">
          {success ? (
            <div className="py-4">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-6 animate-bounce" />
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Joined Successfully!</h3>
              <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed mb-4">{message}</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse font-semibold">Redirecting to chat...</p>
            </div>
          ) : (
            <div className="py-2">
              <Compass className="h-16 w-16 text-indigo-500 dark:text-indigo-400 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Join Group Chat</h3>
              <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed mb-8">{message}</p>

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-655 dark:text-red-400 text-xs font-semibold text-left">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? (
                    <Loader className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    'Accept Invitation & Join'
                  )}
                </button>
                <a
                  href="/"
                  className="inline-block w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white py-2"
                >
                  Decline & Go Back
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
