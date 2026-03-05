import type { PlayerState } from '../../types';

interface StatusBarProps {
  player: PlayerState;
  isRight?: boolean; // Flip for opponent
}

export function StatusBar({ player, isRight = false }: StatusBarProps) {
  const alignClass = isRight ? 'items-end text-right' : 'items-start text-left';
  
  return (
    <div className={`flex flex-col p-4 bg-black/60 border-2 border-brown-dark rounded-xl backdrop-blur-sm ${alignClass}`}>
      <h2 className="font-western text-2xl text-gold mb-2">{player.displayName}</h2>
      
      {/* Life */}
      <div className="flex gap-1 mb-2">
        {Array.from({ length: player.maxLife }).map((_, i) => (
          <div key={`life-${i}`} className={`w-6 h-6 rounded-full transition-colors duration-300 ${i < player.life ? 'bg-red-500' : 'bg-gray-600'}`}>
            <span className="sr-only">Heart</span>
          </div>
        ))}
      </div>
      
      {/* Ammo */}
      <div className="flex gap-1">
        {Array.from({ length: player.maxAmmo }).map((_, i) => (
          <div key={`ammo-${i}`} className={`w-4 h-8 rounded-sm transition-colors duration-300 ${i < player.ammo ? 'bg-yellow-400' : 'bg-gray-800'}`}>
            <span className="sr-only">Bullet</span>
          </div>
        ))}
      </div>
    </div>
  );
}
