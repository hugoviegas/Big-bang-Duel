import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseRoom } from '../../hooks/useFirebase';
import { useGameStore } from '../../store/gameStore';
import type { GameMode } from '../../types';

const CHARACTERS = [
  { id: 'marshal', name: 'The Marshal', img: '/assets/characters/the_marshal.png' },
  { id: 'skull', name: 'The Skull', img: '/assets/characters/the_skull.png' },
  { id: 'la_dama', name: 'La Dama', img: '/assets/characters/la_dama.png' },
];

const MODES = [
  { id: 'beginner' as GameMode, name: 'INICIANTE', color: 'border-green-600/30' },
  { id: 'normal' as GameMode, name: 'NORMAL', color: 'border-yellow-600/30' },
  { id: 'advanced' as GameMode, name: 'AVANÇADO', color: 'border-red-600/30' },
];

export function OnlineLobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useFirebaseRoom();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [selectedChar, setSelectedChar] = useState('marshal');
  const [selectedMode, setSelectedMode] = useState<GameMode>('normal');

  const handleCreate = async () => {
    const roomId = await createRoom(selectedMode);
    if (roomId) {
      // Initialize locally as host
      useGameStore.getState().initializeGame(selectedMode, true, roomId, undefined, selectedChar);
      navigate(`/game?room=${roomId}`);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) {
      setError('Código deve ter 6 caracteres');
      return;
    }
    const success = await joinRoom(joinCode.toUpperCase());
    if (success) {
      // Initialize locally as guest (mode will be updated via sync, but we use selectedMode as initial)
      useGameStore.getState().initializeGame(selectedMode, true, joinCode.toUpperCase(), undefined, selectedChar);
      navigate(`/game?room=${joinCode.toUpperCase()}`);
    } else {
      setError('Sala não encontrada ou cheia');
    }
  };

  return (
    <div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.png')] md:bg-[url('/assets/ui/bg_desert_landscape.png')] bg-cover bg-center flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Title */}
        <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-6 text-glow-gold animate-drop-bounce">SALÃO ONLINE</h1>

        <div className="space-y-4">
          {/* Character Selection */}
          <div className="card-wood p-4 animate-fade-up">
            <h3 className="font-western text-[10px] text-sand/60 text-center mb-3 tracking-widest uppercase">1. Seu Pistoleiro</h3>
            <div className="flex justify-center gap-3">
              {CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedChar(char.id)}
                  className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                    selectedChar === char.id
                      ? 'border-gold bg-gold/15 scale-105'
                      : 'border-transparent hover:border-sand/30'
                  }`}
                >
                  <img src={char.img} alt={char.name} className="w-14 h-18 object-contain drop-shadow-lg" />
                  <span className="font-western text-[10px] text-sand-light mt-1">{char.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selection */}
          <div className="card-wood p-4 animate-fade-up animate-fade-up-delay-1">
            <h3 className="font-western text-[10px] text-sand/60 text-center mb-3 tracking-widest uppercase">2. Dificuldade do Jogo</h3>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`py-2 px-1 rounded-lg border-2 font-western text-[10px] tracking-tighter transition-all ${
                    selectedMode === mode.id
                      ? 'border-gold bg-gold/20 text-gold scale-105'
                      : `${mode.color} bg-black/20 text-sand/60 hover:border-sand/40`
                  }`}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="card-wood p-6 animate-fade-up animate-fade-up-delay-2">
            <button onClick={handleCreate} className="btn-western mb-4">
              CRIAR SALA
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-sand/20" />
              <span className="font-western text-xs text-sand/40 tracking-widest">OU</span>
              <div className="flex-1 h-px bg-sand/20" />
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="CÓDIGO DA SALA" 
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                className="input-parchment text-center text-xl md:text-2xl font-western uppercase tracking-[0.3em]"
              />
              {error && <div className="text-red-400 font-stats text-xs text-center">{error}</div>}
              <button type="submit" className="btn-western btn-sky py-2 text-sm">
                ENTRAR NA SALA
              </button>
            </form>
          </div>
        </div>

        <button 
          onClick={() => navigate('/menu')}
          className="w-full mt-4 text-center text-sand/50 font-western text-sm hover:text-sand transition-colors"
        >
          VOLTAR AO MENU
        </button>
      </div>
    </div>
  );
}

