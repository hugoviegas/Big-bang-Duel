import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Character } from './Character';
import { StatusBar } from './StatusBar';
import { CardHand } from './CardHand';
import { TurnResultOverlay } from './TurnResult';
import { GameOver } from './GameOver';
import { useNavigate } from 'react-router-dom';

export function GameArena() {
  const { player, opponent, phase, turn, lastResult } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    const state = useGameStore.getState();
    if (state.phase === 'idle') {
      navigate('/menu');
    }
  }, [navigate]);

  const isShaking = phase === 'animating' && lastResult && (lastResult.playerLifeLost > 0 || lastResult.opponentLifeLost > 0);

  return (
    <div className={`relative w-full min-h-[100svh] bg-[url('/assets/ui/bg_desert_portrait.png')] md:bg-[url('/assets/ui/bg_desert_landscape.png')] bg-cover bg-center overflow-hidden ${isShaking ? 'screen-shake' : ''}`}>
      {/* Atmosphere overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

      {/* Dust particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="dust-particle absolute rounded-full bg-sand/40 pointer-events-none z-0"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${10 + Math.random() * 80}%`,
            bottom: `${Math.random() * 20}%`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      {/* Main Layout */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col min-h-[100svh]">
        
        {/* ===== HEADER ===== */}
        <header className="flex justify-between items-center p-3 md:p-4">
          <div className="flex items-center gap-3">
            <img src="/assets/ui/logo_bbd.png" alt="BBD" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-lg" />
            <span className="font-western text-gold text-lg md:text-xl text-glow-gold hidden sm:block">BIG BANG DUEL</span>
          </div>
          <div className="bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gold/30">
            <span className="font-western text-gold text-sm md:text-base tracking-wider">TURNO {turn}</span>
          </div>
          <button 
            onClick={() => {
              useGameStore.getState().quitGame();
              navigate('/menu');
            }}
            className="bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-sand/30 font-western text-sand text-sm hover:bg-black/70 hover:border-gold/50 transition-all"
          >
            MENU
          </button>
        </header>

        {/* ===== STATUS BARS ===== */}
        <div className="flex justify-between items-start px-3 md:px-8 gap-2">
          <StatusBar player={player} />
          <div className="font-western text-gold text-2xl md:text-4xl text-glow-gold self-center opacity-60">VS</div>
          <StatusBar player={opponent} isRight />
        </div>

        {/* ===== ARENA — CHARACTERS ===== */}
        <div className="flex-1 flex items-end justify-between px-4 md:px-16 pb-4 md:pb-8 relative">
          <Character player={player} />
          <Character player={opponent} isRight />
        </div>
      </div>

      {/* ===== CARD HAND (Fixed Bottom) ===== */}
      <CardHand />

      {/* ===== OVERLAYS ===== */}
      {(phase === 'resolving' || phase === 'animating') && lastResult && (
        <TurnResultOverlay result={lastResult} />
      )}
      {phase === 'game_over' && <GameOver />}
    </div>
  );
}
