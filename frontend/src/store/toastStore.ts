import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastMessage {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  messages: ToastMessage[];
  push: (kind: ToastKind, message: string) => string;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  messages: [],
  push: (kind, message) => {
    const id = crypto.randomUUID();
    set((state) => ({ messages: [...state.messages.slice(-3), { id, kind, message }] }));
    window.setTimeout(() => useToastStore.getState().remove(id), 5000);
    return id;
  },
  remove: (id) => set((state) => ({ messages: state.messages.filter((message) => message.id !== id) })),
}));

export const toast = {
  success: (message: unknown) => useToastStore.getState().push('success', String(message)),
  error: (message: unknown) => useToastStore.getState().push('error', String(message)),
  info: (message: unknown) => useToastStore.getState().push('info', String(message)),
};
