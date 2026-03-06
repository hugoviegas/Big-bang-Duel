import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        set({ user: null, isAuthenticated: false, isLoading: false });
        localStorage.removeItem('bbd-auth-storage'); // Force clear on logout
      },
    }),
    {
      name: 'bbd-auth-storage',
      onRehydrateStorage: () => (state) => {
        // Hydration check for guest expiration
        if (state?.user?.isGuest && state.user.expiresAt) {
          const expiresAt = new Date(state.user.expiresAt).getTime();
          if (Date.now() > expiresAt) {
            console.log('Guest session expired');
            state.logout();
          }
        }
      }
    }
  )
);
