/**
 * Index Store - Manages the current active index
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Index } from '../services/api';

interface IndexState {
  currentIndex: Index | null;
  setCurrentIndex: (index: Index | null) => void;
  clearCurrentIndex: () => void;
}

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

export const useIndexStore = create<IndexState>()(
  persist(
    (set) => ({
      currentIndex: null,
      setCurrentIndex: (index) => set({ currentIndex: index }),
      clearCurrentIndex: () => set({ currentIndex: null }),
    }),
    {
      name: 'sahem-index-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
