import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';

export function GameOver() {
  const { winnerId, player, opponent, quitGame } = useGameStore();
  const navigate = useNavigate();

  let title = 'EMPATE!';
  let color = 'text-yellow-400';
  if (winnerId === player.id) {
    title = 'VITÓRIA!';
    color = 'text-green-400';
  } else if (winnerId === opponent.id) {
    title = 'DERROTA!';
    color = 'text-red-500';
  }

  const handleMainMenu = () => {
    quitGame();
    navigate('/menu');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-parchment p-8 rounded-2xl border-8 border-brown-dark max-w-md w-full flex flex-col items-center">
        <h1 className={`font-western text-6xl mb-6 ${color} drop-shadow-lg`}>{title}</h1>
        
        <div className="w-full bg-white/50 p-4 rounded-lg mb-8 font-stats text-lg text-brown-dark">
          <div className="flex justify-between border-b border-brown-dark/30 pb-2">
            <span>Seu Herói:</span>
            <span className="font-bold">{player.displayName}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span>Vilão:</span>
            <span className="font-bold">{opponent.displayName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          {/* Rematch could go here */}
          <button 
            onClick={() => window.location.reload()} // For solo rematch
            className="w-full py-4 bg-sand text-brown-dark font-western text-2xl rounded border-4 border-brown-dark hover:bg-sand-light transition-colors"
          >
            REVANCHE
          </button>
          <button 
            onClick={handleMainMenu}
            className="w-full py-4 bg-brown-dark text-gold font-western text-2xl rounded border-4 border-black hover:bg-brown-mid transition-colors"
          >
            MENU PRINCIPAL
          </button>
        </div>
      </div>
    </div>
  );
}
