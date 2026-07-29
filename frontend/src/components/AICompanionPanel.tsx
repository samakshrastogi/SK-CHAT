import React from 'react';
import { Send, Sparkles, X } from 'lucide-react';

interface AIMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface AICompanionPanelProps {
  isOpen: boolean;
  consented: boolean;
  disclosure: string;
  messages: AIMessage[];
  input: string;
  loading: boolean;
  onClose: () => void;
  onConsent: () => Promise<void>;
  onRevoke: () => Promise<void>;
  onCancel: () => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onSummarize: () => void;
}

export const AICompanionPanel: React.FC<AICompanionPanelProps> = ({
  isOpen,
  consented,
  disclosure,
  messages,
  input,
  loading,
  onClose,
  onConsent,
  onRevoke,
  onCancel,
  onInputChange,
  onSubmit,
  onSummarize,
}) => {
  if (!isOpen) return null;
  return (
    <aside
      aria-label="AI companion"
      className="w-full md:w-80 border-l border-slate-200 dark:border-slate-800/40 bg-slate-50/95 dark:bg-slate-955/95 md:bg-white/40 md:dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 absolute md:relative right-0 top-0 z-30 overflow-hidden shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200"
    >
      <div className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-4 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-bold text-xs text-slate-800 dark:text-slate-200">AI Companion</h2>
        </div>
        <button onClick={onClose} aria-label="Close AI companion" className="text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <X className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>

      {!consented && (
        <div className="m-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-slate-700 dark:text-slate-200">
          <p className="font-bold">Enable AI features</p>
          <p className="mt-1 text-[10px] leading-relaxed">{disclosure}</p>
          <button type="button" onClick={() => void onConsent()} className="mt-2 rounded-lg bg-indigo-500 px-3 py-1.5 font-bold text-white">
            I agree and enable AI
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite" aria-busy={loading}>
        {messages.map((message, index) => (
          <div key={index} className={`flex flex-col max-w-[85%] ${message.sender === 'user' ? 'self-end ml-auto items-end' : 'items-start'}`}>
            <span className="text-[9px] font-bold text-slate-500 mb-1">{message.sender === 'user' ? 'You' : 'Companion'}</span>
            <div className={`px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${message.sender === 'user' ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-250 border border-slate-200 dark:border-slate-800 rounded-tl-none'}`}>
              {message.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Sparkles className="h-3.5 w-3.5 animate-spin text-indigo-400" aria-hidden="true" />
            <span>Thinking…</span>
            <button type="button" onClick={onCancel} className="rounded bg-slate-200 px-2 py-1 dark:bg-slate-800">Cancel</button>
          </div>
        )}
      </div>

      {consented && (
        <div className="px-3 pb-2 text-right">
          <button type="button" onClick={() => void onRevoke()} className="text-[9px] font-semibold text-slate-500 underline hover:text-red-500">
            Disable AI and revoke consent
          </button>
        </div>
      )}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20 flex gap-2">
        <button onClick={onSummarize} disabled={!consented || loading} className="flex-1 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/20 disabled:opacity-50">
          Summarize chat
        </button>
      </div>
      <form onSubmit={onSubmit} className="p-3 border-t border-slate-200 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 flex gap-2 items-center">
        <label htmlFor="ai-companion-input" className="sr-only">Ask AI companion</label>
        <input id="ai-companion-input" type="text" value={input} disabled={!consented || loading} onChange={(event) => onInputChange(event.target.value)} placeholder="Ask AI companion…" className="flex-1 h-9 px-3 rounded-xl text-xs font-semibold glass-input text-slate-800 dark:text-white placeholder:text-slate-500 disabled:opacity-50" />
        <button type="submit" disabled={!consented || loading || !input.trim()} aria-label="Send AI request" className="h-9 w-9 rounded-xl bg-indigo-500 hover:bg-indigo-650 disabled:opacity-50 flex items-center justify-center text-white">
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
};
