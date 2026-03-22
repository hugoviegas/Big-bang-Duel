import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  resolveAvatarPicture,
  getClassIconSources,
  CLASS_INFO,
} from "../../lib/characters";
import type { PlayerState, CharacterClass } from "../../types";
import { useGameStore } from "../../store/gameStore";

interface BattleHeaderProps {
  player: PlayerState;
  opponent: PlayerState;
  turn: number;
  bestOf3: boolean;
  playerStars: number;
  opponentStars: number;
  currentRound: number;
  hideOpponentAmmo: boolean;
}

export function BattleHeader({
  player,
  opponent,
  turn,
  bestOf3,
  playerStars,
  opponentStars,
  currentRound,
  hideOpponentAmmo,
}: BattleHeaderProps) {
  const phase = useGameStore((s) => s.phase);
  const attackTimer = useGameStore((s) => s.attackTimer);
  const isOnline = useGameStore((s) => s.isOnline);
  const turnStartedAt = useGameStore((s) => s.turnStartedAt ?? null);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-20 w-full bg-gradient-to-b from-black/85 via-black/65 to-transparent backdrop-blur-md border-b border-gold/25 py-3 md:py-4 px-3 md:px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <div className="flex-1 flex gap-2 md:gap-3 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-start gap-2 md:gap-3 shrink-0"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 border-gold/50 shadow-lg">
                <img
                  src={resolveAvatarPicture(
                    player.avatar,
                    player.avatarPicture,
                  )}
                  alt={player.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
            <HealthBar player={player} hideOpponentAmmo={hideOpponentAmmo} />
          </div>

          <div className="shrink-0 flex flex-col items-center gap-1 pt-0">
            <motion.div
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              className="px-2.5 md:px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-gold/20 to-gold/5 border border-gold/40"
            >
              <div className="text-center leading-none">
                <span className="block text-[10px] md:text-xs font-stats text-sand/70 uppercase tracking-wider">
                  Turno
                </span>
                <span className="block text-lg md:text-2xl font-western text-gold mt-0.5">
                  {turn}
                </span>
              </div>
            </motion.div>

            {bestOf3 && (
              <div className="flex flex-col items-center gap-1">
                <div className="font-western text-xs md:text-sm text-sand/80">
                  {playerStars} - {opponentStars}
                </div>
                <div className="flex items-center gap-1 justify-center">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                        i < currentRound ? "bg-gold" : "bg-sand/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex gap-2 md:gap-3 flex-row-reverse items-start min-w-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-start gap-2 md:gap-3 shrink-0"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 border-gold/50 shadow-lg">
                <img
                  src={resolveAvatarPicture(
                    opponent.avatar,
                    opponent.avatarPicture,
                  )}
                  alt={opponent.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
            <HealthBar
              player={opponent}
              isOpponent
              hideOpponentAmmo={hideOpponentAmmo}
            />
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 md:gap-3">
          <span className="min-h-[1.8rem] max-w-28 md:max-w-36 whitespace-nowrap overflow-hidden text-ellipsis text-[14px] md:text-sm font-stats font-medium text-sand/95 leading-tight">
            {player.displayName}
          </span>
          <span className="min-h-[1.8rem] max-w-28 md:max-w-36 whitespace-nowrap overflow-hidden text-ellipsis text-right text-[14px] md:text-sm font-stats font-medium text-sand/95 leading-tight">
            {opponent.displayName}
          </span>
        </div>
      </div>

      <HeaderTurnTimer
        phase={phase}
        totalSeconds={attackTimer}
        isOnline={isOnline}
        turn={turn}
        turnStartedAt={turnStartedAt}
      />
    </motion.header>
  );
}

function HeaderTurnTimer({
  phase,
  totalSeconds,
  isOnline,
  turn,
  turnStartedAt,
}: {
  phase: string;
  totalSeconds: number;
  isOnline: boolean;
  turn: number;
  turnStartedAt: number | null;
}) {
  const [progress, setProgress] = useState(1);
  const localTurnStartRef = useRef<number>(0);
  const showTimer = phase === "selecting";

  useEffect(() => {
    if (!showTimer) return;
    localTurnStartRef.current = Date.now();
  }, [showTimer, turn]);

  useEffect(() => {
    if (!showTimer || !totalSeconds || totalSeconds <= 0) return;

    let raf = 0;
    const baseStart =
      isOnline && turnStartedAt ? turnStartedAt : localTurnStartRef.current;
    if (!baseStart) return;

    const duration = totalSeconds * 1000;

    const step = () => {
      const elapsed = Math.max(0, Date.now() - baseStart);
      const ratio = Math.max(0, Math.min(1 - elapsed / duration, 1));
      setProgress(ratio);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [showTimer, totalSeconds, isOnline, turnStartedAt]);

  const ratio = Math.max(0, Math.min(progress, 1));
  const timeLeft = Math.max(0, ratio * totalSeconds);

  // Smooth color interpolation from green -> yellow -> red
  const getBarColor = () => {
    if (ratio > 0.6) {
      // Green to yellow: 1.0 -> 0.6
      const t = (ratio - 0.6) / 0.4; // 0 to 1
      return `rgb(${Math.round(74 + t * 56)}, ${Math.round(222 - t * 64)}, 100)`;
    } else if (ratio > 0.3) {
      // Yellow to orange/red: 0.6 -> 0.3
      const t = (ratio - 0.3) / 0.3; // 0 to 1
      return `rgb(${Math.round(180 + t * 76)}, ${Math.round(83 - t * 28)}, ${Math.round(5 - t * 5)})`;
    } else {
      // Deep red: 0.3 -> 0.0
      return `rgb(220, 38, 38)`;
    }
  };

  return (
    <AnimatePresence>
      {showTimer && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 right-0 bottom-0 px-2"
        >
          <div className="h-[3px] md:h-1 bg-black/45 rounded-full overflow-hidden">
            <motion.div
              className="h-full"
              style={{
                width: `${ratio * 100}%`,
                backgroundColor: getBarColor(),
              }}
              transition={{ type: "tween", duration: 0 }}
            />
          </div>
          <div className="mt-0.5 text-center text-[10px] md:text-[11px] font-stats text-sand/75">
            {timeLeft.toFixed(1)}s
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HealthBar({
  player,
  isOpponent,
  hideOpponentAmmo,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  hideOpponentAmmo: boolean;
}) {
  // Contar quantas vidas (quantos segmentos cheios)
  const segmentSize = player.maxLife / 4;
  const filledSegments = Math.ceil(player.life / segmentSize);

  // Dividir vida em 4 segmentos
  const segments = Array.from({ length: 4 }).map((_, i) => {
    const segmentStart = i * segmentSize;
    const segmentEnd = (i + 1) * segmentSize;
    const segmentLife = Math.max(
      0,
      Math.min(player.life, segmentEnd) - segmentStart,
    );
    const segmentPercent = (segmentLife / segmentSize) * 100;
    return segmentPercent;
  });

  // Determinar cor baseada no número de vidas
  const getSegmentColor = () => {
    if (filledSegments === 4) return "from-emerald-600 to-green-400"; // 4 vidas - verde
    if (filledSegments === 3) return "from-yellow-600 to-yellow-400"; // 3 vidas - amarelo
    if (filledSegments === 2) return "from-orange-600 to-orange-400"; // 2 vidas - laranja
    return "from-red-700 to-red-500 animate-pulse"; // 1 vida - vermelho com pulse
  };

  const classInfo = CLASS_INFO[player.characterClass as CharacterClass];
  const classIcon = classInfo
    ? getClassIconSources(player.characterClass as CharacterClass)
    : null;

  return (
    <div
      className={`flex flex-col gap-1 flex-1 ${isOpponent ? "items-end" : "items-start"}`}
    >
      {/* Barra de vida dividida em 4 segmentos */}
      <div
        className={`flex gap-1.5 w-full ${isOpponent ? "justify-end" : "justify-start"}`}
      >
        {segments.map((segmentPercent, idx) => (
          <motion.div
            key={idx}
            className="flex-1 h-4 md:h-5 relative bg-black/60 rounded-md border border-gold/30 overflow-hidden shadow-inner"
          >
            <motion.div
              initial={{ width: "100%" }}
              animate={{
                width: `${Math.max(0, Math.min(segmentPercent, 100))}%`,
              }}
              transition={{ duration: 0.5 }}
              className={`h-full transition-all duration-300 bg-gradient-to-r ${getSegmentColor()}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {/* indicador de munição + ícone de classe */}
      <div
        className={`flex items-center gap-1.5 ${isOpponent ? "justify-end" : "justify-start"}`}
      >
        {!isOpponent && classIcon && (
          <div
            className="w-7 h-7 md:w-8 md:h-8 rounded-lg overflow-hidden border border-gold/40 shadow-md bg-black/40 flex items-center justify-center"
            title={classInfo?.name}
          >
            <picture>
              <source srcSet={classIcon.webp} type="image/webp" />
              <img
                src={classIcon.png}
                alt={classInfo?.name}
                className="w-full h-full object-cover"
              />
            </picture>
          </div>
        )}

        <AmmoIndicator
          ammo={hideOpponentAmmo && isOpponent ? 0 : player.ammo}
          maxAmmo={player.maxAmmo}
          isOpponent={isOpponent}
        />

        {isOpponent && classIcon && (
          <div
            className="w-7 h-7 md:w-8 md:h-8 rounded-lg overflow-hidden border border-gold/40 shadow-md bg-black/40 flex items-center justify-center"
            title={classInfo?.name}
          >
            <picture>
              <source srcSet={classIcon.webp} type="image/webp" />
              <img
                src={classIcon.png}
                alt={classInfo?.name}
                className="w-full h-full object-cover"
              />
            </picture>
          </div>
        )}
      </div>
    </div>
  );
}

function AmmoIndicator({
  ammo,
  maxAmmo,
  isOpponent,
}: {
  ammo: number;
  maxAmmo: number;
  isOpponent?: boolean;
}) {
  return (
    <div
      className={`flex gap-1.5 ${isOpponent ? "justify-end" : "justify-start"}`}
    >
      {Array.from({ length: maxAmmo }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: i < ammo ? 1 : 0.35 }}
          transition={{ duration: 0.2 }}
          className="relative"
          title={i < ammo ? "Munição carregada" : "Sem munição"}
        >
          <picture>
            <source
              srcSet={
                i < ammo
                  ? "/assets/ui/ammunation_icon.webp"
                  : "/assets/ui/ammunation_empty_icon.webp"
              }
              type="image/webp"
            />
            <img
              src={
                i < ammo
                  ? "/assets/ui/png/ammunation_icon.png"
                  : "/assets/ui/png/ammunation_empty_icon.png"
              }
              alt={i < ammo ? "Munição carregada" : "Sem munição"}
              className={`w-3 h-6 md:w-3.5 md:h-7 object-contain ${
                i < ammo ? "drop-shadow-[0_0_4px_rgba(212,175,55,0.6)]" : ""
              }`}
            />
          </picture>
        </motion.div>
      ))}
    </div>
  );
}
