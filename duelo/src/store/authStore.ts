import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import type {
  User,
  UserPreferences,
  PlayerProfile,
  StatsByMode,
} from "../types";
import {
  createPlayerProfile,
  getPlayerProfile,
  generateUniquePlayerCode,
  setOnlinePresence,
  subscribeToPlayerProfile,
} from "../lib/firebaseService";
import {
  calculateProgression,
  normalizeCurrencies,
  normalizeRanked,
  normalizeUnlocks,
} from "../lib/progression";

type GlobalWithProfileUnsub = typeof globalThis & {
  __bbd_profile_unsub?: (() => void) | null;
};

function emptyStatsByMode(): StatsByMode {
  return {
    solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
    online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
    overall: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
  };
}

function normalizeStatsByModeFromUser(user: User): StatsByMode {
  const base = emptyStatsByMode();
  if (user.statsByMode) {
    return {
      solo: { ...base.solo, ...user.statsByMode.solo },
      online: { ...base.online, ...user.statsByMode.online },
      overall: { ...base.overall, ...user.statsByMode.overall },
    };
  }
  return {
    ...base,
    overall: {
      wins: user.wins ?? 0,
      losses: user.losses ?? 0,
      draws: user.draws ?? 0,
      totalGames: user.totalGames ?? 0,
      winRate: user.winRate ?? 0,
    },
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Timestamp of last successful ensureProfile call. Not persisted. */
  _profileEnsuredAt: number;
  setUser: (user: User | null) => void;
  /** Merges a partial User update into the current user object. */
  updateUser: (partial: Partial<User>) => void;
  /** Shortcut to update only the selected character (avatar field). */
  updateCharacter: (characterId: string) => void;
  /** Merges preference fields and updates the user.avatar if selectedCharacter is included. */
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
  /** Ensures the user has a Firestore profile with a unique player code. */
  ensureProfile: () => Promise<void>;
  /** Returns a PlayerProfile snapshot of the current user. */
  getProfile: () => PlayerProfile | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      _profileEnsuredAt: 0,
      // Real-time profile subscriber — kept outside the store state
      // so we can start/stop listeners when the logged user changes.
      setUser: (user) => {
        // Module-scoped unsubscribe handle (shared across store instance)
        const anyWindow = globalThis as GlobalWithProfileUnsub;
        if (anyWindow.__bbd_profile_unsub) {
          try {
            anyWindow.__bbd_profile_unsub();
          } catch (error) {
            void error;
          }
          anyWindow.__bbd_profile_unsub = null;
        }

        if (!user) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        // Start real-time listener for player's Firestore doc
        try {
          anyWindow.__bbd_profile_unsub = subscribeToPlayerProfile(
            user.uid,
            (profile) => {
              if (!profile) {
                // profile removed or not present — keep basic auth user
                set({
                  user: { ...user },
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
              }
              set({
                user: {
                  ...user,
                  playerCode: profile.playerCode || user.playerCode,
                  avatar: profile.avatar || user.avatar,
                  avatarPicture: profile.avatarPicture ?? user.avatarPicture,
                  wins: profile.wins ?? user.wins,
                  losses: profile.losses ?? user.losses,
                  draws: profile.draws ?? user.draws,
                  totalGames: profile.totalGames ?? user.totalGames,
                  winRate: profile.winRate ?? user.winRate,
                  statsByMode:
                    profile.statsByMode ?? normalizeStatsByModeFromUser(user),
                  progression:
                    profile.progression ??
                    calculateProgression(user.progression?.xpTotal ?? 0),
                  currencies:
                    profile.currencies ?? normalizeCurrencies(user.currencies),
                  ranked: profile.ranked ?? normalizeRanked(user.ranked),
                  unlocks: profile.unlocks ?? normalizeUnlocks(user.unlocks),
                  displayName: profile.displayName || user.displayName,
                  lastSeen: profile.lastSeen
                    ? new Date(profile.lastSeen)
                    : user.lastSeen,
                  onlineStatus: profile.onlineStatus ?? user.onlineStatus,
                },
                isAuthenticated: true,
                isLoading: false,
              });
            },
          );
        } catch (err) {
          void err;
          // fall back to setting user directly if subscription fails
          set({ user, isAuthenticated: !!user, isLoading: false });
        }
      },
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
        const currentUser = get().user;
        if (currentUser) {
          setOnlinePresence(currentUser.uid, "offline");
        }
        // Cleanup profile listener if present
        try {
          const anyWindow = globalThis as GlobalWithProfileUnsub;
          if (anyWindow.__bbd_profile_unsub) {
            anyWindow.__bbd_profile_unsub();
            anyWindow.__bbd_profile_unsub = null;
          }
        } catch (error) {
          void error;
        }
        signOut(auth).catch(() => {});
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          _profileEnsuredAt: 0,
        });
        localStorage.removeItem("bbd-auth-storage"); // Force clear on logout
      },

      ensureProfile: async () => {
        const current = get().user;
        if (!current) return;

        // Skip if already ensured within the last 5 minutes (this session)
        const FIVE_MIN = 5 * 60_000;
        if (Date.now() - get()._profileEnsuredAt < FIVE_MIN) return;

        try {
          // Check if profile already exists in Firestore
          const existing = await getPlayerProfile(current.uid);
          if (existing) {
            // Sync full profile from Firestore (stats, avatar, playerCode)
            get().setUser({
              ...current,
              playerCode: existing.playerCode || current.playerCode,
              avatar: existing.avatar || current.avatar,
              avatarPicture: existing.avatarPicture ?? current.avatarPicture,
              wins: existing.wins ?? current.wins,
              losses: existing.losses ?? current.losses,
              draws: existing.draws ?? current.draws,
              totalGames: existing.totalGames ?? current.totalGames,
              winRate: existing.winRate ?? current.winRate,
              statsByMode:
                existing.statsByMode ?? normalizeStatsByModeFromUser(current),
                progression:
                  existing.progression ??
                  calculateProgression(current.progression?.xpTotal ?? 0),
                currencies:
                  existing.currencies ?? normalizeCurrencies(current.currencies),
                ranked: existing.ranked ?? normalizeRanked(current.ranked),
                unlocks: existing.unlocks ?? normalizeUnlocks(current.unlocks),
              displayName: existing.displayName || current.displayName,
            });
            set({ _profileEnsuredAt: Date.now() });
            // Update presence
            setOnlinePresence(current.uid, "online");
            return;
          }

          // Generate unique code and create profile
          const playerCode = await generateUniquePlayerCode();
          const profile: PlayerProfile = {
            uid: current.uid,
            displayName: current.displayName,
            playerCode,
            avatar: current.avatar ?? "marshal",
            wins: current.wins ?? 0,
            losses: current.losses ?? 0,
            draws: current.draws ?? 0,
            totalGames: current.totalGames ?? 0,
            winRate: current.winRate ?? 0,
            statsByMode: normalizeStatsByModeFromUser(current),
            progression: calculateProgression(current.progression?.xpTotal ?? 0),
            currencies: normalizeCurrencies(current.currencies),
            ranked: normalizeRanked(current.ranked),
            unlocks: normalizeUnlocks(current.unlocks),
            createdAt: Date.now(),
            lastSeen: Date.now(),
            onlineStatus: "online",
          };
          await createPlayerProfile(profile);
          // Use setUser so we start the real-time listener immediately
          get().setUser({ ...current, playerCode });
          set({ _profileEnsuredAt: Date.now() });
          setOnlinePresence(current.uid, "online");
        } catch (err) {
          // Silently handle Firebase errors (permission denied, offline, etc.)
          console.warn("[authStore] ensureProfile failed:", err);
        }
      },

      getProfile: () => {
        const user = get().user;
        if (!user) return null;
        return {
          uid: user.uid,
          displayName: user.displayName,
          playerCode: user.playerCode ?? "",
          avatar: user.avatar ?? "marshal",
          avatarPicture: user.avatarPicture,
          wins: user.wins ?? 0,
          losses: user.losses ?? 0,
          draws: user.draws ?? 0,
          totalGames: user.totalGames ?? 0,
          winRate: user.winRate ?? 0,
          statsByMode: normalizeStatsByModeFromUser(user),
          progression: calculateProgression(user.progression?.xpTotal ?? 0),
          currencies: normalizeCurrencies(user.currencies),
          ranked: normalizeRanked(user.ranked),
          unlocks: normalizeUnlocks(user.unlocks),
          createdAt:
            user.createdAt instanceof Date
              ? user.createdAt.getTime()
              : Date.now(),
          lastSeen: Date.now(),
          onlineStatus: user.onlineStatus ?? "online",
        };
      },
    }),
    {
      name: "bbd-auth-storage",
      // Exclude session-only fields from localStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
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
