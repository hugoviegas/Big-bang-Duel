import { motion, AnimatePresence } from "framer-motion";
import { Character } from "./Character";
import { getClassIconSources } from "../../lib/characters";
import type { CharacterClass, PlayerState, TurnResult } from "../../types";

interface BattleArenaProps {
  player: PlayerState;
  opponent: PlayerState;
  phase: string;
  turnResult?: TurnResult | null;
  playerEmoji?: string | null;
  opponentEmoji?: string | null;
}

const CARD_IMAGE_SOURCES: Record<string, { webp: string; png: string }> = {
  shot: {
    webp: "/assets/cards/card_shoot.webp",
    png: "/assets/cards/card_shoot.png",
  },
  double_shot: {
    webp: "/assets/cards/card_double_shoot.webp",
    png: "/assets/cards/card_double_shoot.png",
  },
  dodge: {
    webp: "/assets/cards/card_dodge.webp",
    png: "/assets/cards/card_dodge.png",
  },
  reload: {
    webp: "/assets/cards/card_reload.webp",
    png: "/assets/cards/card_reload.png",
  },
  counter: {
    webp: "/assets/cards/card_counter.webp",
    png: "/assets/cards/card_counter.png",
  },
};

const CARD_LABELS: Record<string, string> = {
  shot: "Tiro",
  double_shot: "Tiro Duplo",
  dodge: "Desvio",
  reload: "Recarga",
  counter: "Contra-golpe",
};

const ABILITY_CLASS: Record<string, CharacterClass> = {
  "Tiro Crítico": "atirador",
  "Recarga Dupla": "estrategista",
  "Esquiva Fantasma": "sorrateiro",
  Ricochete: "ricochete",
  "Bala Fantasma": "sanguinario",
  Cura: "suporte",
  Escudo: "suporte",
};

function AbilityBadge({
  label,
  isOpponent,
}: {
  label: string;
  isOpponent?: boolean;
}) {
  const cls = ABILITY_CLASS[label];
  const icon = cls ? getClassIconSources(cls) : null;

  return (
    <div
      className={`mt-2 px-2.5 py-1.5 rounded-lg border backdrop-blur-sm flex items-center gap-1.5 max-w-[150px] ${
        isOpponent
          ? "bg-red-500/12 border-red-400/35 text-red-300"
          : "bg-gold/12 border-gold/35 text-gold"
      }`}
    >
      {icon ? (
        <picture>
          <source srcSet={icon.webp} type="image/webp" />
          <img src={icon.png} alt={label} className="w-4 h-4 rounded-sm" />
        </picture>
      ) : (
        <span className="text-sm">⚡</span>
      )}
      <span className="font-stats text-[10px] uppercase tracking-wide truncate">
        {label}
      </span>
    </div>
  );
}

function ResultCard({
  cardId,
  isOpponent,
}: {
  cardId?: string;
  isOpponent?: boolean;
}) {
  if (!cardId || !CARD_IMAGE_SOURCES[cardId]) return null;
  const src = CARD_IMAGE_SOURCES[cardId];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`mt-2 px-2 py-2 rounded-xl border backdrop-blur-sm ${
        isOpponent
          ? "bg-red-500/10 border-red-400/35"
          : "bg-gold/10 border-gold/35"
      }`}
    >
      <picture>
        <source srcSet={src.webp} type="image/webp" />
        <img
          src={src.png}
          alt={CARD_LABELS[cardId] ?? cardId}
          className="w-14 h-[78px] object-contain rounded-md"
        />
      </picture>
      <div className="font-stats text-[10px] text-sand/90 uppercase text-center mt-1">
        {CARD_LABELS[cardId] ?? cardId}
      </div>
    </motion.div>
  );
}

