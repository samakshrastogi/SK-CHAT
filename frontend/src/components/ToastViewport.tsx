import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useToastStore } from '../store/toastStore.js';

const styles = {
  success: 'border-emerald-500/30 bg-emerald-950 text-emerald-100',
  error: 'border-red-500/30 bg-red-950 text-red-100',
  info: 'border-indigo-500/30 bg-slate-900 text-slate-100',
};

export const ToastViewport = () => {
  const { messages, remove } = useToastStore();
  return (
    <div className="fixed right-3 top-3 z-[100] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2" aria-live="polite" aria-atomic="false">
      {messages.map((toast) => (
        <div key={toast.id} role={toast.kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 shadow-xl ${styles[toast.kind]}`}>
          {toast.kind === 'success' ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : toast.kind === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          <p className="flex-1 text-xs leading-relaxed">{toast.message}</p>
          <button type="button" onClick={() => remove(toast.id)} aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
};
