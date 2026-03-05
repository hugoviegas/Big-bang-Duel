import { motion } from 'framer-motion';
import type { PlayerState } from '../../types';

interface CharacterProps {
  player: PlayerState;
  isRight?: boolean;
}

export function Character({ player, isRight = false }: CharacterProps) {
  const charVariants = {
    idle:    { y: [0, -8, 0], transition: { repeat: Infinity, duration: 2 } },
    shoot:   { x: [0, 20, 0], transition: { duration: 0.3 } },
    dodge:   { x: [0, -60, 0], y: [0, -30, 0], transition: { duration: 0.4 } },
    reload:  { rotate: [0, -10, 0], transition: { duration: 0.5 } },
    hit:     { x: [0, -20, 20, -10, 0], transition: { duration: 0.4 } },
    death:   { y: [0, 100], opacity: [1, 0.5, 0], transition: { duration: 0.8 } },
    counter: { scale: [1, 1.3, 0.9, 1.1, 1], transition: { duration: 0.5 } },
  };

  // Flip opponent to face player if needed
  const scaleX = isRight ? -1 : 1;

  // Render a placeholder or the actual image
  // We use Framer Motion variants to animate a static PNG.
  const getImageForAvatar = (avatar: string) => {
    if (avatar === 'marshal' || avatar === 'player1') return '/assets/characters/the_marshal.png';
    if (avatar === 'villain' || avatar === 'bot') return '/assets/characters/the_skull.png';
    return '/assets/characters/the_marshal.png'; // default fallback
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-64 h-80">
      <motion.img
        src={getImageForAvatar(player.avatar)}
        alt={player.displayName}
        variants={charVariants}
        animate={player.currentAnimation}
        initial="idle"
        style={{ scaleX }}
        className="w-full h-full object-contain filter drop-shadow-2xl z-10"
      />
      {/* Action Text Badge */}
      <div className="absolute -bottom-8 bg-black/60 text-sand-light px-4 py-1 rounded-full font-western tracking-widest text-sm whitespace-nowrap z-20 border-2 border-brown-dark shadow-md">
        {player.isAnimating ? player.currentAnimation.toUpperCase() : 'AGUARDANDO...'}
      </div>
    </div>
  );
}