export function BattleArena({
  player,
  opponent,
  phase,
  turnResult,
  playerEmoji,
  opponentEmoji,
}: BattleArenaProps) {
  const isAnimating = phase === "animating" || phase === "resolving";
  const showTurnCards =
    (phase === "resolving" || phase === "animating") && !!turnResult;

  return (
    <div className="relative flex-1 flex items-start justify-between px-3 sm:px-5 md:px-8 lg:px-12 pt-2 md:pt-4 pb-28 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={isAnimating ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute left-1/4 top-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 bg-gradient-to-r from-gold/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={isAnimating ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="absolute right-1/4 top-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 bg-gradient-to-l from-red-400/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 flex flex-col items-center mt-1"
      >
        <div className="relative">
          <Character player={player} />

          <AnimatePresence>
            {playerEmoji && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="absolute -top-6 -left-6 z-40"
              >
                <div className="px-3 py-1.5 rounded-full border border-gold/35 bg-black/75 backdrop-blur-sm text-xl sm:text-2xl shadow-lg">
                  {playerEmoji}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-black/65 to-black/35 border border-gold/40 backdrop-blur-md">
              <span className="font-western text-xs md:text-sm text-gold drop-shadow-lg">
                {player.displayName}
              </span>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {showTurnCards && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 flex items-center justify-center gap-1 360:gap-1.5 xs:gap-2 390:gap-2.5 sm:gap-3 md:gap-4"
            >
              <AnimatePresence>
                {playerEmoji && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="h-fit"
                  >
                    <div className="px-3 py-1.5 rounded-full border border-gold/35 bg-black/75 backdrop-blur-sm text-xl sm:text-2xl shadow-lg">
                      {playerEmoji}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <ResultCard cardId={turnResult?.playerCard} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTurnCards &&
            playerEmoji &&
            turnResult?.playerAbilityTriggered && (
              <AbilityBadge label={turnResult.playerAbilityTriggered} />
            )}
        </AnimatePresence>

        <AnimatePresence>
          {showTurnCards &&
            !playerEmoji &&
            turnResult?.playerAbilityTriggered && (
              <AbilityBadge label={turnResult.playerAbilityTriggered} />
            )}
        </AnimatePresence>
      </motion.div>

      {isAnimating && (
        <motion.svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-48 md:h-48 z-10"
          viewBox="0 0 200 200"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], rotate: 45 }}
          transition={{ duration: 0.6 }}
        >
          <line
            x1="10"
            y1="10"
            x2="190"
            y2="190"
            stroke="url(#energyGradientArena)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient
              id="energyGradientArena"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ffd700" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ffed4e" stopOpacity="1" />
              <stop offset="100%" stopColor="#ff6b35" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </motion.svg>
      )}

      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 flex flex-col items-center mt-1"
      >
        <div className="relative">
          <Character player={opponent} isRight />

          <AnimatePresence>
            {opponentEmoji && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="absolute -top-6 -right-6 z-40"
              >
                <div className="px-3 py-1.5 rounded-full border border-red-400/35 bg-black/75 backdrop-blur-sm text-xl sm:text-2xl shadow-lg">
                  {opponentEmoji}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-black/65 to-black/35 border border-red-400/40 backdrop-blur-md">
              <span className="font-western text-xs md:text-sm text-red-400 drop-shadow-lg">
                {opponent.displayName}
              </span>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {showTurnCards && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 flex items-center justify-center gap-1 360:gap-1.5 xs:gap-2 390:gap-2.5 sm:gap-3 md:gap-4"
            >
              <ResultCard cardId={turnResult?.opponentCard} isOpponent />
              <AnimatePresence>
                {opponentEmoji && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="h-fit order-last sm:order-none"
                  >
                    <div className="px-3 py-1.5 rounded-full border border-red-400/35 bg-black/75 backdrop-blur-sm text-xl sm:text-2xl shadow-lg">
                      {opponentEmoji}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTurnCards && turnResult?.opponentAbilityTriggered && (
            <AbilityBadge
              label={turnResult.opponentAbilityTriggered}
              isOpponent
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
