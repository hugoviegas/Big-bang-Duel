import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseRoom } from '../../hooks/useFirebase';
import { useGameStore } from '../../store/gameStore';
import type { GameMode, Room as RoomType } from '../../types';

const CHARACTERS = [
  { id: 'marshal', name: 'The Marshal', img: '/assets/characters/the_marshal.webp' },
  { id: 'skull', name: 'The Skull', img: '/assets/characters/the_skull.webp' },
  { id: 'la_dama', name: 'La Dama', img: '/assets/characters/la_dama.webp' },
];

const MODES = [
  { id: 'beginner' as GameMode, name: 'INICIANTE', color: 'border-green-600/30' },
  { id: 'normal' as GameMode, name: 'NORMAL', color: 'border-yellow-600/30' },
  { id: 'advanced' as GameMode, name: 'AVANÇADO', color: 'border-red-600/30' },
];

export function OnlineLobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, getUserRooms } = useFirebaseRoom();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [selectedChar, setSelectedChar] = useState('marshal');
  const [selectedMode, setSelectedMode] = useState<GameMode>('normal');
  const [activeRooms, setActiveRooms] = useState<RoomType[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    const rooms = await getUserRooms();
    setActiveRooms(rooms);
    setLoadingRooms(false);
  };

  const handleCreate = async () => {
    const roomId = await createRoom(selectedMode);
    if (roomId) {
      // Initialize locally as host
      useGameStore.getState().initializeGame(selectedMode, true, true, roomId, undefined, selectedChar);
      navigate(`/game/${roomId}`);
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
      // Initialize locally as guest
      useGameStore.getState().initializeGame(selectedMode, true, false, joinCode.toUpperCase(), undefined, selectedChar);
      navigate(`/game/${joinCode.toUpperCase()}`);
    } else {
      setError('Sala não encontrada ou cheia');
    }
  };

  const resumeGame = (room: RoomType) => {
    navigate(`/game/${room.id}`);
  };

  return (
    <div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Configuration */}
        <div className="flex flex-col gap-4">
          <h1 className="font-western text-4xl text-gold text-center md:text-left text-glow-gold animate-drop-bounce">SALÃO ONLINE</h1>
          
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
            <h3 className="font-western text-[10px] text-sand/60 text-center mb-3 tracking-widest uppercase">2. Dificuldade</h3>
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

          {/* New Game Actions */}
          <div className="card-wood p-6 animate-fade-up animate-fade-up-delay-2">
            <button onClick={handleCreate} className="btn-western mb-4">
              CRIAR NOVINHA
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-sand/20" />
              <span className="font-western text-xs text-sand/40 tracking-widest uppercase">Ou Entrar</span>
              <div className="flex-1 h-px bg-sand/20" />
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="CÓDIGO" 
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                className="input-parchment text-center text-xl font-western uppercase tracking-[0.3em]"
              />
              {error && <div className="text-red-400 font-stats text-[10px] text-center">{error}</div>}
              <button type="submit" className="btn-western btn-sky py-2 text-sm">
                ENTRAR
              </button>
            </form>
          </div>
          
          <button onClick={() => navigate('/menu')} className="w-full text-center text-sand/50 font-western text-sm hover:text-sand transition-colors">
            VOLTAR AO MENU
          </button>
        </div>

        {/* Right Column: Active Rooms */}
        <div className="flex flex-col gap-4 animate-fade-up animate-fade-up-delay-3">
          <h2 className="font-western text-2xl text-sand-light text-center md:text-left">SUAS SALAS ATIVAS</h2>
          
          <div className="card-wood flex-1 p-4 min-h-[300px] overflow-y-auto">
            {loadingRooms ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
                <span className="font-western text-xs text-sand tracking-widest">PROCURANDO...</span>
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-western text-xs text-center px-8">Nenhuma sala ativa encontrada por aqui, cowboy.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRooms.map(room => (
                  <div key={room.id} className="bg-black/40 border border-gold/20 rounded-xl p-3 flex justify-between items-center hover:border-gold/50 transition-all group">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-western text-gold text-lg tracking-widest">{room.id}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border ${
                          room.status === 'waiting' ? 'border-yellow-500/50 text-yellow-500' : 'border-green-500/50 text-green-500'
                        } font-stats uppercase`}>
                          {room.status === 'waiting' ? 'Aguardando' : 'Em Jogo'}
                        </span>
                      </div>
                      <span className="text-[10px] text-sand/50 font-stats uppercase">
                        {room.hostName} vs {room.guestName || '???'} • {room.mode}
                      </span>
                    </div>
                    <button 
                      onClick={() => resumeGame(room)}
                      className="bg-gold/10 hover:bg-gold/20 border border-gold/30 px-4 py-1.5 rounded font-western text-[10px] text-gold tracking-widest transition-all group-hover:scale-105"
                    >
                      RETOMAR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


