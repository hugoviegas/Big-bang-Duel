import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder login
    setUser({
      uid: 'user123',
      email,
      displayName: 'Pistoleiro Misterioso',
      avatar: 'marshal',
      wins: 0,
      losses: 0,
      draws: 0,
      totalGames: 0,
      winRate: 0,
      createdAt: new Date()
    });
    navigate('/menu');
  };

  return (
    <div className="w-full max-w-sm bg-[#f5e6c8] p-8 rounded-lg shadow-2xl relative border-4 border-[#3b1f0a] outline-double outline-8 outline-[#7b4a1e]">
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#d4a855] px-6 py-2 border-2 border-[#3b1f0a] shadow-md transform -rotate-2">
        <h2 className="font-western text-3xl text-[#1a0a00]">WANTED</h2>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div>
          <label className="block font-western text-[#3b1f0a]">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-white border-2 border-[#7b4a1e] font-stats focus:outline-none focus:border-[#d4a855]" 
          />
        </div>
        <div>
          <label className="block font-western text-[#3b1f0a]">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-white border-2 border-[#7b4a1e] font-stats focus:outline-none focus:border-[#d4a855]" 
          />
        </div>
        <button 
          type="submit" 
          className="w-full py-3 mt-6 bg-[#3b1f0a] hover:bg-[#7b4a1e] text-[#ffd700] font-western text-xl transition-colors border-2 border-black"
        >
          {isRegistering ? 'CRIAR CONTA' : 'ENTRAR'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="font-western text-[#7b4a1e] hover:text-[#c0392b] underline text-sm"
        >
          {isRegistering ? 'Já tenho uma conta. Entrar.' : 'Novo por aqui? Criar conta.'}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded hover:bg-gray-50 transition-colors font-stats font-bold text-gray-700">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
