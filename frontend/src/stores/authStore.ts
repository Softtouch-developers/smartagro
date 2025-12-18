import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserMode } from '@/types';
import type { LoginRequest, SignupRequest } from '@/types';
import { authApi } from '@/services/api';
import { offlineDb } from '@/services/db';
import { STORAGE_KEYS } from '@/utils/constants';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<User>;
  signup: (data: SignupRequest) => Promise<{ userId: number }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  switchMode: (mode: UserMode) => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.tokens.access_token);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.tokens.refresh_token);

          // Cache user for offline access
          await offlineDb.cacheUser(response.user);

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });

          return response.user;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.signup(data);
          set({ isLoading: false });
          return { userId: response.user_id };
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Signup failed',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        } finally {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          await offlineDb.clearUserCache();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      loadUser: async () => {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.getProfile();
          await offlineDb.cacheUser(user);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          // Try to load cached user if offline
          const cachedUser = await offlineDb.getCachedUser();
          if (cachedUser) {
            set({ user: cachedUser, isAuthenticated: true, isLoading: false });
          } else {
            // Clear invalid tokens
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        }
      },

      updateUser: async (data) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set({ isLoading: true });
        try {
          const updatedUser = await authApi.updateProfile(data);
          await offlineDb.cacheUser(updatedUser);
          set({ user: updatedUser, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Update failed',
          });
          throw error;
        }
      },

      switchMode: async (mode) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authApi.switchMode({ target_mode: mode });
          await offlineDb.cacheUser(updatedUser);
          set({ user: updatedUser, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Mode switch failed',
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user, isAuthenticated: true }),
    }),
    {
      name: 'smartagro-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
