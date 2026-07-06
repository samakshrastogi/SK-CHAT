import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { MessageSquare, Shield, Zap, Sparkles, Video, Globe, AppWindow } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Theme/Accent customization preview on landing page
  const [accent, setAccent] = useState<'indigo' | 'emerald' | 'sunset' | 'sapphire'>('indigo');
  
  // Simulated chat conversation state
  const [activeTyping, setActiveTyping] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: 'alice' | 'bob'; text: string }>>([]);

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered hero entrance
      const tl = gsap.timeline();
      tl.from('.gsap-header', { opacity: 0, y: -30, duration: 0.8, ease: 'power3.out' })
        .from('.gsap-badge', { opacity: 0, scale: 0.8, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.4')
        .from('.gsap-title', { opacity: 0, y: 40, duration: 0.8, ease: 'power4.out' }, '-=0.3')
        .from('.gsap-desc', { opacity: 0, y: 25, duration: 0.7, ease: 'power3.out' }, '-=0.5')
        .from('.gsap-cta', { opacity: 0, scale: 0.95, y: 15, duration: 0.6, stagger: 0.15, ease: 'back.out(1.2)' }, '-=0.4')
        .from('.gsap-preview-picker', { opacity: 0, y: 10, duration: 0.5, ease: 'power2.out' }, '-=0.2')
        .from('.gsap-phone', { opacity: 0, scale: 0.92, y: 60, rotation: 2, duration: 1.2, ease: 'power4.out' }, '-=0.7');

      // Staggered features list
      gsap.from('.gsap-feature-card', {
        opacity: 0,
        y: 40,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.8
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId: any;

    const runChatLoop = async () => {
      if (!active) return;
      setMessages([]);
      
      // Alice typing
      setActiveTyping('Alice');
      await new Promise(r => { timeoutId = setTimeout(r, 1400); });
      if (!active) return;
      setActiveTyping(null);
      setMessages(prev => [...prev, { sender: 'alice', text: 'Hey! Did you check out the new design system?' }]);
      
      // Delay
      await new Promise(r => { timeoutId = setTimeout(r, 1000); });
      if (!active) return;

      // Bob typing
      setActiveTyping('Bob');
      await new Promise(r => { timeoutId = setTimeout(r, 2200); });
      if (!active) return;
      setActiveTyping(null);
      setMessages(prev => [...prev, { sender: 'bob', text: "Yes! The glassmorphic cards look absolutely stellar. Let's build the prototype." }]);

      // Delay
      await new Promise(r => { timeoutId = setTimeout(r, 1000); });
      if (!active) return;

      // Alice typing
      setActiveTyping('Alice');
      await new Promise(r => { timeoutId = setTimeout(r, 1200); });
      if (!active) return;
      setActiveTyping(null);
      setMessages(prev => [...prev, { sender: 'alice', text: "Awesome! Let's do it 🚀" }]);

      // Wait 5 seconds, then restart loop
      await new Promise(r => { timeoutId = setTimeout(r, 5000); });
      if (active) {
        runChatLoop();
      }
    };

    runChatLoop();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Theme styling calculations based on selected accent switcher
  const getAccentClass = () => {
    switch (accent) {
      case 'emerald':
        return {
          bg: 'from-emerald-500/10 to-teal-500/10',
          badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          logo: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
          textGrad: 'from-emerald-200 to-teal-400',
          button: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/15 hover:shadow-emerald-500/25',
          chatBubble: 'from-emerald-500 to-teal-600',
          glowColor: 'bg-emerald-500/10',
          activeDot: 'bg-emerald-400',
        };
      case 'sunset':
        return {
          bg: 'from-orange-500/10 to-rose-500/10',
          badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
          logo: 'from-orange-500 to-rose-600 shadow-orange-500/20',
          textGrad: 'from-orange-200 to-rose-400',
          button: 'from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 shadow-orange-500/15 hover:shadow-orange-500/25',
          chatBubble: 'from-orange-500 to-rose-600',
          glowColor: 'bg-orange-500/10',
          activeDot: 'bg-orange-400',
        };
      case 'sapphire':
        return {
          bg: 'from-cyan-500/10 to-blue-500/10',
          badge: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
          logo: 'from-cyan-500 to-blue-600 shadow-cyan-500/20',
          textGrad: 'from-cyan-200 to-blue-400',
          button: 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-cyan-500/15 hover:shadow-cyan-500/25',
          chatBubble: 'from-cyan-500 to-blue-600',
          glowColor: 'bg-cyan-500/10',
          activeDot: 'bg-cyan-400',
        };
      default:
        return {
          bg: 'from-indigo-500/10 to-purple-500/10',
          badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
          logo: 'from-indigo-500 to-purple-600 shadow-indigo-500/20',
          textGrad: 'from-indigo-200 to-purple-400',
          button: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/15 hover:shadow-indigo-500/25',
          chatBubble: 'from-indigo-500 to-purple-600',
          glowColor: 'bg-indigo-500/10',
          activeDot: 'bg-indigo-400',
        };
    }
  };

  const style = getAccentClass();

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col justify-between overflow-x-hidden relative select-none">
      {/* Background Glows */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full ${style.glowColor} blur-[130px] pointer-events-none transition-all duration-700`} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10 gsap-header">
        <div className="flex items-center gap-2">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${style.logo} flex items-center justify-center shadow-lg transition-all duration-500`}>
            <span className="text-sm font-black tracking-tighter text-white">SK</span>
          </div>
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-indigo-300">
            SK Connect
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/chat" className={`px-5 py-2.5 text-sm font-semibold bg-gradient-to-r ${style.button} text-white rounded-xl shadow-lg transition-all duration-500 flex items-center gap-1.5`}>
              <AppWindow className="h-4 w-4" /> Go to App
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-indigo-400 transition-colors">Sign In</Link>
              <Link to="/register" className={`px-5 py-2.5 text-sm font-semibold bg-gradient-to-r ${style.button} text-white rounded-xl shadow-lg transition-all duration-500`}>Get Started</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 md:py-24 grid md:grid-cols-12 gap-12 items-center z-10">
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${style.badge} border text-xs font-semibold w-fit gsap-badge transition-all duration-500`}>
            <Sparkles className="h-3.5 w-3.5" /> Introducing SK Connect 1.0
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 gsap-title">
            Connect Instantly.<br />Communicate Beautifully.
          </h1>

          <p className="text-base md:text-lg text-slate-400 max-w-lg leading-relaxed gsap-desc">
            A premium real-time collaboration ecosystem. Instant file syncs, high-definition WebRTC calling, expiring status sharing, and modular AI integrations.
          </p>

          <div className="flex flex-wrap gap-4 mt-2">
            {isAuthenticated ? (
              <Link to="/chat" className={`px-8 py-4 text-base font-semibold bg-gradient-to-r ${style.button} text-white rounded-2xl shadow-xl transition-all duration-500 transform hover:-translate-y-0.5 gsap-cta`}>
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/register" className={`px-8 py-4 text-base font-semibold bg-gradient-to-r ${style.button} text-white rounded-2xl shadow-xl transition-all duration-500 transform hover:-translate-y-0.5 gsap-cta`}>
                Start Chatting Now
              </Link>
            )}
            <a href="#features" className="px-8 py-4 text-base font-semibold bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 text-slate-200 rounded-2xl transition-all gsap-cta">
              Explore Features
            </a>
          </div>

          {/* Interactive Accent Switcher Widget */}
          <div className="mt-8 flex flex-col gap-3 gsap-preview-picker">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Preview Accent Wallpaper</span>
            <div className="flex gap-3">
              <button 
                onClick={() => setAccent('indigo')}
                className={`h-7 px-3.5 rounded-full text-xs font-semibold transition-all border ${accent === 'indigo' ? 'bg-indigo-600 border-indigo-500 text-white shadow shadow-indigo-600/30 scale-105' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                Purple Indigo
              </button>
              <button 
                onClick={() => setAccent('emerald')}
                className={`h-7 px-3.5 rounded-full text-xs font-semibold transition-all border ${accent === 'emerald' ? 'bg-emerald-600 border-emerald-500 text-white shadow shadow-emerald-600/30 scale-105' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                Emerald Mint
              </button>
              <button 
                onClick={() => setAccent('sunset')}
                className={`h-7 px-3.5 rounded-full text-xs font-semibold transition-all border ${accent === 'sunset' ? 'bg-orange-600 border-orange-500 text-white shadow shadow-orange-600/30 scale-105' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                Sunset Orange
              </button>
              <button 
                onClick={() => setAccent('sapphire')}
                className={`h-7 px-3.5 rounded-full text-xs font-semibold transition-all border ${accent === 'sapphire' ? 'bg-cyan-600 border-cyan-500 text-white shadow shadow-cyan-600/30 scale-105' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                Sapphire Blue
              </button>
            </div>
          </div>
        </div>

        {/* Mock phone mockup with dynamic typing simulator */}
        <div className="md:col-span-5 flex justify-center items-center gsap-phone">
          <div className="w-full max-w-[390px] aspect-[9/19] rounded-[48px] bg-slate-950 border-[5px] border-slate-800 p-4 shadow-2xl relative flex flex-col justify-between overflow-hidden">
            {/* Camera notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-4 w-28 rounded-full bg-slate-950 border border-slate-850 z-20 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
            </div>

            {/* Glossy Mock Chat Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 pt-4 z-10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-indigo-400 font-bold border border-slate-800 text-xs">
                  A
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Alice (Designer)</h4>
                  {activeTyping === 'Alice' ? (
                    <p className="text-[10px] text-emerald-400 font-bold animate-pulse">typing...</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium">Online</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800"><Video className="h-3 w-3" /></div>
              </div>
            </div>

            {/* Live Message Bubbles Feed */}
            <div className="flex flex-col gap-3.5 my-4 flex-1 overflow-y-auto justify-end px-1.5 z-10 min-h-[300px]">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col max-w-[85%] ${msg.sender === 'bob' ? 'self-end' : 'self-start'}`}
                >
                  <div className={`text-[11px] px-3.5 py-2 rounded-2xl leading-relaxed shadow-sm transition-all duration-300 ${
                    msg.sender === 'bob' 
                      ? `bg-gradient-to-r ${style.chatBubble} text-white rounded-tr-none` 
                      : 'bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[8px] text-slate-500 mt-1 ${msg.sender === 'bob' ? 'self-end' : 'self-start'}`}>
                    {msg.sender === 'bob' ? '✓✓ Seen' : '10:42 AM'}
                  </span>
                </div>
              ))}

              {/* Dynamic typing indicator block */}
              {activeTyping && (
                <div className="flex gap-2 max-w-[80%] self-start">
                  <div className="bg-slate-900 border border-slate-850 text-slate-300 text-[10px] px-3 py-2 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="font-semibold text-slate-400">{activeTyping} is writing</span>
                    <span className="flex gap-0.5">
                      <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated input panel */}
            <div className="relative h-9 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center px-3 justify-between mt-2 z-10">
              <span className="text-[10px] text-slate-600 font-medium">
                {activeTyping === 'Bob' ? (
                  <span className="text-slate-400 font-medium animate-pulse">Bob is typing...</span>
                ) : 'Type a message...'}
              </span>
              <span className={`h-6 w-6 rounded-lg bg-gradient-to-r ${style.chatBubble} flex items-center justify-center text-white text-xs font-bold transition-all duration-500`}>
                ⚡
              </span>
            </div>

            {/* Home indicator bar */}
            <div className="w-24 h-1 rounded-full bg-slate-800 mx-auto mt-3.5 pointer-events-none" />
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 py-20 border-t border-slate-800/40">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-indigo-300">
            Smart Features, Reimagined
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Discover the systems engineered to deliver low-latency real-time collaboration and secure communication.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 flex flex-col gap-4 gsap-feature-card hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">Real-time Sockets</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Lightning-fast message routing, real-time presence indicators, dynamic typing notifications, and instant online syncing.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 flex flex-col gap-4 gsap-feature-card hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Video className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">WebRTC Audio & Video</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Establish crystal-clear peer-to-peer audio and video call streams directly inside your browser window with call logs history.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 flex flex-col gap-4 gsap-feature-card hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">AI Assistant Integration</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Summarize chat threads instantly, check spelling, rewrite and translate messages, or view dynamic suggested smart replies.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 flex flex-col gap-4 gsap-feature-card hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">Structured Communities</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Create communities with sub-channel layouts including announcement panels, events schedules, media grids, and drop-in voice rooms.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 flex flex-col gap-4 gsap-feature-card hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">24-Hour Expiring Stories</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Share status updates that disappear in 24 hours. Add interactive Q&A sliders, location widgets, hashtags, and likes sync.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 flex flex-col gap-4 gsap-feature-card hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Shield className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">OTP & Remote Device Controls</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Verify credentials via email OTP codes, register session devices, and revoke active remote device sessions instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-850 py-8 text-center text-slate-500 text-xs">
        <p>&copy; {new Date().getFullYear()} SK Connect. All rights reserved.</p>
      </footer>
    </div>
  );
}
