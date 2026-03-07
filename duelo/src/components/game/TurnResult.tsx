import { motion, AnimatePresence } from "framer-motion";
import type { TurnResult } from "../../types";

interface TurnResultProps {
  result: TurnResult;
}

const CARD_IMAGES: Record<string, string> = {
  shot: "/assets/cards/card_shoot.png",
  double_shot: "/assets/cards/card_double_shoot.png",
  dodge: "/assets/cards/card_dodge.png",
  reload: "/assets/cards/card_reload.png",
  counter: "/assets/cards/card_counter.png",
};

const CARD_LABELS: Record<string, string> = {
  shot: "Tiro",
  double_shot: "Tiro Duplo",
  dodge: "Desvio",
  reload: "Recarga",
  counter: "Contra-golpe",
};

/** Icon displayed beside each triggered ability name. */
const ABILITY_ICONS: Record<string, string> = {
  "Tiro Crítico": "🎯",
  "Recarga Dupla": "🧠",
  "Esquiva Fantasma": "👻",
  Ricochete: "🔄",
  "Bala Fantasma": "🩸",
  Escudo: "🛡️",
};

export function TurnResultOverlay({ result }: TurnResultProps) {
  if (!result) return null;

  const hasAbility =
    result.playerAbilityTriggered || result.opponentAbilityTriggered;

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
        animate={{ scale: [0, 1.1, 1], rotate: [-5, 2, 0] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-black/85 backdrop-blur-md rounded-2xl border-2 border-gold/40 p-6 max-w-sm mx-4 shadow-2xl"
      >
        {/* Cards comparison */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Player card */}
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-22 rounded-lg border-2 border-sand/50 bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url('" + CARD_IMAGES[result.playerCard] + "')",
              }}
            />
            <span className="font-stats text-xs text-sand mt-1">
              {CARD_LABELS[result.playerCard]}
            </span>
          </div>

          <span className="font-western text-2xl text-gold text-glow-gold">
            VS
          </span>

          {/* Opponent card */}
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-22 rounded-lg border-2 border-sand/50 bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url('" + CARD_IMAGES[result.opponentCard] + "')",
              }}
            />
            <span className="font-stats text-xs text-sand mt-1">
              {CARD_LABELS[result.opponentCard]}
            </span>
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

        {/* Ability triggers */}
        <AnimatePresence>
          {hasAbility && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-3 flex flex-col gap-1"
            >
              {result.playerAbilityTriggered && (
                <div className="flex items-center justify-center gap-1.5 bg-gold/10 border border-gold/30 rounded-lg px-3 py-1.5">
                  <span className="text-base leading-none">
                    {ABILITY_ICONS[result.playerAbilityTriggered] ?? "⚡"}
                  </span>
                  <span className="font-stats text-xs text-gold font-bold uppercase tracking-wide">
                    {result.playerAbilityTriggered}
                  </span>
                  <span className="font-stats text-xs text-sand/60">
                    — Você
                  </span>
                </div>
              )}
              {result.opponentAbilityTriggered && (
                <div className="flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
                  <span className="text-base leading-none">
                    {ABILITY_ICONS[result.opponentAbilityTriggered] ?? "⚡"}
                  </span>
                  <span className="font-stats text-xs text-red-400 font-bold uppercase tracking-wide">
                    {result.opponentAbilityTriggered}
                  </span>
                  <span className="font-stats text-xs text-sand/60">
                    — Oponente
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Damage indicators */}
        <div className="flex justify-between mt-4 font-stats text-sm">
          {result.playerLifeLost > 0 && (
            <span className="text-red-400">
              Você: -{result.playerLifeLost} HP
              {result.playerShieldUsed && (
                <span className="text-green-400 ml-1">(🛡️ bloqueou 1)</span>
              )}
            </span>
          )}
          {result.opponentLifeLost > 0 && (
            <span className="text-green-400 ml-auto">
              Inimigo: -{result.opponentLifeLost} HP
              {result.opponentShieldUsed && (
                <span className="text-green-400 ml-1">(🛡️ bloqueou 1)</span>
              )}
            </span>
          )}
          {result.playerLifeLost === 0 && result.opponentLifeLost === 0 && (
            <span className="text-sand/60 mx-auto">Sem dano neste turno</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
