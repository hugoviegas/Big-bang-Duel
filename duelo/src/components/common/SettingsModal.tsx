import { useSound } from '../../hooks/useSound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toggleMute, isMuted } = useSound();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-parchment p-8 rounded-2xl border-8 border-brown-dark max-w-sm w-full font-western text-brown-dark relative">
        <button 
          onClick={onClose}
          className="absolute top-2 right-4 text-3xl hover:text-red-west transition-colors"
        >
          &times;
        </button>
        
        <h2 className="text-4xl text-center mb-8 border-b-4 border-brown-dark/30 pb-2">CONFIGURAÇÕES</h2>
        
        <div className="flex flex-col gap-6 font-stats text-xl font-bold">
          <div className="flex justify-between items-center">
            <span>SOM / MÚSICA</span>
            <button 
              onClick={toggleMute}
              className={`w-16 h-8 rounded-full border-2 border-brown-dark relative transition-colors ${isMuted ? 'bg-gray-400' : 'bg-green-500'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${isMuted ? 'left-1' : 'right-1'}`} />
            </button>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <span className="text-sm uppercase text-brown-mid">Idioma</span>
            <select className="p-2 border-2 border-brown-dark rounded bg-sand-light font-stats" defaultValue="pt-BR">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-3 bg-red-west text-gold text-2xl rounded border-4 border-brown-dark hover:bg-red-700 transition-colors shadow-md"
        >
          CONFIRMAR
        </button>
      </div>
    </div>
  );
}
