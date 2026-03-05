import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { SettingsModal } from '../components/common/SettingsModal';

export default function MenuPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSoloOptions, setShowSoloOptions] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const initializeGame = useGameStore((state) => state.initializeGame);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStartSolo = (diff: 'easy' | 'medium' | 'hard') => {
    initializeGame('normal', false, undefined, diff);
    navigate('/game');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/assets/ui/bg_desert_portrait.png')] md:bg-[url('/assets/ui/bg_desert_landscape.png')] bg-cover bg-center">
      <div className="flex flex-col items-center space-y-4 p-8 bg-brown-light/90 rounded-lg shadow-2xl border-4 border-brown-dark backdrop-blur w-full max-w-sm">
        <h1 className="text-6xl font-western text-gold mb-8 drop-shadow-md text-center line-clamp-2">BIG BANG<br/>DUEL</h1>
        
        {!showSoloOptions ? (
          <>
            <button
              onClick={() => setShowSoloOptions(true)}
              className="w-full py-3 bg-[#8B4513] text-sand-light font-western text-2xl border-2 border-[#5A2D0C] hover:bg-[#A0522D] shadow transition-colors"
            >
              JOGAR SOLO
            </button>
            <button
              onClick={() => navigate('/online')}
              className="w-full py-3 bg-[#8B4513] text-sand-light font-western text-2xl border-2 border-[#5A2D0C] hover:bg-[#A0522D] shadow transition-colors"
            >
              JOGAR ONLINE
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="w-full py-3 bg-[#8B4513] text-sand-light font-western text-2xl border-2 border-[#5A2D0C] hover:bg-[#A0522D] shadow transition-colors"
            >
              RANKING
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full py-3 bg-sky text-brown-dark font-western text-2xl border-2 border-[#5A2D0C] hover:bg-[#6CA0CC] shadow transition-colors"
            >
              ⚙ CONFIGURAÇÕES
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-red-west text-sand font-western text-2xl border-2 border-[#5A2D0C] hover:bg-red-700 shadow transition-colors mt-4"
            >
              SAIR
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4 animate-in slide-in-from-right">
            <h2 className="text-2xl font-western text-sand-light mb-2">Dificuldade do Bot</h2>
            <button
              onClick={() => handleStartSolo('easy')}
              className="w-full py-3 bg-green-700 text-sand-light font-western text-2xl border-2 border-[#5A2D0C] hover:bg-green-600 shadow transition-colors"
            >
              FÁCIL
            </button>
            <button
              onClick={() => handleStartSolo('medium')}
              className="w-full py-3 bg-yellow-600 text-sand-light font-western text-2xl border-2 border-[#5A2D0C] hover:bg-yellow-500 shadow transition-colors"
            >
              MÉDIO
            </button>
            <button
              onClick={() => handleStartSolo('hard')}
              className="w-full py-3 bg-red-west text-sand-light font-western text-2xl border-2 border-[#5A2D0C] hover:bg-red-700 shadow transition-colors"
            >
              DIFÍCIL
            </button>
            <button
              onClick={() => setShowSoloOptions(false)}
              className="w-full py-2 bg-transparent text-sand-light font-western text-xl underline mt-4"
            >
              VOLTAR
            </button>
          </div>
        )}

      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
