import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UIState } from '../types';

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
      name: 'ui-storage'
    }
  )
);
