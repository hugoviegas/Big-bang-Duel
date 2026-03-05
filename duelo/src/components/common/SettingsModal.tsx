import { useState, useEffect } from 'react';
import { useSound } from '../../hooks/useSound';
import { useAuthStore } from '../../store/authStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toggleMute, isMuted } = useSound();
  const { user, setUser } = useAuthStore();
  const [tempName, setTempName] = useState(user?.displayName || '');

  useEffect(() => {
    if (user?.displayName) {
      setTempName(user.displayName);
    }
  }, [user?.displayName, isOpen]);

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && tempName.trim().length >= 3) {
      setUser({ ...user, displayName: tempName.trim() });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card-wood p-6 md:p-8 max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-west/60 text-sand text-xl transition-colors"
        >
          &times;
        </button>
        
        <h2 className="font-western text-3xl text-gold text-center mb-6 text-glow-gold">CONFIGURAÇÕES</h2>
        
        <div className="space-y-4">
          {/* Change Name */}
          <form onSubmit={handleUpdateName} className="bg-black/20 px-4 py-3 rounded-xl border border-gold/10">
            <label className="font-western text-sm text-sand-light tracking-wider block mb-2">NOME DO PISTOLEIRO</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="input-parchment py-1.5 px-3 text-sm flex-1"
                placeholder="Ex: Billy The Kid"
              />
              <button 
                type="submit" 
                disabled={tempName === user?.displayName || tempName.trim().length < 3}
                className="px-3 bg-gold/20 hover:bg-gold/40 border border-gold/30 rounded text-gold font-western text-xs disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                SALVAR
              </button>
            </div>
            {tempName.trim().length < 3 && tempName.length > 0 && (
              <p className="text-[10px] text-red-west mt-1 font-stats uppercase">Mínimo 3 letras</p>
            )}
          </form>

          {/* Sound Toggle */}
          <div className="flex justify-between items-center bg-black/20 px-4 py-3 rounded-xl border border-gold/10">
            <div>
              <span className="font-western text-sm text-sand-light tracking-wider">SOM / MÚSICA</span>
              <p className="font-stats text-xs text-sand/50 mt-0.5">{isMuted ? 'Desativado' : 'Ativado'}</p>
            </div>
            <button 
              onClick={toggleMute}
              className={`w-14 h-7 rounded-full border-2 relative transition-all duration-300 ${
                isMuted 
                  ? 'bg-gray-600 border-gray-500' 
                  : 'bg-green-600 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                isMuted ? 'left-1' : 'left-7'
              }`} />
            </button>
          </div>
          
          {/* Language */}
          <div className="bg-black/20 px-4 py-3 rounded-xl border border-gold/10">
            <span className="font-western text-sm text-sand-light tracking-wider">IDIOMA</span>
            <select className="w-full mt-1 p-2 bg-parchment border-2 border-brown-dark rounded-lg font-stats text-brown-dark focus:outline-none focus:border-gold text-xs" defaultValue="pt-BR">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English</option>
            </select>
          </div>

          {/* Screen shake toggle (accessibility) */}
          <div className="flex justify-between items-center bg-black/20 px-4 py-3 rounded-xl border border-gold/10">
            <div>
              <span className="font-western text-sm text-sand-light tracking-wider uppercase">Vibração da Tela</span>
              <p className="font-stats text-[10px] text-sand/50">Efeitos de impacto</p>
            </div>
            <div className="w-12 h-6 rounded-full border-2 bg-green-600 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] relative cursor-pointer">
              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn-western btn-danger mt-6 py-2 text-sm">
          FECHAR
        </button>
      </div>
    </div>
  );
}

