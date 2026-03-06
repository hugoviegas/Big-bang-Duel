import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      uid: 'user_' + Date.now(),
      email,
      displayName: displayName || 'Pistoleiro Anônimo',
      avatar: 'marshal',
      wins: 0,
      losses: 0,
      draws: 0,
      totalGames: 0,
      winRate: 0,
      createdAt: new Date()
    });
    navigate('/menu', { replace: true });
  };

  const handleGuestLogin = () => {
    // 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    setUser({
      uid: 'guest_' + Date.now(),
      email: '',
      displayName: 'Pistoleiro Forasteiro',
      avatar: 'marshal',
      wins: 0,
      losses: 0,
      draws: 0,
      totalGames: 0,
      winRate: 0,
      createdAt: new Date(),
      isGuest: true,
      expiresAt: expiresAt.getTime()
    });
    navigate('/menu', { replace: true });
  };

  return (
    <div className="w-full max-w-sm mx-4">
      {/* Logo */}
      <div className="text-center mb-8 animate-drop-bounce">
        <img 
          src="/assets/ui/logo_bbd.webp" 
          alt="Big Bang Duel" 
          className="w-48 h-auto mx-auto animate-logo-float drop-shadow-2xl"
        />
      </div>

      {/* Wanted Poster Card */}
      <div className="relative bg-parchment p-8 rounded-lg shadow-2xl border-4 border-brown-dark animate-fade-up">
        {/* Decorative nail holes */}
        <div className="absolute -top-2 left-6 w-4 h-4 rounded-full bg-brown-dark shadow-inner" />
        <div className="absolute -top-2 right-6 w-4 h-4 rounded-full bg-brown-dark shadow-inner" />
        
        {/* WANTED banner */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-sand px-8 py-1.5 border-3 border-brown-dark shadow-lg transform -rotate-1">
          <h2 className="font-western text-2xl text-brown-dark tracking-widest">
            {isRegistering ? 'REGISTRO' : 'PROCURADO'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegistering && (
            <div className="animate-fade-up">
              <label className="block font-western text-sm text-brown-dark mb-1 tracking-wider">NOME DE PISTOLEIRO</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Billy The Kid"
                className="input-parchment"
                minLength={3}
              />
            </div>
          )}
          <div>
            <label className="block font-western text-sm text-brown-dark mb-1 tracking-wider">EMAIL</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pistoleiro@oeste.com"
              className="input-parchment"
              required
            />
          </div>
          <div>
            <label className="block font-western text-sm text-brown-dark mb-1 tracking-wider">SENHA</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="input-parchment"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-western mt-4">
            {isRegistering ? 'CRIAR CONTA' : 'ENTRAR'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="font-stats text-brown-mid hover:text-red-west underline text-sm transition-colors"
          >
            {isRegistering ? 'Já tenho conta. Entrar.' : 'Novo por aqui? Criar conta.'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-brown-mid/40" />
          <span className="font-western text-xs text-brown-mid tracking-widest">OU</span>
          <div className="flex-1 h-px bg-brown-mid/40" />
        </div>

        {/* Guest Login */}
        <button 
          onClick={handleGuestLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-brown-dark border-2 border-brown-dark rounded-lg hover:bg-brown-900 transition-all font-western text-sand shadow-md hover:shadow-lg mb-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          ENTRAR COMO CONVIDADO
        </button>

        {/* Google OAuth */}
        <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-stats font-bold text-gray-700 shadow-md hover:shadow-lg">
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
