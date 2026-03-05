import { motion } from 'framer-motion';
import type { TurnResult } from '../../types';

interface TurnResultProps {
  result: TurnResult;
}

const CARD_IMAGES: Record<string, string> = {
  shot: '/assets/cards/card_shoot.png',
  double_shot: '/assets/cards/card_double_shoot.png',
  dodge: '/assets/cards/card_dodge.png',
  reload: '/assets/cards/card_reload.png',
  counter: '/assets/cards/card_counter.png'
};

const CARD_LABELS: Record<string, string> = {
  shot: 'Tiro',
  double_shot: 'Tiro Duplo',
  dodge: 'Desvio',
  reload: 'Recarga',
  counter: 'Contra-golpe'
};

export function TurnResultOverlay({ result }: TurnResultProps) {
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0, rotate: -5 }}
        animate={{ scale: [0, 1.1, 1], rotate: [- 5, 2, 0] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-black/85 backdrop-blur-md rounded-2xl border-2 border-gold/40 p-6 max-w-sm mx-4 shadow-2xl"
      >
        {/* Cards comparison */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Player card */}
          <div className="flex flex-col items-center">
            <div 
              className="w-16 h-22 rounded-lg border-2 border-sand/50 bg-cover bg-center shadow-lg"
              style={{ backgroundImage: "url('" + CARD_IMAGES[result.playerCard] + "')" }}
            />
            <span className="font-stats text-xs text-sand mt-1">{CARD_LABELS[result.playerCard]}</span>
          </div>
          
          <span className="font-western text-2xl text-gold text-glow-gold">VS</span>
          
          {/* Opponent card */}
          <div className="flex flex-col items-center">
            <div 
              className="w-16 h-22 rounded-lg border-2 border-sand/50 bg-cover bg-center shadow-lg"
              style={{ backgroundImage: "url('" + CARD_IMAGES[result.opponentCard] + "')" }}
            />
            <span className="font-stats text-xs text-sand mt-1">{CARD_LABELS[result.opponentCard]}</span>
          </div>
        </div>

        {/* Narrative */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center font-marker text-lg md:text-xl text-gold leading-relaxed"
        >
          {result.narrative}
        </motion.p>

        {/* Damage indicators */}
        <div className="flex justify-between mt-4 font-stats text-sm">
          {result.playerLifeLost > 0 && (
            <span className="text-red-400">Você: -{result.playerLifeLost} HP</span>
          )}
          {result.opponentLifeLost > 0 && (
            <span className="text-green-400 ml-auto">Inimigo: -{result.opponentLifeLost} HP</span>
          )}
          {result.playerLifeLost === 0 && result.opponentLifeLost === 0 && (
            <span className="text-sand/60 mx-auto">Sem dano neste turno</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
