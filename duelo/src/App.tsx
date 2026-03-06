import { Routes, Route, Navigate } from 'react-router-dom';
import IndexPage from './pages/index';
import MenuPage from './pages/menu';
import GamePage from './pages/game';
import OnlinePage from './pages/online';
import LeaderboardPage from './pages/leaderboard';
import { AssetPreloader } from './components/common/AssetPreloader';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AssetPreloader>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/game/:roomId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/online" element={<ProtectedRoute><OnlinePage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AssetPreloader>
  );
}

export default App;
