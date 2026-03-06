import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { SettingsModal } from '../components/common/SettingsModal';
import type { GameMode, BotDifficulty } from '../types';

type MenuStep = 'main' | 'solo_character' | 'solo_mode' | 'solo_difficulty';

const CHARACTERS = [
  { id: 'marshal', name: 'The Marshal', img: '/assets/characters/the_marshal.webp', desc: 'O Xerife destemido' },
  { id: 'skull', name: 'The Skull', img: '/assets/characters/the_skull.webp', desc: 'O fora-da-lei' },
  { id: 'la_dama', name: 'La Dama', img: '/assets/characters/la_dama.webp', desc: 'A pistoleira lendária' },
];

const MODES = [
  { id: 'beginner' as GameMode, name: 'INICIANTE', desc: '3 vidas, 3 cartas', color: 'from-green-700 to-green-900' },
  { id: 'normal' as GameMode, name: 'NORMAL', desc: '4 vidas, 4 cartas (Tiro Duplo)', color: 'from-yellow-600 to-yellow-800' },
  { id: 'advanced' as GameMode, name: 'AVANÇADO', desc: '4 vidas, 5 cartas (Contra-golpe)', color: 'from-red-700 to-red-900' },
];

const DIFFICULTIES = [
  { id: 'easy' as BotDifficulty, name: 'FÁCIL', desc: 'Bot aleatório', color: 'from-green-600 to-green-800' },
  { id: 'medium' as BotDifficulty, name: 'MÉDIO', desc: 'Bot com estratégia', color: 'from-yellow-600 to-yellow-800' },
  { id: 'hard' as BotDifficulty, name: 'DIFÍCIL', desc: 'Bot lê seus padrões', color: 'from-red-700 to-red-900' },
];

export default function MenuPage() {
  const [step, setStep] = useState<MenuStep>('main');
  const [selectedCharacter, setSelectedCharacter] = useState('marshal');
  const [selectedMode, setSelectedMode] = useState<GameMode>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const initializeGame = useGameStore((state) => state.initializeGame);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleStartSolo = (diff: BotDifficulty) => {
    initializeGame(selectedMode, false, false, undefined, diff, selectedCharacter);
    navigate('/game');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />
      
      {/* Tumbleweed */}
      <div className="animate-tumbleweed absolute bottom-16 w-10 h-10 rounded-full border-2 border-brown-mid/40 opacity-30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        
        {/* ===== MAIN MENU ===== */}
        {step === 'main' && (
          <div className="flex flex-col items-center">
            {/* Logo */}
            <img 
              src="/assets/ui/logo_bbd.webp" 
              alt="Big Bang Duel" 
              className="w-56 md:w-64 h-auto mb-8 animate-drop-bounce animate-logo-float drop-shadow-2xl"
            />

            {/* Player info */}
            {user && (
              <div className="bg-black/50 backdrop-blur-sm px-6 py-2 rounded-full mb-6 flex items-center gap-3 border border-gold/30 animate-fade-up">
                <img src={CHARACTERS.find(c => c.id === (user.avatar || 'marshal'))?.img || CHARACTERS[0].img} alt="" className="w-8 h-8 object-contain" />
                <span className="font-western text-gold text-sm tracking-wider">{user.displayName}</span>
              </div>
            )}

            {/* Menu Buttons */}
            <div className="w-full space-y-3">
              <button onClick={() => setStep('solo_character')} className="btn-western animate-fade-up animate-fade-up-delay-1">
                JOGAR SOLO
              </button>
              <button onClick={() => navigate('/online')} className="btn-western animate-fade-up animate-fade-up-delay-2">
                JOGAR ONLINE
              </button>
              <button onClick={() => navigate('/leaderboard')} className="btn-western animate-fade-up animate-fade-up-delay-3">
                RANKING
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="btn-western btn-sky animate-fade-up animate-fade-up-delay-4">
                CONFIGURAÇÕES
              </button>
              <button onClick={handleLogout} className="btn-western btn-danger animate-fade-up animate-fade-up-delay-5">
                SAIR
              </button>
            </div>
          </div>
        )}

        {/* ===== CHARACTER SELECTION ===== */}
        {step === 'solo_character' && (
          <div className="card-wood p-6 animate-fade-up">
            <h2 className="font-western text-3xl text-gold text-center mb-6 text-glow-gold">ESCOLHA SEU PISTOLEIRO</h2>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacter(char.id)}
                  className={`flex flex-col items-center p-3 rounded-xl border-3 transition-all duration-300 ${
                    selectedCharacter === char.id
                      ? 'border-gold bg-gold/20 shadow-lg shadow-gold/30 scale-105'
                      : 'border-brown-mid/50 bg-black/20 hover:border-sand hover:bg-black/30'
                  }`}
                >
                  <img
                    src={char.img}
                    alt={char.name}
                    className={`w-20 h-24 object-contain mb-2 transition-transform duration-300 drop-shadow-lg ${
                      selectedCharacter === char.id ? 'scale-110' : ''
                    }`}
                  />
                  <span className="font-western text-xs text-sand-light tracking-wider text-center leading-tight">{char.name}</span>
                  <span className="text-[10px] text-sand/60 font-stats mt-0.5">{char.desc}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('solo_mode')} className="btn-western">
              CONFIRMAR
            </button>
            <button onClick={() => setStep('main')} className="w-full mt-3 text-center text-sand/60 font-western text-sm hover:text-sand transition-colors">
              VOLTAR
            </button>
          </div>
        )}

        {/* ===== MODE SELECTION ===== */}
        {step === 'solo_mode' && (
          <div className="card-wood p-6 animate-fade-up">
            <h2 className="font-western text-3xl text-gold text-center mb-6 text-glow-gold">MODO DE JOGO</h2>
            
            <div className="space-y-3 mb-6">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`w-full p-4 rounded-xl border-3 text-left transition-all duration-200 ${
                    selectedMode === mode.id
                      ? 'border-gold bg-gradient-to-r ' + mode.color + ' shadow-lg shadow-gold/20 scale-[1.02]'
                      : 'border-brown-mid/50 bg-black/20 hover:border-sand'
                  }`}
                >
                  <div className="font-western text-xl text-sand-light tracking-wider">{mode.name}</div>
                  <div className="font-stats text-sm text-sand/70 mt-1">{mode.desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('solo_difficulty')} className="btn-western">
              AVANÇAR
            </button>
            <button onClick={() => setStep('solo_character')} className="w-full mt-3 text-center text-sand/60 font-western text-sm hover:text-sand transition-colors">
              VOLTAR
            </button>
          </div>
        )}

        {/* ===== BOT DIFFICULTY ===== */}
        {step === 'solo_difficulty' && (
          <div className="card-wood p-6 animate-fade-up">
            <h2 className="font-western text-3xl text-gold text-center mb-2 text-glow-gold">DIFICULDADE</h2>
            <p className="text-center text-sand/60 font-stats text-sm mb-6">Quão perigoso é seu oponente?</p>
            
            <div className="space-y-3 mb-6">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff.id}
                  onClick={() => handleStartSolo(diff.id)}
                  className={`w-full p-4 rounded-xl border-3 border-brown-mid/50 bg-gradient-to-r ${diff.color} text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-sand active:scale-100`}
                >
                  <div className="font-western text-xl text-sand-light tracking-wider">{diff.name}</div>
                  <div className="font-stats text-sm text-sand/70 mt-1">{diff.desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('solo_mode')} className="w-full text-center text-sand/60 font-western text-sm hover:text-sand transition-colors">
              VOLTAR
            </button>
          </div>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
