import { motion } from "framer-motion";
import {
  resolveAvatarPicture,
  getClassIconSources,
  CLASS_INFO,
} from "../../lib/characters";
import type { PlayerState, CharacterClass } from "../../types";

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
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-20 w-full bg-gradient-to-b from-black/85 via-black/65 to-transparent backdrop-blur-md border-b border-gold/25 py-2 md:py-3 px-3 md:px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-2 md:gap-4">
          <div className="flex-1 flex items-center gap-2 md:gap-3 min-w-0">
            <PlayerCard player={player} />
            <HealthBar player={player} hideOpponentAmmo={hideOpponentAmmo} />
          </div>

          <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
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

          <div className="flex-1 flex items-center gap-2 md:gap-3 flex-row-reverse min-w-0">
            <PlayerCard player={opponent} isOpponent />
            <HealthBar
              player={opponent}
              isOpponent
              hideOpponentAmmo={hideOpponentAmmo}
            />
          </div>
        </div>
      </div>
    </motion.header>
  );
}

function PlayerCard({
  player,
  isOpponent,
}: {
  player: PlayerState;
  isOpponent?: boolean;
}) {
  const avatar = resolveAvatarPicture(player.avatar, player.avatarPicture);

  return (
    <motion.div
      initial={{ opacity: 0, x: isOpponent ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative"
    >
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 border-gold/50 shadow-lg">
        {/* Avatar principal */}
        <img
          src={avatar}
          alt={player.displayName}
          className="w-full h-full object-cover"
        />
      </div>
    </motion.div>
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
          animate={
            i < ammo ? { scale: [1, 1.2, 1] } : { scale: 1, opacity: 0.3 }
          }
          transition={{
            duration: 1.6,
            delay: i * 0.1,
            repeat: i < ammo ? Infinity : 0,
          }}
          className="relative"
          title={i < ammo ? "Munição carregada" : "Sem munição"}
        >
          {/* Desenho de munição (cartuchos) */}
          <svg
            viewBox="0 0 20 36"
            className={`w-3 h-6 md:w-3.5 md:h-7 transition-all ${
              i < ammo
                ? "drop-shadow-[0_0_5px_rgba(212,175,55,0.9)]"
                : "opacity-30"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Ponta (projétil) - Dourada/Laranja */}
            <g fill={i < ammo ? "#E8A028" : "#B8956F"}>
              <path d="M 10 2 L 14 8 L 10 10 L 6 8 Z" />
            </g>
            {/* Cilindro superior (latão) - Marrom */}
            <g fill={i < ammo ? "#8B6F47" : "#6B5340"} stroke="none">
              <rect x="6" y="10" width="8" height="14" rx="1" />
            </g>
            {/* Base/cartucho - Marrom mais escuro */}
            <g fill={i < ammo ? "#6B5340" : "#4A3F32"} stroke="none">
              <rect x="7" y="24" width="6" height="8" rx="0.5" />
              <ellipse cx="10" cy="24" rx="3" ry="1.5" />
              <ellipse cx="10" cy="32" rx="3" ry="1" />
            </g>
            {/* Brilho na ponta */}
            {i < ammo && (
              <rect
                x="8.5"
                y="11"
                width="1"
                height="10"
                fill="#F4D03F"
                opacity="0.5"
                rx="0.5"
              />
            )}
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
