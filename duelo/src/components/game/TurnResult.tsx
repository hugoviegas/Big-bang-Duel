import { motion, AnimatePresence } from "framer-motion";
import { getClassIconSources } from "../../lib/characters";
import { useEffect, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import type { CharacterClass, TurnResult } from "../../types";

interface TurnResultProps {
  result: TurnResult;
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

/** Maps ability labels to class ids so we can render class image icons. */
const ABILITY_CLASS: Record<string, CharacterClass> = {
  "Tiro Crítico": "atirador",
  "Recarga Dupla": "estrategista",
  "Esquiva Fantasma": "sorrateiro",
  Ricochete: "ricochete",
  "Bala Fantasma": "sanguinario",
  Cura: "suporte",
  Escudo: "suporte",
};

function AbilityIcon({ ability }: { ability: string }) {
  const cls = ABILITY_CLASS[ability];
  if (!cls) {
    return <span className="text-base leading-none">⚡</span>;
  }

  const source = getClassIconSources(cls);
  return (
    <picture>
      <source srcSet={source.webp} type="image/webp" />
      <img src={source.png} alt={ability} className="w-5 h-5 rounded-sm" />
    </picture>
  );
}

function TimerBarInline({ tickKey }: { tickKey?: number | null }) {
  const attackTimer = useGameStore((s) => s.attackTimer);
  const [timeLeft, setTimeLeft] = useState<number>(attackTimer ?? 0);

  useEffect(() => {
    setTimeLeft(attackTimer ?? 0);
  }, [attackTimer, tickKey]);

  useEffect(() => {
    if (!attackTimer || timeLeft <= 0) return;
    let raf = 0;
    const start = performance.now();
    const duration = (attackTimer ?? 0) * 1000;
    function step(now: number) {
      const elapsed = now - start;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeLeft(remaining);
      if (elapsed < duration) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tickKey, attackTimer]);

  const ratio = attackTimer
    ? Math.max(0, Math.min(timeLeft / attackTimer, 1))
    : 0;
  const pct = Math.round(ratio * 100);
  const barClass =
    ratio <= 0.3
      ? "bg-gradient-to-r from-red-700 to-red-500"
      : ratio <= 0.6
        ? "bg-gradient-to-r from-orange-600 to-yellow-500"
        : "bg-gradient-to-r from-emerald-600 to-green-500";

  return (
    <div className="w-full">
      <div className="w-full h-2 bg-black/25 rounded-full overflow-hidden">
        <div className={`${barClass} h-2`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TurnResultOverlay({ result }: TurnResultProps) {
  if (!result) return null;

  const hasAbility =
    result.playerAbilityTriggered || result.opponentAbilityTriggered;

  const playerDamageColor =
    result.playerLifeLost < 0 ? "text-emerald-400" : "text-red-400";
  const opponentDamageColor =
    result.opponentLifeLost < 0 ? "text-emerald-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-gradient-to-b from-black/95 via-black/90 to-black/95 backdrop-blur-lg rounded-2xl border-2 border-gold/50 shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
      >
        {/* Header com brilho */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/0 via-gold/80 to-gold/0" />

        {/* Conteúdo */}
        <div className="p-6 md:p-8 space-y-5">
          {/* Cartas lado a lado */}
          <div className="flex items-center justify-center gap-4 md:gap-6">
            {/* Carta do jogador */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <picture>
                  <source
                    srcSet={CARD_IMAGE_SOURCES[result.playerCard]?.webp}
                    type="image/webp"
                  />
                  <img
                    src={CARD_IMAGE_SOURCES[result.playerCard]?.png}
                    alt={CARD_LABELS[result.playerCard]}
                    className="w-20 h-28 md:w-24 md:h-32 rounded-lg border-2 border-gold/60 shadow-xl object-contain bg-black/50"
                  />
                </picture>
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-gold to-yellow-500 rounded-full px-2 py-1 border border-gold/40">
                  <span className="font-stats text-xs font-bold text-black">
                    {Math.abs(result.playerLifeLost) > 0
                      ? `${
                          result.playerLifeLost < 0 ? "+" : "-"
                        }${Math.abs(result.playerLifeLost)}`
                      : "0"}
                  </span>
                </div>
              </div>
              <span className="font-stats text-[10px] md:text-xs text-sand/80 uppercase text-center">
                {CARD_LABELS[result.playerCard]}
              </span>
            </motion.div>

            {/* VS */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="font-western text-3xl md:text-4xl text-gold drop-shadow-lg">
                VS
              </span>
              <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-gold to-transparent" />
            </motion.div>

            {/* Carta do oponente */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <picture>
                  <source
                    srcSet={CARD_IMAGE_SOURCES[result.opponentCard]?.webp}
                    type="image/webp"
                  />
                  <img
                    src={CARD_IMAGE_SOURCES[result.opponentCard]?.png}
                    alt={CARD_LABELS[result.opponentCard]}
                    className="w-20 h-28 md:w-24 md:h-32 rounded-lg border-2 border-red-500/60 shadow-xl object-contain bg-black/50"
                  />
                </picture>
                <div className="absolute -bottom-2 -left-2 bg-gradient-to-r from-red-600 to-red-500 rounded-full px-2 py-1 border border-red-400/40">
                  <span className="font-stats text-xs font-bold text-white">
                    {Math.abs(result.opponentLifeLost) > 0
                      ? `${
                          result.opponentLifeLost < 0 ? "+" : "-"
                        }${Math.abs(result.opponentLifeLost)}`
                      : "0"}
                  </span>
                </div>
              </div>
              <span className="font-stats text-[10px] md:text-xs text-sand/80 uppercase text-center">
                {CARD_LABELS[result.opponentCard]}
              </span>
            </motion.div>
          </div>

          {/* Separador */}
          <div className="h-px bg-gradient-to-r from-gold/0 via-gold/30 to-gold/0" />

          {/* Removed narrative/comment text - only show damage, cards, abilities and timer */}
          <TimerBarInline tickKey={result.turn} />

          {/* Habilidades desencadeadas */}
          <AnimatePresence>
            {hasAbility && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 0.35 }}
                className="flex flex-col gap-2"
              >
                {result.playerAbilityTriggered && (
                  <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/40 rounded-lg px-4 py-2.5">
                    <AbilityIcon ability={result.playerAbilityTriggered} />
                    <span className="font-stats text-xs MD:text-sm text-gold font-bold uppercase tracking-wide">
                      {result.playerAbilityTriggered}
                    </span>
                    <span className="font-stats text-xs text-sand/60 ml-auto">
                      Você
                    </span>
                  </div>
                )}
                {result.opponentAbilityTriggered && (
                  <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500/20 to-red-500/10 border border-red-500/40 rounded-lg px-4 py-2.5">
                    <AbilityIcon ability={result.opponentAbilityTriggered} />
                    <span className="font-stats text-xs md:text-sm text-red-400 font-bold uppercase tracking-wide">
                      {result.opponentAbilityTriggered}
                    </span>
                    <span className="font-stats text-xs text-sand/60 ml-auto">
                      Oponente
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resumo de dano */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-3 pt-2"
          >
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-black/40 border border-gold/20">
              <span className="font-stats text-[10px] text-sand/60 uppercase">
                Você
              </span>
              <span
                className={`font-western text-lg md:text-xl font-bold ${playerDamageColor}`}
              >
                {result.playerLifeLost < 0 ? "+" : ""}
                {result.playerLifeLost === 0
                  ? "0"
                  : result.playerLifeLost < 0
                    ? -result.playerLifeLost
                    : result.playerLifeLost}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-black/40 border border-red-500/20">
              <span className="font-stats text-[10px] text-sand/60 uppercase">
                Oponente
              </span>
              <span
                className={`font-western text-lg md:text-xl font-bold ${opponentDamageColor}`}
              >
                {result.opponentLifeLost < 0 ? "+" : ""}
                {result.opponentLifeLost === 0
                  ? "0"
                  : result.opponentLifeLost < 0
                    ? -result.opponentLifeLost
                    : result.opponentLifeLost}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Footer com brilho */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/0 via-gold/60 to-gold/0" />
      </motion.div>
    </motion.div>
  );
}
