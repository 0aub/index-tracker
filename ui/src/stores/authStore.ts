import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthState } from '../types';

// Mock credentials from environment variables (Vite exposes VITE_* variables)
const MOCK_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com';
const MOCK_PASSWORD = import.meta.env.VITE_MOCK_PASSWORD || import.meta.env.VITE_ADMIN_PASSWORD || 'ChangeThisPassword123';

// Mock admin user for testing
const MOCK_ADMIN: User = {
  id: 'usr-001',
  email: MOCK_EMAIL,
  name: 'مدير المنصة',
  name_en: 'System Administrator',
  role: 'admin' as any,
  department: 'الإدارة العليا',
  active: true,
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  is_first_login: false  // Admin already completed setup
};

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          // Call the real backend login endpoint
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(errorData.detail || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
          }

          const data = await response.json();
          const token = data.access_token;
          const userData = data.user;

          // Convert backend user format to frontend User type
          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.full_name_ar,
            name_en: userData.full_name_en,
            role: userData.role as any,
            department: userData.department_ar || '', // Use Arabic department for backward compatibility
            department_ar: userData.department_ar,
            department_en: userData.department_en,
            agency_id: userData.agency_id,
            general_management_id: userData.general_management_id,
            department_id: userData.department_id,
            active: userData.is_active,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            is_first_login: userData.is_first_login
          };

          set({
            user,
            token,
            isAuthenticated: true
          });

          return user;  // Return user data for first-time login check
        } catch (error: any) {
          throw new Error(error.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
        try {
          localStorage.removeItem('auth-storage');
        } catch {
          // Silently fail
        }
      },

      checkAuth: () => {
        const state = get();
        if (!state.token || !state.user) {
          set({ isAuthenticated: false });
        }
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...updates
            }
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
