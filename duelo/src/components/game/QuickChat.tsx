import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickChatProps {
  onSendMessage?: (emoji: string) => Promise<boolean> | boolean;
  disabled?: boolean;
}

const QUICK_EMOJIS = [
  { emoji: "👋", label: "Olá", color: "text-blue-400" },
  { emoji: "🎯", label: "Mira!", color: "text-yellow-400" },
  { emoji: "💪", label: "Força!", color: "text-red-500" },
  { emoji: "🤔", label: "Pensando...", color: "text-purple-400" },
  { emoji: "😤", label: "Vem!", color: "text-orange-500" },
  { emoji: "🔥", label: "Monstro!", color: "text-red-600" },
  { emoji: "☢️", label: "Perigo!", color: "text-red-700" },
  { emoji: "😱", label: "Uau!", color: "text-pink-400" },
  { emoji: "🎪", label: "Diversão", color: "text-green-400" },
  { emoji: "GG", label: "Bom Jogo", color: "text-emerald-400", isText: true },
];

export function QuickChat({ onSendMessage, disabled = false }: QuickChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const remainingCooldown = Math.max(0, cooldownUntil - Date.now());
  const isCoolingDown = remainingCooldown > 0;

  const handleSendEmoji = async (emoji: string) => {
    if (disabled || isCoolingDown) return;

    if (onSendMessage) {
      const ok = await onSendMessage(emoji);
      if (!ok) {
        setCooldownUntil(Date.now() + 1500);
        return;
      }
    }

    setCooldownUntil(Date.now() + 4000);
  };

  return (
    <div className="fixed z-50 pointer-events-none">
      <div className="fixed bottom-[240px] md:bottom-[290px] right-4 md:right-6 pointer-events-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-3 items-end"
        >
          <AnimatePresence>
            {isCoolingDown && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="px-2 py-1 rounded-md bg-black/70 border border-gold/30 text-[10px] font-stats text-gold"
              >
                Emoji em {Math.ceil(remainingCooldown / 1000)}s
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick emoji menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-5 gap-2 bg-gradient-to-br from-black/80 to-black/60 p-4 rounded-2xl border border-gold/40 backdrop-blur-md shadow-2xl"
              >
                {QUICK_EMOJIS.map((item) => (
                  <motion.button
                    key={item.emoji}
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={async () => {
                      await handleSendEmoji(item.emoji);
                      setIsOpen(false);
                    }}
                    title={item.label}
                    disabled={isCoolingDown || disabled}
                    className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 hover:border-gold/60 transition-all hover:shadow-lg hover:shadow-gold/30 text-base md:text-xl"
                  >
                    {item.emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full text-2xl md:text-3xl shadow-lg transition-all border-2 font-bold ${
              disabled
                ? "bg-gray-600 border-gray-400 text-gray-300"
                : "bg-gradient-to-br from-gold to-yellow-500 border-yellow-300 text-black hover:shadow-2xl hover:shadow-gold/50"
            }`}
          >
            😊
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
