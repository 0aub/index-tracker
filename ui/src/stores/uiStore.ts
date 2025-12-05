import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UIState } from '../types';

// Safe storage that falls back gracefully on iOS
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Silently fail on iOS private browsing or quota errors
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Silently fail
    }
  },
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      language: 'ar',
      theme: 'light',
      sidebarOpen: true,

      setLanguage: (lang: 'ar' | 'en') => set({ language: lang }),

      setTheme: (theme: 'light' | 'dark') => set({ theme }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
