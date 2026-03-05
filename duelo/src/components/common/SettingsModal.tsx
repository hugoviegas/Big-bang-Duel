import { useSound } from '../../hooks/useSound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toggleMute, isMuted } = useSound();

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
        
        <div className="space-y-5">
          {/* Sound Toggle */}
          <div className="flex justify-between items-center bg-black/20 px-4 py-3 rounded-xl">
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
          <div className="bg-black/20 px-4 py-3 rounded-xl">
            <span className="font-western text-sm text-sand-light tracking-wider">IDIOMA</span>
            <select className="w-full mt-2 p-2 bg-parchment border-2 border-brown-dark rounded-lg font-stats text-brown-dark focus:outline-none focus:border-gold" defaultValue="pt-BR">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English</option>
            </select>
          </div>

          {/* Screen shake toggle (accessibility) */}
          <div className="flex justify-between items-center bg-black/20 px-4 py-3 rounded-xl">
            <div>
              <span className="font-western text-sm text-sand-light tracking-wider">SCREEN SHAKE</span>
              <p className="font-stats text-xs text-sand/50 mt-0.5">Vibração da tela ao tomar dano</p>
            </div>
            <div className="w-14 h-7 rounded-full border-2 bg-green-600 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] relative cursor-pointer">
              <div className="absolute top-0.5 left-7 w-5 h-5 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn-western btn-danger mt-6">
          FECHAR
        </button>
      </div>
    </div>
  );
}
