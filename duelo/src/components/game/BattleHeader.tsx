import { motion } from "framer-motion";
import { resolveAvatarPicture } from "../../lib/characters";
import type { PlayerState } from "../../types";

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
      style={{ paddingTop: "calc(var(--ios-notch-top, 0px) + 0.5rem)" }}
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
        <img
          src={avatar}
          alt={player.displayName}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute -bottom-5 md:-bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[10px] md:text-xs font-stats text-sand-light drop-shadow-lg uppercase">
          {player.displayName}
        </span>
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
  const healthPercent = (player.life / player.maxLife) * 100;
  const isLow = healthPercent <= 33;
  const isCritical = healthPercent <= 15;

  return (
    <div
      className={`flex flex-col gap-1 flex-1 ${isOpponent ? "items-end" : "items-start"}`}
    >
      <div className="relative h-4 md:h-5 w-full bg-black/60 rounded-lg border border-gold/30 overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: `${Math.max(0, Math.min(healthPercent, 100))}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full transition-all duration-300 ${
            isCritical
              ? "bg-gradient-to-r from-red-700 to-red-500 animate-pulse"
              : isLow
                ? "bg-gradient-to-r from-orange-600 to-yellow-500"
                : "bg-gradient-to-r from-emerald-600 to-green-400"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      <AmmoIndicator
        ammo={hideOpponentAmmo && isOpponent ? 0 : player.ammo}
        maxAmmo={player.maxAmmo}
        isOpponent={isOpponent}
      />
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
      className={`flex gap-1 ${isOpponent ? "justify-end" : "justify-start"}`}
    >
      {Array.from({ length: maxAmmo }).map((_, i) => (
        <motion.div
          key={i}
          animate={
            i < ammo ? { scale: [1, 1.15, 1] } : { scale: 1, opacity: 0.35 }
          }
          transition={{
            duration: 1.6,
            delay: i * 0.1,
            repeat: i < ammo ? Infinity : 0,
          }}
          className={`w-1.5 h-4 md:w-2 md:h-5 rounded-full transition-all ${
            i < ammo
              ? "bg-gold shadow-[0_0_6px_rgba(212,175,55,0.8)]"
              : "bg-sand/25"
          }`}
          title={i < ammo ? "Bala carregada" : "Sem bala"}
        />
      ))}
    </div>
  );
}
