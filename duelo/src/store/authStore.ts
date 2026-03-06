import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserPreferences } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  /** Merges a partial User update into the current user object. */
  updateUser: (partial: Partial<User>) => void;
  /** Shortcut to update only the selected character (avatar field). */
  updateCharacter: (characterId: string) => void;
  /** Merges preference fields and updates the user.avatar if selectedCharacter is included. */
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),
      updateUser: (partial) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...partial } });
      },
      updateCharacter: (characterId) => {
        const current = get().user;
        if (!current) return;
        set({
          user: {
            ...current,
            avatar: characterId,
            preferences: {
              selectedCharacter: characterId,
              defaultMode: current.preferences?.defaultMode ?? "normal",
              defaultAttackTimer: current.preferences?.defaultAttackTimer ?? 10,
              defaultBestOf3: current.preferences?.defaultBestOf3 ?? false,
              defaultIsPublic: current.preferences?.defaultIsPublic ?? false,
            },
          },
        });
      },
      updatePreferences: (prefs) => {
        const current = get().user;
        if (!current) return;
        const merged: UserPreferences = {
          selectedCharacter:
            current.preferences?.selectedCharacter ??
            current.avatar ??
            "marshal",
          defaultMode: current.preferences?.defaultMode ?? "normal",
          defaultAttackTimer: current.preferences?.defaultAttackTimer ?? 10,
          defaultBestOf3: current.preferences?.defaultBestOf3 ?? false,
          defaultIsPublic: current.preferences?.defaultIsPublic ?? false,
          ...prefs,
        };
        set({
          user: {
            ...current,
            // Keep avatar in sync with selectedCharacter
            avatar: merged.selectedCharacter,
            preferences: merged,
          },
        });
      },
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        set({ user: null, isAuthenticated: false, isLoading: false });
        localStorage.removeItem("bbd-auth-storage"); // Force clear on logout
      },
    }),
    {
      name: "bbd-auth-storage",
      onRehydrateStorage: () => (state) => {
        // Hydration check for guest expiration
        if (state?.user?.isGuest && state.user.expiresAt) {
          const expiresAt = new Date(state.user.expiresAt).getTime();
          if (Date.now() > expiresAt) {
            console.log("Guest session expired");
            state.logout();
          }
        }
      },
    },
  ),
);
