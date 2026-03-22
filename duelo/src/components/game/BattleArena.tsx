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

const ABILITY_DESCRIPTIONS: Record<string, string> = {
  "Tiro Crítico": "Ataque com dano amplificado neste turno.",
  "Recarga Dupla": "Ação de recarga trouxe munição extra.",
  "Esquiva Fantasma": "Desvio com bônus defensivo ativado.",
  Ricochete: "O disparo desviou e voltou com pressão adicional.",
  "Bala Fantasma": "Efeito ofensivo especial ignorou parte da defesa.",
  Cura: "Recuperou vida durante a troca de ações.",
  Escudo: "Absorveu parte do dano recebido no turno.",
};

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

function AbilitySummaryCard({
  label,
  side,
}: {
  label: string;
  side: "player" | "opponent";
}) {
  const cls = ABILITY_CLASS[label];
  const icon = cls ? getClassIconSources(cls) : null;
  const description = ABILITY_DESCRIPTIONS[label] ?? "Efeito especial ativado.";
  const isOpponent = side === "opponent";

  return (
    <div
      className={`rounded-xl border px-3 py-3 backdrop-blur-sm ${
        isOpponent
          ? "bg-red-500/14 border-red-400/35"
          : "bg-gold/14 border-gold/35"
      }`}
    >
      <div
        className={`flex items-center gap-2 ${isOpponent ? "justify-end" : "justify-start"}`}
      >
        {!isOpponent && icon ? (
          <picture>
            <source srcSet={icon.webp} type="image/webp" />
            <img src={icon.png} alt={label} className="w-5 h-5 rounded-sm" />
          </picture>
        ) : null}
        <div
          className={`flex flex-col ${isOpponent ? "items-end" : "items-start"}`}
        >
          <span
            className={`font-stats text-[10px] uppercase tracking-wide ${
              isOpponent ? "text-red-300" : "text-gold"
            }`}
          >
            {isOpponent ? "Oponente ativou" : "Você ativou"}
          </span>
          <span
            className={`font-stats text-xs uppercase ${
              isOpponent ? "text-red-200" : "text-sand"
            }`}
          >
            {label}
          </span>
        </div>
        {isOpponent && icon ? (
          <picture>
            <source srcSet={icon.webp} type="image/webp" />
            <img src={icon.png} alt={label} className="w-5 h-5 rounded-sm" />
          </picture>
        ) : null}
      </div>
      <p
        className={`mt-2 text-[11px] leading-snug ${
          isOpponent ? "text-red-100/85 text-right" : "text-sand/85"
        }`}
      >
        {description}
      </p>
    </div>
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
      </motion.div>

      {showTurnCards && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-3"
        >
          <div className="w-full max-w-sm sm:max-w-2xl lg:max-w-3xl bg-gradient-to-b from-black/95 to-black/85 backdrop-blur-xl border-2 border-gold/40 rounded-3xl shadow-[0_0_50px_rgba(255,234,120,0.4),inset_0_0_20px_rgba(255,234,120,0.1)] overflow-y-auto max-h-[85vh]">
            <div className="p-4 sm:p-6 md:p-8">
              {/* Damage summary */}
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-xs text-gold font-bold truncate">
                        {CARD_LABELS[turnResult?.playerCard ?? ""]}
                      </span>
                      <span className="text-[11px] text-sand/70 truncate">
                        {turnResult
                          ? `Dano causado: ${Math.max(0, turnResult.opponentLifeLost)}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-center px-2">
                    <span className="text-sm text-gold font-western">VS</span>
                  </div>

                  <div className="flex-1 flex items-center gap-3 justify-end min-w-0">
                    <div className="flex flex-col items-end min-w-0">
                      <span className="text-xs text-red-300 font-bold truncate">
                        {CARD_LABELS[turnResult?.opponentCard ?? ""]}
                      </span>
                      <span className="text-[11px] text-sand/70 truncate">
                        {turnResult
                          ? `Dano recebido: ${Math.max(0, turnResult.playerLifeLost)}`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VS Cards Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6"
              >
                {/* Player Card - Image Only */}
                <div className="flex justify-center flex-1">
                  <picture>
                    <source
                      srcSet={CARD_IMAGE_SOURCES[turnResult?.playerCard]?.webp}
                      type="image/webp"
                    />
                    <img
                      src={CARD_IMAGE_SOURCES[turnResult?.playerCard]?.png}
                      alt={CARD_LABELS[turnResult?.playerCard ?? ""]}
                      className="w-20 h-28 sm:w-32 sm:h-44 md:w-40 md:h-52"
                    />
                  </picture>
                </div>

                {/* VS Separator */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex-shrink-0 flex flex-col items-center"
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl font-western text-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                    VS
                  </span>
                </motion.div>

                {/* Opponent Card - Image Only */}
                <div className="flex justify-center flex-1">
                  <picture>
                    <source
                      srcSet={
                        CARD_IMAGE_SOURCES[turnResult?.opponentCard]?.webp
                      }
                      type="image/webp"
                    />
                    <img
                      src={CARD_IMAGE_SOURCES[turnResult?.opponentCard]?.png}
                      alt={CARD_LABELS[turnResult?.opponentCard ?? ""]}
                      className="w-20 h-28 sm:w-32 sm:h-44 md:w-40 md:h-52"
                    />
                  </picture>
                </div>
              </motion.div>

              {/* Abilities - Integrated Grid */}
              {(turnResult?.playerAbilityTriggered ||
                turnResult?.opponentAbilityTriggered) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-1 bg-black/45 border border-gold/25 rounded-2xl p-3 sm:p-4"
                >
                  <div
                    className={`grid gap-3 ${
                      turnResult?.playerAbilityTriggered &&
                      turnResult?.opponentAbilityTriggered
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {turnResult?.playerAbilityTriggered && (
                      <AbilitySummaryCard
                        label={turnResult.playerAbilityTriggered}
                        side="player"
                      />
                    )}
                    {turnResult?.opponentAbilityTriggered && (
                      <AbilitySummaryCard
                        label={turnResult.opponentAbilityTriggered}
                        side="opponent"
                      />
                    )}
                  </div>
                  {turnResult?.playerAbilityTriggered &&
                    turnResult?.opponentAbilityTriggered && (
                      <div className="mt-3 text-center font-stats text-[10px] uppercase tracking-wider text-sand/60">
                        Efeitos simultâneos neste turno
                      </div>
                    )}
                </motion.div>
              )}

            </div>
          </div>
        </motion.div>
      )}

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
      </motion.div>
    </div>
  );
}
