import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState } from '../types';

// Mock admin user for testing
const MOCK_ADMIN: User = {
  id: 'usr-001',
  email: 'admin@example.com',
  name: 'مدير المنصة',
  name_en: 'System Administrator',
  role: 'admin' as any,
  department: 'الإدارة العليا',
  active: true,
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  is_first_login: false  // Admin already completed setup
};

const MOCK_PASSWORD = 'Admin@2025';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock authentication - check credentials
        if (email === MOCK_ADMIN.email && password === MOCK_PASSWORD) {
          const token = 'mock-jwt-token-' + Date.now();
          const user = {
            ...MOCK_ADMIN,
            last_login: new Date().toISOString()
          };

          set({
            user,
            token,
            isAuthenticated: true
          });

          return user;  // Return user data for first-time login check
        } else {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
        localStorage.removeItem('auth-storage');
      },

      checkAuth: () => {
        const state = get();
        if (!state.token || !state.user) {
          set({ isAuthenticated: false });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
