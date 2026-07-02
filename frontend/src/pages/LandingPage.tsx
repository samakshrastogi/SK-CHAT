import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Shield, Zap, Sparkles, Video, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between overflow-x-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl font-extrabold tracking-tighter text-white">C</span>
          </div>
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-400">Connect</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-4 py-2 text-sm font-medium hover:text-indigo-400 transition-colors">Sign In</Link>
          <Link to="/register" className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all">Get Started</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 md:py-24 grid md:grid-cols-12 gap-12 items-center z-10">
        <div className="md:col-span-7 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 w-fit"
          >
            <Sparkles className="h-3.5 w-3.5" /> Introducing Connect 1.0
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-purple-200"
          >
            Connect Instantly.<br />Communicate Beautifully.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-lg leading-relaxed"
          >
            A state-of-the-art messaging experience. Safe, real-time channels, video calls, expiring stories, and full AI integrations in a premium interface.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-4 mt-2"
          >
            <Link to="/register" className="px-8 py-4 text-base font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5">
              Start Chatting Now
            </Link>
            <a href="#features" className="px-8 py-4 text-base font-semibold bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-200 rounded-2xl transition-all">
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
                  <p className="text-xs text-indigo-400 font-semibold animate-pulse-slow">typing...</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"><Video className="h-4 w-4" /></div>
            </div>

            {/* Bubble Messages */}
            <div className="flex flex-col gap-4 mt-6 h-[70%] justify-end overflow-hidden">
              <div className="flex gap-2 max-w-[80%]">
                <div className="bg-slate-800/80 border border-slate-700/30 text-slate-100 text-sm px-4 py-3 rounded-2xl rounded-tl-none">
                  Hey! Did you check out the new design system?
                </div>
              </div>
              <div className="flex gap-2 max-w-[80%] self-end">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm px-4 py-3 rounded-2xl rounded-tr-none">
                  Yes! The glassmorphism cards look absolutely stellar. Let's build the prototype.
                </div>
              </div>
              <div className="flex gap-2 max-w-[80%]">
                <div className="bg-slate-800/80 border border-slate-700/30 text-slate-100 text-sm px-4 py-3 rounded-2xl rounded-tl-none">
                  Awesome! Let's do it 🚀
                </div>
              </div>
            </div>

            {/* Simulated Input */}
            <div className="absolute bottom-5 left-5 right-5 h-12 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center px-4 justify-between">
              <span className="text-xs text-slate-500 font-medium">Type a message...</span>
              <span className="h-7 w-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow shadow-indigo-500/30">⚡</span>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 py-16 border-t border-slate-800/50">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Real-time Sockets</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Lightning-fast message exchange, accurate typing notifications, and instant online status synchronization.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Video className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">WebRTC Voice & Video</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Establish instant, low-latency, crystal-clear voice and video calls directly inside the browser using secure p2p lines.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">AI Assistant Built-in</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Instantly summarize chats, translate messages to foreign languages, or draft smart suggestions with AI capabilities.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 text-center text-slate-500 text-xs">
        <p>&copy; {new Date().getFullYear()} Connect Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
