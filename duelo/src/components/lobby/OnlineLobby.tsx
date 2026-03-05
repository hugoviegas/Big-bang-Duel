import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseRoom } from '../../hooks/useFirebase';

export function OnlineLobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useFirebaseRoom();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const roomId = await createRoom('normal');
    if (roomId) {
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
      navigate(`/game?room=${joinCode.toUpperCase()}`);
    } else {
      setError('Sala não encontrada ou cheia');
    }
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Wooden Sign Board Container */}
      <div className="bg-brown-dark rounded-xl p-8 max-w-lg w-full text-center border-8 border-[#5A3215] shadow-2xl relative z-10">
        <h1 className="font-western text-6xl text-gold mb-8 drop-shadow-md">SALÃO ONLINE</h1>
        
        <div className="flex flex-col gap-6">
          {/* Create Room */}
          <button 
            onClick={handleCreate}
            className="w-full py-4 text-3xl font-western bg-[#8B4513] text-sand-light rounded-lg border-4 border-[#3b1f0a] hover:bg-[#A0522D] hover:scale-105 transition-all shadow-md"
          >
            CRIAR SALA
          </button>

          <div className="text-sand font-stats font-bold text-xl my-2">- OU -</div>

          {/* Join Room */}
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input 
              type="text" 
              placeholder="CÓDIGO DA SALA" 
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              className="text-center text-3xl font-western uppercase py-3 border-4 border-[#3b1f0a] bg-parchment text-black-ink focus:outline-none focus:border-gold"
            />
            {error && <div className="text-red-400 font-stats">{error}</div>}
            <button 
              type="submit"
              className="w-full py-4 text-3xl font-western bg-sky text-[#1a0a00] rounded-lg border-4 border-[#3b1f0a] hover:bg-[#6CA0CC] hover:scale-105 transition-all shadow-md"
            >
              ENTRAR NA SALA
            </button>
          </form>
        </div>

        <button 
          onClick={() => navigate('/menu')}
          className="mt-8 text-sand-light hover:text-gold font-western underline tracking-widest"
        >
          VOLTAR AO MENU
        </button>
      </div>

      {/* Decorative details */}
      <div className="absolute top-10 left-10 text-6xl opacity-20 rotate-45">🌵</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-20 -rotate-12">🤠</div>
    </div>
  );
}
