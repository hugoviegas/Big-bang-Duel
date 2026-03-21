import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import {
  ACHIEVEMENTS,
  normalizeAchievements,
  type AchievementDef,
} from "../lib/achievements";
import {
  claimAchievementReward,
  syncAchievementsRetroactively,
  subscribeToPlayerProfile,
} from "../lib/firebaseService";
import type { PlayerProfile } from "../types";

function formatReward(gold: number, ruby: number): string {
  if (gold > 0 && ruby > 0) return `${gold} Ouro + ${ruby} Rubi`;
  if (gold > 0) return `${gold} Ouro`;
  if (ruby > 0) return `${ruby} Rubi`;
  return "Sem recompensa";
}

function getPendingReward(
  def: AchievementDef,
  progress: { level: number; claimedLevel: number },
): { gold: number; ruby: number } {
  let gold = 0;
  let ruby = 0;
  const start = Math.max(0, progress.claimedLevel);
  const end = Math.min(def.tiers.length, progress.level);

  for (let i = start; i < end; i++) {
    gold += def.tiers[i].reward.gold;
    ruby += def.tiers[i].reward.ruby;
  }

  return { gold, ruby };
}

function AchievementCard({
  def,
  progress,
  onClaim,
  claiming,
  initialExpanded = false,
}: {
  def: AchievementDef;
  progress: { level: number; progress: number; claimedLevel: number };
  onClaim: (achievementId: string, tierIndex: number) => void;
  claiming: string | null;
  initialExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const currentTierIdx = Math.min(progress.level, def.tiers.length) - 1;
  const nextTierIdx = Math.min(progress.level, def.tiers.length - 1);
  const nextTier = def.tiers[nextTierIdx];
  const isMaxLevel = progress.level >= def.tiers.length;
  const hasUnclaimedReward = progress.level > progress.claimedLevel;
  const pendingReward = getPendingReward(def, progress);
  const pctFill = isMaxLevel
    ? 100
    : nextTier
      ? Math.min(
          100,
          Math.round((progress.progress / nextTier.threshold) * 100),
        )
      : 0;

  const currentLabel =
    currentTierIdx >= 0 ? def.tiers[currentTierIdx].label : def.name;
  const visibleTier = isMaxLevel ? def.tiers[def.tiers.length - 1] : nextTier;
  const progressText = isMaxLevel
    ? `${progress.progress}`
    : `${progress.progress} / ${nextTier?.threshold ?? 0}`;

  // Keep expanded in sync if parent requests initial open (e.g., unclaimed rewards)
  useEffect(() => {
    if (initialExpanded) setExpanded(true);
  }, [initialExpanded]);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-b from-stone-900/95 via-stone-900/85 to-black/90 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_55%)]" />

      {/* COMPACT HEADER (always visible) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full relative flex items-center gap-4 p-4 hover:bg-black/20 transition-colors"
        aria-expanded={expanded}
      >
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
            progress.level > 0
              ? "bg-amber-500/20 border border-amber-300/40"
              : "bg-zinc-700/40 border border-zinc-500/40"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-8 h-8 ${
              progress.level > 0 ? "text-amber-300" : "text-zinc-400"
            }`}
          >
            <path fill="currentColor" d={def.icon} />
          </svg>
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-western text-lg md:text-xl text-gold leading-tight">
              {def.name}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-300 bg-black/25 border border-stone-600/60 rounded-full px-2 py-0.5">
                {progress.level}/{def.tiers.length}
              </span>
              {isMaxLevel && (
                <span title="Concluída" className="ml-1 inline-flex items-center text-emerald-300 bg-emerald-900/20 border border-emerald-600/30 rounded-full px-2 py-0.5 text-xs">
                  ✓
                </span>
              )}
              {hasUnclaimedReward && (
                <span className="ml-2 w-3 h-3 bg-red-600 rounded-full inline-block ring-2 ring-black animate-pulse" title="Recompensa disponível" />
              )}
            </div>
          </div>
          <p className="text-sm md:text-base text-amber-200/90 mt-1 line-clamp-1">{currentLabel}</p>
        </div>

        {/* Expand indicator */}
        <ChevronDown
          size={20}
          className={`flex-shrink-0 text-gold transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* EXPANDED DETAILS */}
      {expanded && (
        <div className="relative border-t border-amber-500/15 px-4 py-4 space-y-3">
          {/* Description */}
          <p className="text-sm md:text-base text-stone-100 leading-relaxed">
            {visibleTier?.description ?? "Conquista sem descricao"}
          </p>

          <p className="text-sm text-stone-300 mb-2">
            {isMaxLevel
              ? "Conquista completa. Todas as etapas foram alcancadas."
              : `Proxima etapa: ${nextTier?.label ?? "-"}`}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-zinc-700/60 rounded-full h-3 mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isMaxLevel
                  ? "bg-gradient-to-r from-yellow-500 to-amber-300"
                  : "bg-gradient-to-r from-orange-500 to-amber-400"
              }`}
              style={{ width: `${pctFill}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-stone-300">Progresso: {progressText}</span>
            <span className="text-stone-300">{pctFill}%</span>
          </div>

          {/* Reward boxes */}
          <div className="mt-4 grid gap-2">
            <div className="rounded-lg border border-amber-400/30 bg-amber-950/30 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-amber-200/80">
                Recompensa ao concluir etapa
              </p>
              <p className="text-sm md:text-base text-amber-100 font-semibold">
                {formatReward(
                  visibleTier?.reward.gold ?? 0,
                  visibleTier?.reward.ruby ?? 0,
                )}
              </p>
            </div>
          </div>

          {/* Tier indicators */}
          <div className="grid grid-cols-5 gap-1.5">
        {def.tiers.map((tier, i) => {
          const unlocked = progress.level > i;
          const claimed = progress.claimedLevel > i;
          return (
            <div
              key={i}
              title={`${tier.label}: ${tier.description}`}
              className={`h-2.5 rounded-full ${
                unlocked
                  ? claimed
                    ? "bg-emerald-400"
                    : "bg-amber-300 animate-pulse"
                  : "bg-zinc-600"
              }`}
            />
          );
        })}
          </div>

          {/* Claim button */}
          <button
            className={`w-full text-base py-2 rounded-lg font-semibold transition-all ${
              hasUnclaimedReward
                ? "btn-western"
                : "bg-gray-700/50 text-gray-400 cursor-default"
            }`}
            disabled={claiming !== null}
            onClick={() => hasUnclaimedReward && onClaim(def.id, progress.level - 1)}
          >
            {claiming === def.id
              ? "Resgatando..."
              : hasUnclaimedReward
                ? `Resgatar ${formatReward(pendingReward.gold, pendingReward.ruby)}`
                : "Nenhuma recompensa pendente"}
          </button>
        </div>
      )}
    </article>
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
  const [profileData, setProfileData] = useState<PlayerProfile | null>(null);

  // Retroactively evaluate achievements on mount and subscribe to profile updates
  useEffect(() => {
    if (!user) return;

    // Sync retroactively first
    syncAchievementsRetroactively(user.uid).catch((err) => {
      console.warn("[AchievementsPage] Retroactive sync failed:", err);
    });

    // Subscribe to FULL profile updates for real-time sync of ALL data
    // This ensures achievements, characterStats, favoriteCharacter, etc. are all up-to-date
    const unsubscribe = subscribeToPlayerProfile(user.uid, (profile) => {
      if (profile) {
        // Update with full profile data to keep everything in sync
        setProfileData(profile);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (!user) return null;

  // Use profileData if available (real-time sync), fallback to global user
  const displayUser = profileData || user;
  const allProgress = normalizeAchievements(displayUser.achievements);

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

  const totalCompleted = ACHIEVEMENTS.reduce((n, def) => {
    const p = allProgress[def.id];
    return n + (p?.level >= def.tiers.length ? 1 : 0);
  }, 0);

  // Sort achievements by status
  const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
    const progressA = allProgress[a.id];
    const progressB = allProgress[b.id];
    const hasRewardA = progressA.level > progressA.claimedLevel;
    const hasRewardB = progressB.level > progressB.claimedLevel;
    const isCompleteA = progressA.level >= a.tiers.length;
    const isCompleteB = progressB.level >= b.tiers.length;

    // 1. Recompensas pendentes (descending by progress)
    if (hasRewardA && !hasRewardB) return -1;
    if (!hasRewardA && hasRewardB) return 1;
    if (hasRewardA && hasRewardB)
      return progressB.progress - progressA.progress;

    // 2. Em progresso (descending by progress)
    if (!isCompleteA && !isCompleteB)
      return progressB.progress - progressA.progress;

    // 3. Completas (no specific order, but after in-progress)
    if (isCompleteA && !isCompleteB) return 1;
    if (!isCompleteA && isCompleteB) return -1;

    return 0;
  });

  return (
    <div className="min-h-screen bg-cover bg-center px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-950/30 via-stone-900/80 to-black/80 p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="text-gold hover:text-yellow-300 transition-colors"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7">
                <path
                  fill="currentColor"
                  d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                />
              </svg>
            </button>
            <div>
              <h1 className="font-western text-3xl md:text-4xl text-gold leading-none">
                Conquistas
              </h1>
              <p className="text-sm md:text-base text-stone-200 mt-2">
                Acompanhe seu progresso, objetivos e recompensas em tempo real.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="rounded-xl border border-amber-500/40 bg-black/35 px-3 py-2 text-sm md:text-base text-stone-100">
              Concluidas: <span className="text-amber-300 font-semibold">{totalCompleted}</span>/{ACHIEVEMENTS.length}
            </div>
            <div className="rounded-xl border border-red-500/40 bg-black/35 px-3 py-2 text-sm md:text-base text-stone-100">
              Pendentes: <span className="text-red-300 font-semibold">{totalUnclaimed}</span>
            </div>
          </div>
        </div>
        </div>

        {/* Toast message */}
        {claimMsg && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl text-sm md:text-base font-medium ${
            claimMsg.type === "success"
              ? "bg-green-800/70 text-green-300 border border-green-600/50"
              : "bg-red-800/70 text-red-300 border border-red-600/50"
          }`}
        >
          {claimMsg.text}
        </div>
        )}

        {/* Achievements grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedAchievements.map((def, idx) => {
            const p = allProgress[def.id] ?? { level: 0, progress: 0, claimedLevel: 0 };
            const hasUnclaimed = p.level > p.claimedLevel;
            return (
              <AchievementCard
                key={def.id}
                def={def}
                progress={p}
                onClaim={handleClaim}
                claiming={claiming}
                initialExpanded={!!hasUnclaimed}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
