import { motion } from 'framer-motion';

interface TurnResultProps {
  narrative: string;
}

export function TurnResultOverlay({ narrative }: TurnResultProps) {
  if (!narrative) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2.5, times: [0, 0.2, 0.5, 1] }}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <div className="bg-black/80 text-yellow-300 font-western text-2xl md:text-4xl px-8 py-4 rounded-lg border-4 border-yellow-500 text-center max-w-lg shadow-2xl">
        {narrative}
      </div>
    </motion.div>
  );
}
