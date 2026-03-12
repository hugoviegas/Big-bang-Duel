import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  ACHIEVEMENTS,
  normalizeAchievements,
  type AchievementDef,
} from "../lib/achievements";
import { claimAchievementReward } from "../lib/firebaseService";

function AchievementCard({
  def,
  progress,
  onClaim,
  claiming,
}: {
  def: AchievementDef;
  progress: { level: number; progress: number; claimedLevel: number };
  onClaim: (achievementId: string, tierIndex: number) => void;
  claiming: string | null;
}) {
  const currentTierIdx = Math.min(progress.level, def.tiers.length) - 1;
  const nextTierIdx = Math.min(progress.level, def.tiers.length - 1);
  const nextTier = def.tiers[nextTierIdx];
  const isMaxLevel = progress.level >= def.tiers.length;
  const hasUnclaimedReward = progress.level > progress.claimedLevel;
  const pctFill = isMaxLevel
    ? 100
    : nextTier
      ? Math.min(
          100,
          Math.round((progress.progress / nextTier.threshold) * 100),
        )
      : 0;

  // Current tier label
  const currentLabel =
    currentTierIdx >= 0 ? def.tiers[currentTierIdx].label : def.name;

  return (
    <div className="card-wood p-4 relative overflow-hidden">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
            progress.level > 0
              ? "bg-yellow-700/40 border border-yellow-500/50"
              : "bg-gray-700/40 border border-gray-600/50"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-7 h-7 ${
              progress.level > 0 ? "text-yellow-400" : "text-gray-500"
            }`}
          >
            <path fill="currentColor" d={def.icon} />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-western text-sm text-gold truncate">
              {currentLabel}
            </span>
            <span className="text-xs text-gray-400">
              {progress.level}/{def.tiers.length}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-300 mb-2">
            {isMaxLevel
              ? "Todas as etapas completas!"
              : (nextTier?.description ?? "")}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-700/60 rounded-full h-2.5 mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isMaxLevel
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-300"
                  : "bg-gradient-to-r from-amber-600 to-amber-400"
              }`}
              style={{ width: `${pctFill}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">
            {progress.progress}
            {!isMaxLevel && nextTier ? ` / ${nextTier.threshold}` : ""}
          </div>
        </div>
      </div>

      {/* Claim button */}
      {hasUnclaimedReward && (
        <button
          className="btn-western mt-3 w-full text-sm py-1.5"
          disabled={claiming !== null}
          onClick={() => onClaim(def.id, progress.level - 1)}
        >
          {claiming === def.id ? "Resgatando..." : "Resgatar Recompensa"}
        </button>
      )}

      {/* Tier pills */}
      <div className="flex gap-1 mt-3">
        {def.tiers.map((tier, i) => {
          const unlocked = progress.level > i;
          const claimed = progress.claimedLevel > i;
          return (
            <div
              key={i}
              title={`${tier.label}: ${tier.description}`}
              className={`flex-1 h-1.5 rounded-full ${
                unlocked
                  ? claimed
                    ? "bg-green-500"
                    : "bg-yellow-400 animate-pulse"
                  : "bg-gray-600"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  if (!user) return null;

  const allProgress = normalizeAchievements(user.achievements);

  const handleClaim = async (achievementId: string, tierIndex: number) => {
    setClaiming(achievementId);
    setClaimMsg(null);
    try {
      const res = await claimAchievementReward(
        user.uid,
        achievementId,
        tierIndex,
      );
      if (res.ok) {
        // Refresh local state
        const updated = { ...allProgress };
        updated[achievementId] = {
          ...updated[achievementId],
          claimedLevel: tierIndex + 1,
        };
        const currGold = user.currencies?.gold ?? 0;
        const currRuby = user.currencies?.ruby ?? 0;
        updateUser({
          achievements: updated,
          currencies: {
            gold: currGold + (res.reward?.gold ?? 0),
            ruby: currRuby + (res.reward?.ruby ?? 0),
          },
        });
        setClaimMsg({ text: res.message, type: "success" });
      } else {
        setClaimMsg({ text: res.message, type: "error" });
      }
    } catch {
      setClaimMsg({ text: "Erro ao resgatar.", type: "error" });
    } finally {
      setClaiming(null);
      setTimeout(() => setClaimMsg(null), 3000);
    }
  };

  // Count unclaimed
  const totalUnclaimed = ACHIEVEMENTS.reduce((n, def) => {
    const p = allProgress[def.id];
    return n + (p && p.level > p.claimedLevel ? 1 : 0);
  }, 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          className="text-gold hover:text-yellow-300 transition-colors"
          onClick={() => navigate(-1)}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path
              fill="currentColor"
              d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
            />
          </svg>
        </button>
        <h1 className="font-western text-2xl text-gold">Conquistas</h1>
        {totalUnclaimed > 0 && (
          <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {totalUnclaimed}
          </span>
        )}
      </div>

      {/* Claim toast */}
      {claimMsg && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
            claimMsg.type === "success"
              ? "bg-green-800/70 text-green-300 border border-green-600/50"
              : "bg-red-800/70 text-red-300 border border-red-600/50"
          }`}
        >
          {claimMsg.text}
        </div>
      )}

      {/* Achievement cards */}
      <div className="grid gap-4">
        {ACHIEVEMENTS.map((def) => (
          <AchievementCard
            key={def.id}
            def={def}
            progress={allProgress[def.id]}
            onClaim={handleClaim}
            claiming={claiming}
          />
        ))}
      </div>
    </div>
  );
}
