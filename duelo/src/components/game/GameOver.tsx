import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import {
  recordMatchResult,
  type MatchContext,
} from "../../lib/firebaseService";
import {
  getCharacter,
  getCharacterClass,
  CLASS_INFO,
  getClassIconSources,
} from "../../lib/characters";
import { useFirebaseRoom } from "../../hooks/useFirebase";
import type { MatchResult } from "../../lib/firebaseService";
import type { MatchMode } from "../../types";
import {
  calculateMatchRewards,
  calculateProgression,
  normalizeUnlocks,
  getLevelUpRewards,
  type MatchRewardSummary,
  type LevelReward,
} from "../../lib/progression";

function Star({
  filled,
  color = "gold",
}: {
  filled: boolean;
  color?: "gold" | "red";
}) {
  const c = filled ? (color === "gold" ? "#D4AF37" : "#f87171") : "#374151";
  const shadow = filled
    ? color === "gold"
      ? "0 0 8px rgba(212,175,55,0.8)"
      : "0 0 8px rgba(248,113,113,0.8)"
    : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7 transition-all"
      style={{ filter: shadow ? `drop-shadow(${shadow})` : undefined }}
    >
      <path
        fill={c}
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    </svg>
  );
}

export function GameOver() {
  const {
    winnerId,
    player,
    opponent,
    history,
    turn,
    mode,
    quitGame,
    initializeGame,
    isOnline,
    roomId,
    bestOf3,
    playerStars,
    opponentStars,
  } = useGameStore();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { markPlayerReturnedToMenu } = useFirebaseRoom();
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">(
    () => (user ? "saving" : "saved"),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<
    { achievementId: string; tierIndex: number; label: string }[]
  >([]);

  let result: MatchResult;
  if (winnerId === player.id) {
    result = "win";
  } else if (winnerId === opponent.id) {
    result = "loss";
  } else {
    result = "draw";
  }

  const matchMode: MatchMode = isOnline ? "online" : "solo";

  // Computed ONCE at mount time — frozen so Firestore subscription updates
  // don't cause the reward display to recompute with already-saved values.
  const [rewardSnapshot] = useState<{
    rewardSummary: MatchRewardSummary;
    levelRewards: LevelReward[];
    levelBefore: number;
    levelAfter: number;
    masteryPoints: number;
    playerCharacterClass: string;
  }>(() => {
    const currentProgression = calculateProgression(
      user?.progression?.xpTotal ?? 0,
    );
    const rewardSummary = calculateMatchRewards(matchMode, result);
    const nextProgression = calculateProgression(
      (user?.progression?.xpTotal ?? 0) + rewardSummary.xpGained,
    );
    const unlocks = normalizeUnlocks(user?.unlocks);
    const playerCharClass = getCharacterClass(player.avatar);
    return {
      rewardSummary,
      levelRewards: getLevelUpRewards(
        currentProgression.level,
        nextProgression.level,
        unlocks,
      ),
      levelBefore: currentProgression.level,
      levelAfter: nextProgression.level,
      masteryPoints: 1,
      playerCharacterClass: playerCharClass,
    };
  });

  // Record stats only once per game-over render
  const statsRecorded = useRef(false);
  useEffect(() => {
    if (statsRecorded.current) return;
    statsRecorded.current = true;

    if (!user) return;

    const reward = rewardSnapshot.rewardSummary;

    // Build match context from game state for stats/achievements tracking
    const matchCtx: MatchContext = {
      history,
      playerCharacterId: player.avatar,
      opponentCharacterId: opponent.avatar,
      opponentUid: opponent.id, // Firebase UID of opponent (may be undefined for offline/solo matches)
      remainingLife: player.life, // Player's remaining life at end of match
      matchStartTime: useGameStore.getState().matchStartTime ?? undefined,
    };

    // Persist to Firestore - Firebase is the source of truth
    // The real-time listener will automatically update local state when saved
    recordMatchResult(user.uid, result, matchMode, reward, matchCtx)
      .then((matchResultUpdate) => {
        if (matchResultUpdate?.achievementEval?.newlyUnlocked?.length) {
          setNewAchievements(matchResultUpdate.achievementEval.newlyUnlocked);
        }
        setSaveStatus("saved");
      })
      .catch((error) => {
        console.error("[GameOver] Failed to save match result:", error);
        setSaveStatus("error");
        setSaveError(
          "Falha ao computar recompensa. Tente novamente em instantes.",
        );
      });
  }, [matchMode, result, user, rewardSnapshot, history, player, opponent]);

  const rewardSummary = rewardSnapshot.rewardSummary;
  const levelRewards = rewardSnapshot.levelRewards;
  const levelBefore = rewardSnapshot.levelBefore;
  const levelAfter = rewardSnapshot.levelAfter;
  const masteryPoints = rewardSnapshot.masteryPoints;
  const playerCharacterClass = rewardSnapshot.playerCharacterClass;

  // Resolve avatar image using character registry
  const resolveAvatar = (avatarId: string): string => {
    const char = getCharacter(avatarId);
    return char.image;
  };

  let title = "EMPATE!";
  let titleColor = "text-gold";
  let bgGradient = "from-yellow-900/90 to-black/90";
  let winnerAvatar = "";

  if (winnerId === player.id) {
    title = "VITÓRIA!";
    titleColor = "text-green-400";
    bgGradient = "from-green-900/80 to-black/90";
    winnerAvatar = resolveAvatar(player.avatar);
  } else if (winnerId === opponent.id) {
    title = "DERROTA!";
    titleColor = "text-red-500";
    bgGradient = "from-red-900/80 to-black/90";
    winnerAvatar = resolveAvatar(opponent.avatar);
  } else {
    winnerAvatar = "/assets/ui/logo_bbd.webp";
  }

  const playerCardsUsed = history.reduce(
    (acc, h) => {
      acc[h.playerCard] = (acc[h.playerCard] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mostUsedCard = Object.entries(playerCardsUsed).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const totalPlayerDamage = history.reduce(
    (sum, h) => sum + h.opponentLifeLost,
    0,
  );
  const totalDamageTaken = history.reduce(
    (sum, h) => sum + h.playerLifeLost,
    0,
  );

  const handleRematch = () => {
    initializeGame(
      mode,
      isOnline,
      false,
      roomId ?? undefined,
      player.avatar,
      {},
      player.displayName,
    );
  };

  const handleMenu = async () => {
    if (saveStatus !== "saved") return;

    if (isOnline && roomId) {
      try {
        await markPlayerReturnedToMenu(roomId);
      } catch (error) {
        console.error("[GameOver] Failed to mark room return:", error);
      }
    }

    quitGame();
    navigate("/menu");
  };

  const CARD_LABELS: Record<string, string> = {
    shot: "Tiro",
    double_shot: "Tiro Duplo",
    dodge: "Desvio",
    reload: "Recarga",
    counter: "Contra-golpe",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-50 flex items-start justify-center bg-gradient-to-b ${bgGradient} overflow-y-auto`}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
        className="card-wood p-5 md:p-8 max-w-md w-full flex flex-col items-center mt-4 mb-4 mx-4"
      >
        {/* Winner image */}
        <motion.img
          src={winnerAvatar}
          alt=""
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-28 h-36 md:w-36 md:h-44 object-contain drop-shadow-2xl"
        />

        {/* Title */}
        <motion.h1
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className={`font-western text-5xl md:text-6xl ${titleColor} text-glow-gold mt-2 mb-3`}
        >
          {title}
        </motion.h1>

        {/* Best-of-3 stars recap */}
        {bestOf3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-6 mb-4 bg-black/30 rounded-xl px-6 py-3 w-full justify-center"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="font-stats text-[9px] text-sand/50 uppercase">
                {player.displayName}
              </span>
              <div className="flex gap-1">
                <Star filled={playerStars >= 1} color="gold" />
                <Star filled={playerStars >= 2} color="gold" />
              </div>
            </div>
            <span className="font-western text-gold/40 text-xl">VS</span>
            <div className="flex flex-col items-center gap-1">
              <span className="font-stats text-[9px] text-sand/50 uppercase">
                {opponent.displayName}
              </span>
              <div className="flex gap-1">
                <Star filled={opponentStars >= 1} color="red" />
                <Star filled={opponentStars >= 2} color="red" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="w-full bg-black/30 rounded-xl p-4 mb-6 space-y-2 font-stats text-sm text-sand-light">
          <div className="flex justify-between border-b border-sand/10 pb-1">
            <span className="text-sand/60">Turnos jogados</span>
            <span className="font-bold">{turn}</span>
          </div>
          <div className="flex justify-between border-b border-sand/10 pb-1">
            <span className="text-sand/60">Dano causado</span>
            <span className="font-bold text-green-400">
              {totalPlayerDamage}
            </span>
          </div>
          <div className="flex justify-between border-b border-sand/10 pb-1">
            <span className="text-sand/60">Dano recebido</span>
            <span className="font-bold text-red-400">{totalDamageTaken}</span>
          </div>
          {mostUsedCard && (
            <div className="flex justify-between">
              <span className="text-sand/60">Carta favorita</span>
              <span className="font-bold text-gold">
                {CARD_LABELS[mostUsedCard[0]] || mostUsedCard[0]} (
                {mostUsedCard[1]}x)
              </span>
            </div>
          )}
        </div>

        {/* Rewards */}
        {rewardSummary && (
          <div className="w-full bg-black/35 border border-gold/25 rounded-xl p-4 mb-6 space-y-2 font-stats text-sm text-sand-light">
            <div className="flex items-center justify-between border-b border-sand/10 pb-1">
              <span className="text-sand/60 flex items-center gap-2">
                <span className="inline-flex w-4 h-4 items-center justify-center rounded-full border border-sky/40 text-sky text-[10px]">
                  ✦
                </span>
                XP ganho
              </span>
              <span className="font-bold text-sky">
                +{rewardSummary.xpGained}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-sand/10 pb-1">
              <span className="text-sand/60 flex items-center gap-2">
                <picture>
                  <source
                    srcSet="/assets/ui/gold_coin.webp"
                    type="image/webp"
                  />
                  <img
                    src="/assets/ui/png/gold_coin.png"
                    alt="gold"
                    className="w-4 h-4"
                  />
                </picture>
                Ouro ganho
              </span>
              <span className="font-bold text-gold">
                +{rewardSummary.goldGained}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-sand/10 pb-1">
              <span className="text-sand/60 flex items-center gap-2">
                {(playerCharacterClass as keyof typeof CLASS_INFO) && (
                  <picture>
                    <source
                      srcSet={
                        getClassIconSources(playerCharacterClass as any).webp
                      }
                      type="image/webp"
                    />
                    <img
                      src={getClassIconSources(playerCharacterClass as any).png}
                      alt={playerCharacterClass}
                      className="w-4 h-4"
                    />
                  </picture>
                )}
                Pontos de Maestria
              </span>
              <span className="font-bold text-amber-400">+{masteryPoints}</span>
            </div>
            {isOnline && (
              <div className="flex items-center justify-between border-b border-sand/10 pb-1">
                <span className="text-sand/60 flex items-center gap-2">
                  <picture>
                    <source
                      srcSet="/assets/ui/trophie_icon.webp"
                      type="image/webp"
                    />
                    <img
                      src="/assets/ui/png/trophie_icon.png"
                      alt="trophy"
                      className="w-4 h-4"
                    />
                  </picture>
                  Troféus
                </span>
                <span
                  className={`font-bold ${
                    rewardSummary.trophyDelta >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {rewardSummary.trophyDelta >= 0 ? "+" : ""}
                  {rewardSummary.trophyDelta}
                </span>
              </div>
            )}
            {levelBefore !== null && levelAfter !== null && (
              <div className="flex items-center justify-between border-b border-sand/10 pb-1">
                <span className="text-sand/60">Nível</span>
                <span className="font-bold text-purple-300">
                  Nv {levelBefore} → Nv {levelAfter}
                </span>
              </div>
            )}
            {levelRewards.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] uppercase tracking-widest text-sand/50 mb-2">
                  Recompensas de nível
                </p>
                <div className="space-y-1">
                  {levelRewards.map((reward) => (
                    <div
                      key={reward.level}
                      className="flex items-center justify-between text-xs text-sand"
                    >
                      <span>Nv {reward.level}</span>
                      <span className="text-gold">
                        +{reward.gold} ouro
                        {reward.unlockedCharacterId
                          ? ` · ${reward.unlockedCharacterId}`
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="w-full space-y-3">
          {(saveStatus !== "saved" || saveError) && (
            <div className="w-full bg-black/40 border border-sand/20 rounded-xl p-3 text-center">
              {saveStatus === "saving" && (
                <span className="font-stats text-[10px] text-sand/70 uppercase tracking-widest">
                  Computando resultado da partida...
                </span>
              )}
              {saveError && (
                <span className="font-stats text-[10px] text-red-300 uppercase tracking-widest">
                  {saveError}
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleRematch}
            disabled={saveStatus !== "saved"}
            className="btn-western animate-pulse-glow"
          >
            REVANCHE
          </button>
          <button
            onClick={handleMenu}
            disabled={saveStatus !== "saved"}
            className="btn-western btn-danger"
          >
            MENU PRINCIPAL
          </button>
        </div>

        {/* New Achievements Popup */}
        {newAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", delay: 0.5 }}
            className="card-wood p-6 mt-6 border-2 border-gold/50 bg-gradient-to-br from-yellow-900/20 to-transparent"
          >
            <div className="text-center mb-4">
              <h3 className="font-western text-lg text-gold mb-1">
                🏆 CONQUISTA DESBLOQUEADA!
              </h3>
              <p className="text-xs text-sand/70 uppercase tracking-widest">
                Clique em "Conquistas" para reclamar sua recompensa
              </p>
            </div>

            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {newAchievements.map((ach, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="bg-black/40 border border-gold/30 rounded-lg px-3 py-2 text-center"
                >
                  <p className="font-western text-sm text-gold">{ach.label}</p>
                  <p className="font-stats text-[10px] text-sand/60">
                    Nível {ach.tierIndex + 1} desbloqueado
                  </p>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => {
                quitGame();
                navigate("/achievements");
              }}
              className="btn-western w-full bg-gradient-to-r from-yellow-700 to-yellow-900 text-gold"
            >
              IR PARA CONQUISTAS
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
