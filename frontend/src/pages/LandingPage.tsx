import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Shield, Zap, Sparkles, Video, Globe, AppWindow } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between overflow-x-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-sm font-black tracking-tighter text-white on-color">SK</span>
          </div>
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 dark:from-indigo-200 dark:to-purple-400">SK Connect</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/chat" className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white on-color rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all flex items-center gap-1.5">
              <AppWindow className="h-4 w-4" /> Go to App
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors font-semibold">Sign In</Link>
              <Link to="/register" className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white on-color rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all">Get Started</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 md:py-24 grid md:grid-cols-12 gap-12 items-center z-10">
        <div className="md:col-span-7 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400 w-fit"
          >
            <Sparkles className="h-3.5 w-3.5" /> Introducing SK Connect 1.0
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-900 dark:from-white dark:via-indigo-100 dark:to-purple-200"
          >
            SK Connect Instantly.<br />Communicate Beautifully.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed font-semibold"
          >
            A state-of-the-art messaging experience. Safe, real-time channels, video calls, expiring stories, and full AI integrations in a premium interface.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-4 mt-2"
          >
            {isAuthenticated ? (
              <Link to="/chat" className="px-8 py-4 text-base font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white on-color rounded-2xl shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5">
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/register" className="px-8 py-4 text-base font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white on-color rounded-2xl shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5">
                Start Chatting Now
              </Link>
            )}
            <a href="#features" className="px-8 py-4 text-base font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 rounded-2xl transition-all">
              Learn More
            </a>
          </motion.div>
        </div>

        {/* Mock UI Representation */}
        <div className="md:col-span-5 flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-[420px] aspect-[4/5] rounded-[36px] bg-slate-900 border border-slate-800/80 p-5 shadow-2xl relative overflow-hidden"
          >
            {/* Glossy Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold border border-slate-700/30">A</div>
                <div>
                  <h4 className="text-sm font-bold">Alice (Designer)</h4>
                  <p className="text-xs text-indigo-400 font-semibold animate-pulse">typing...</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"><Video className="h-4 w-4" /></div>
            </div>

            {/* Bubble Messages */}
            <div className="flex flex-col gap-4 mt-6 flex-1 mb-16 overflow-hidden justify-end">
              <div className="flex gap-2 max-w-[85%]">
                <div className="bg-slate-850 border border-slate-800 text-slate-200 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none leading-relaxed">
                  Hey! Did you check out the new design system?
                </div>
              </div>
              <div className="flex gap-2 max-w-[85%] self-end">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white on-color text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-none leading-relaxed">
                  Yes! The glassmorphic cards look absolutely stellar. Let's build the prototype.
                </div>
              </div>
              <div className="flex gap-2 max-w-[85%]">
                <div className="bg-slate-850 border border-slate-800 text-slate-200 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none leading-relaxed">
                  Awesome! Let's do it 🚀
                </div>
              </div>
            </div>

            {/* Simulated Input */}
            <div className="absolute bottom-4 left-5 right-5 h-10 rounded-xl bg-slate-800/40 border border-slate-700/30 flex items-center px-3.5 justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Type a message...</span>
              <span className="h-6.5 w-6.5 rounded-lg bg-indigo-500 flex items-center justify-center text-white on-color text-xs font-bold shadow shadow-indigo-500/30">⚡</span>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 py-16 border-t border-slate-800/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-400">Everything you need, built natively.</h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">Explore the core systems engineered to deliver a seamless real-time communication platform.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Real-time Sockets</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Lightning-fast direct message exchange, accurate typing notifications, delivered/seen status markers, and instant online status synchronization.</p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Video className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">WebRTC Voice & Video</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Establish instant, low-latency, crystal-clear voice and video calls directly inside the browser using secure peer-to-peer signalling.</p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">AI Assistant Built-in</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Instantly summarize chats, translate messages to foreign languages, or draft smart suggestions with Google Gemini integration.</p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Structured Communities</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Create server-style communities with private approval queues, banners, and structured channels for announcements, discussions, and Q&A.</p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">24h Expiring Stories</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Share text, image, or media updates that expire automatically in 24 hours. Connect with your friends dynamically outside of chat windows.</p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">OTP & SSO Access Protection</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Sign up and reset password using 6-digit OTP email codes, connect instantly using Google SSO, and automatically expire inactive sessions after 48 hours.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 text-center text-slate-500 text-xs">
        <p>&copy; {new Date().getFullYear()} SK Connect Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
