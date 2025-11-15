/**
 * Index Store - Manages the current active index
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Index } from '../services/api';

interface IndexState {
  currentIndex: Index | null;
  setCurrentIndex: (index: Index | null) => void;
  clearCurrentIndex: () => void;
}

export const useIndexStore = create<IndexState>()(
  persist(
    (set) => ({
      currentIndex: null,
      setCurrentIndex: (index) => set({ currentIndex: index }),
      clearCurrentIndex: () => set({ currentIndex: null }),
    }),
    {
      name: 'raqib-index-storage',
    }
  )
);
