import { create } from 'zustand';

interface ToastState {
  message: string | null;
  kind: 'info' | 'success' | 'warn';
  id: number;
  show(message: string, kind?: ToastState['kind']): void;
  hide(): void;
}

export const useToast = create<ToastState>((set, get) => ({
  message: null,
  kind: 'info',
  id: 0,
  show(message, kind = 'info') {
    const id = get().id + 1;
    set({ message, kind, id });
    setTimeout(() => {
      if (get().id === id) set({ message: null });
    }, 2800);
  },
  hide() {
    set({ message: null });
  },
}));
