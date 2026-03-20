import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { loadStrategies } from "./lib/strategyLoader";
import IndexPage from "./pages/index";
import MenuPage from "./pages/menu";
import GamePage from "./pages/game";
import OnlinePage from "./pages/online";
import LeaderboardPage from "./pages/leaderboard";
import CharactersPage from "./pages/characters";
import ProfilePage from "./pages/profile";
import AchievementsPage from "./pages/achievements";
import FriendsPage from "./pages/friends";
import ShopPage from "./pages/shop";
import DesignSystemPage from "./pages/design-system";
import MatchHistoryPage from "./pages/matchHistory";
import { AssetPreloader } from "./components/common/AssetPreloader";
import { MobileLayout } from "./components/layout/MobileLayout";
import { useAuthStore } from "./store/authStore";
import {
  calculateProgression,
  DEFAULT_CURRENCIES,
  DEFAULT_RANKED,
  DEFAULT_UNLOCKS,
  normalizeClassMastery,
} from "./lib/progression";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Wraps a page in MobileLayout + ProtectedRoute */
function MobilePage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MobileLayout>{children}</MobileLayout>
    </ProtectedRoute>
  );
}

function App() {
  useEffect(() => {
    // Listen to Firebase Auth state changes.
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      const store = useAuthStore.getState();

      if (!firebaseUser) {
        if (store.user) store.setUser(null);
        return;
      }

      // Always call setUser to ensure the real-time Firestore listener is
      // (re)started. On page refresh the zustand/persist middleware restores
      // user from localStorage, so store.user.uid === firebaseUser.uid, but
      // the listener was lost when the page unloaded — we must restart it.
      // When the user already exists in the store we pass the preserved data
      // so the UI doesn't flash zeroed stats while Firebase loads.
      const existingUser = store.user;
      if (existingUser?.uid === firebaseUser.uid) {
        store.setUser(existingUser);
      } else {
        store.setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "Pistoleiro",
          playerCode: "",
          avatar: "marshal",
          wins: 0,
          losses: 0,
          draws: 0,
          totalGames: 0,
          winRate: 0,
          statsByMode: {
            solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
            online: {
              wins: 0,
              losses: 0,
              draws: 0,
              totalGames: 0,
              winRate: 0,
            },
            overall: {
              wins: 0,
              losses: 0,
              draws: 0,
              totalGames: 0,
              winRate: 0,
            },
          },
          progression: calculateProgression(0),
          currencies: { ...DEFAULT_CURRENCIES },
          ranked: { ...DEFAULT_RANKED },
          unlocks: { ...DEFAULT_UNLOCKS },
          classMastery: normalizeClassMastery(undefined),
          createdAt: new Date(),
          isGuest: firebaseUser.isAnonymous,
        });
      }

      // Ensure the player has a Firestore profile document. Creates it for
      // new users and validates fields for existing ones. Runs at most once
      // every 5 minutes per session (guarded inside ensureProfile).
      store.ensureProfile().catch(() => {});
    });
    return unsub;
  }, []);

  useEffect(() => {
    const syncOnReconnect = () => {
      const store = useAuthStore.getState();
      if (!store.user) return;
      store.ensureProfile().catch(() => {});
    };

    window.addEventListener("online", syncOnReconnect);
    return () => window.removeEventListener("online", syncOnReconnect);
  }, []);

  // Load AI strategy files (non-blocking)
  useEffect(() => {
    loadStrategies();
  }, []);

  return (
    <AssetPreloader>
      <Routes>
        {/* Auth — no MobileLayout */}
        <Route path="/" element={<IndexPage />} />

        {/* Game — own full-screen layout */}
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:roomId"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />

        {/* All other pages — wrapped in MobileLayout */}
        <Route
          path="/menu"
          element={
            <MobilePage>
              <MenuPage />
            </MobilePage>
          }
        />
        <Route
          path="/online"
          element={
            <MobilePage>
              <OnlinePage />
            </MobilePage>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <MobilePage>
              <LeaderboardPage />
            </MobilePage>
          }
        />
        <Route
          path="/characters"
          element={
            <MobilePage>
              <CharactersPage />
            </MobilePage>
          }
        />
        <Route
          path="/profile"
          element={
            <MobilePage>
              <ProfilePage />
            </MobilePage>
          }
        />
        <Route
          path="/profile/:uid"
          element={
            <MobilePage>
              <ProfilePage />
            </MobilePage>
          }
        />
        <Route
          path="/achievements"
          element={
            <MobilePage>
              <AchievementsPage />
            </MobilePage>
          }
        />
        <Route
          path="/friends"
          element={
            <MobilePage>
              <FriendsPage />
            </MobilePage>
          }
        />
        <Route
          path="/match-history"
          element={
            <MobilePage>
              <MatchHistoryPage />
            </MobilePage>
          }
        />
        <Route
          path="/shop"
          element={
            <MobilePage>
              <ShopPage />
            </MobilePage>
          }
        />
        <Route
          path="/design-system"
          element={
            <MobilePage>
              <DesignSystemPage />
            </MobilePage>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AssetPreloader>
  );
}

export default App;
