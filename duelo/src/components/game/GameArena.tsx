import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Character } from './Character';
import { StatusBar } from './StatusBar';
import { CardHand } from './CardHand';
import { TurnResultOverlay } from './TurnResult';
import { GameOver } from './GameOver';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatchSync } from '../../hooks/useFirebase';

export function GameArena() {
  const { player, opponent, phase, turn, lastResult } = useGameStore();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync with Firebase if online
  useMatchSync(roomId || null);

  const copyRoomCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const state = useGameStore.getState();
    // Only redirect if NOT in an online room AND phase is idle
    if (state.phase === 'idle' && !roomId) {
      navigate('/menu');
    }
  }, [navigate, roomId]);

  const isShaking = phase === 'animating' && lastResult && (lastResult.playerLifeLost > 0 || lastResult.opponentLifeLost > 0);

  return (
    <div className={`relative w-full min-h-[100svh] bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center overflow-hidden ${isShaking ? 'screen-shake' : ''}`}>
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
        <header className="relative p-3 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/ui/logo_bbd.webp" alt="BBD" className="w-8 h-8 md:w-12 md:h-12 object-contain drop-shadow-lg" />
            <span className="font-western text-gold text-sm md:text-xl text-glow-gold hidden xs:block">BIG BANG DUEL</span>
          </div>
          
          {/* Turn indicator - Absolute center */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="bg-black/60 backdrop-blur-sm px-4 md:px-8 py-1.5 rounded-full border border-gold/40 shadow-lg">
              <span className="font-western text-gold text-xs md:text-lg tracking-[0.2em]">TURNO {turn}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Room Code Info */}
            {roomId && (
              <div className="hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-gold/30 mr-2">
                <span className="font-western text-[10px] text-sand/60">SALA:</span>
                <span className="font-western text-gold text-xs tracking-widest min-w-[50px] text-center">
                  {showCode ? roomId : '••••••'}
                </span>
                <button 
                  onClick={() => setShowCode(!showCode)}
                  className="p-1 hover:text-gold text-sand/50"
                >
                  {showCode ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.06m2.72-2.31a9.96 9.96 0 015.26-1.63c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-7-7m11.375-1.125a9.982 9.982 0 00-6.25-6.25m-2.5-2.5a3 3 0 00-3.5 3.5m-3.5 3.5a3 3 0 003.5 3.5"/></svg>
                  )}
                </button>
                <button 
                  onClick={copyRoomCode}
                  className={`p-1 ${copied ? 'text-green-400' : 'hover:text-gold text-sand/50'}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                </button>
              </div>
            )}

            <button 
              onClick={() => {
                useGameStore.getState().quitGame();
                navigate('/menu');
              }}
              className="bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gold/30 font-western text-sand text-[10px] md:text-sm hover:bg-black/70 hover:border-gold/50 transition-all tracking-widest whitespace-nowrap"
            >
              MENU
            </button>
          </div>
        </header>

        {/* Mobile Room Code (visible below header only on mobile if available) */}
        {roomId && (
          <div className="flex sm:hidden justify-center mt-[-8px] mb-4">
             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-gold/30">
                <span className="font-western text-[10px] text-sand/60">SALA:</span>
                <span className="font-western text-gold text-xs tracking-widest min-w-[50px] text-center">
                  {showCode ? roomId : '••••••'}
                </span>
                <button onClick={() => setShowCode(!showCode)} className="p-1 hover:text-gold text-sand/50">
                  {showCode ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.06m2.72-2.31a9.96 9.96 0 015.26-1.63c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-7-7m11.375-1.125a9.982 9.982 0 00-6.25-6.25m-2.5-2.5a3 3 0 00-3.5 3.5m-3.5 3.5a3 3 0 003.5 3.5"/></svg>
                  )}
                </button>
                <button onClick={copyRoomCode} className={`p-1 ${copied ? 'text-green-400' : 'hover:text-gold text-sand/50'}`}>
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                </button>
              </div>
          </div>
        )}

        {/* ===== STATUS BARS ===== */}
        <div className="flex justify-between items-start px-3 md:px-8 gap-2 mt-2">
          <StatusBar player={player} />
          <div className="font-western text-gold text-2xl md:text-4xl text-glow-gold self-center opacity-60">VS</div>
          <StatusBar player={opponent} isRight />
        </div>

        {/* ===== ARENA — CHARACTERS ===== */}
        <div className="flex-1 flex items-end justify-between px-8 md:px-16 pb-75 sm:pb-56 md:pb-60 relative">
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
