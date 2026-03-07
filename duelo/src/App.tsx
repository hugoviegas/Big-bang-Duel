import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
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
import { useAuthStore } from "./store/authStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Listen to Firebase Auth state changes.
    // - On logout: clear Zustand store.
    // - On login (or app reload with active session): if the store doesn't
    //   match Firebase, restore a minimal user object so ensureProfile() can
    //   load the full profile from Firestore. This handles the case where
    //   localStorage was cleared but Firebase Auth is still active.
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
            online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
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

  return (
    <AssetPreloader>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <MenuPage />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/online"
          element={
            <ProtectedRoute>
              <OnlinePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/characters"
          element={
            <ProtectedRoute>
              <CharactersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/design-system"
          element={
            <ProtectedRoute>
              <DesignSystemPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AssetPreloader>
  );
}

export default App;
