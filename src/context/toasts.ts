import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let next = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = next++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (title: string, body?: string, tone: Toast['tone'] = 'info') => useToasts.getState().push({ title, body, tone });
