import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Character } from './Character';
import { StatusBar } from './StatusBar';
import { CardHand } from './CardHand';
import { TurnResultOverlay } from './TurnResult';
import { GameOver } from './GameOver';
import { useNavigate } from 'react-router-dom';

export function GameArena() {
  const { player, opponent, phase, lastResult } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    // If we land here directly via URL, just send back to menu to enforce flow
    const state = useGameStore.getState();
    if (state.phase === 'idle') {
      navigate('/menu');
    }
  }, [navigate]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[url('/assets/ui/bg_desert_portrait.png')] md:bg-[url('/assets/ui/bg_desert_landscape.png')] bg-cover bg-center overflow-hidden font-western">
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Main UI Container */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto flex flex-col p-4">
        
        {/* Header Area */}
        <header className="flex justify-between items-center mb-8 bg-black/30 p-2 rounded-lg backdrop-blur text-sand-light">
          <div className="text-2xl font-bold tracking-widest drop-shadow">BIG BANG DUEL</div>
          <div className="text-xl">TURNO: {useGameStore.getState().turn}</div>
          <button className="text-xl px-4 py-1 hover:bg-black/50 rounded transition-colors">⚙️ MENU</button>
        </header>

        {/* Status Bars */}
        <div className="flex justify-between items-start mb-12">
          <StatusBar player={player} />
          <StatusBar player={opponent} isRight />
        </div>

        {/* Arena Layer */}
        <div className="flex-1 flex justify-between items-end pb-48 px-4 md:px-24">
          <Character player={player} />
          <Character player={opponent} isRight />
        </div>
        
      </div>

      {/* Overlays */}
      <CardHand />
      {phase === 'resolving' || phase === 'animating' ? (
        <TurnResultOverlay narrative={lastResult?.narrative || ''} />
      ) : null}
      
      {phase === 'game_over' && <GameOver />}
    </div>
  );
}
