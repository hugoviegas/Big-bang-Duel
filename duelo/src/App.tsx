import { Routes, Route } from 'react-router-dom';
import IndexPage from './pages/index';
import MenuPage from './pages/menu';
import GamePage from './pages/game';
import OnlinePage from './pages/online';
import LeaderboardPage from './pages/leaderboard';
import { AssetPreloader } from './components/common/AssetPreloader';

function App() {
  return (
    <AssetPreloader>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/online" element={<OnlinePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<IndexPage />} />
      </Routes>
    </AssetPreloader>
  );
}

export default App;
