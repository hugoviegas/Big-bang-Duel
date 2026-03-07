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
import FriendsPage from "./pages/friends";
import DesignSystemPage from "./pages/design-system";
import { AssetPreloader } from "./components/common/AssetPreloader";
import { MobileLayout } from "./components/layout/MobileLayout";
import { useAuthStore } from "./store/authStore";

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

      if (!store.user || store.user.uid !== firebaseUser.uid) {
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
          createdAt: new Date(),
          isGuest: firebaseUser.isAnonymous,
        });
      }
    });
    return unsub;
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
          path="/friends"
          element={
            <MobilePage>
              <FriendsPage />
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
