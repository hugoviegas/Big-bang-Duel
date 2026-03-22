import { useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { claimMissionRewardFromSubcollection } from "../lib/missions";
import { useMissions, type PlayerMission } from "../hooks/useMissions";

type MissionTab = "daily" | "weekly" | "monthly";

function difficultyLabel(diff: PlayerMission["difficulty"]): string {
  if (diff === "hard_prolonged") return "difícil longo";
  if (diff === "easy") return "fácil";
  if (diff === "medium") return "médio";
  return "difícil";
}

function formatTimeLeft(expiresAt?: number): string {
  if (!expiresAt) return "sem prazo";
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expirada";

  const totalMinutes = Math.floor(ms / 1000 / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h restantes`;
  if (hours > 0) return `${hours}h ${minutes}m restantes`;
  return `${minutes}m restantes`;
}

function categoryLabel(tab: MissionTab): string {
  if (tab === "daily") return "Diárias";
  if (tab === "weekly") return "Semanais";
  return "Mensais";
}

function difficultyDotColor(diff: PlayerMission["difficulty"]): string {
  if (diff === "easy") return "bg-green-500";
  if (diff === "medium") return "bg-yellow-500";
  if (diff === "hard") return "bg-orange-500";
  if (diff === "hard_prolonged") return "bg-red-600";
  return "bg-neutral-400";
}

type MissionDisplayTab = "active" | "completed";

export default function MissionsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<MissionTab>("daily");
  const [displayTab, setDisplayTab] = useState<MissionDisplayTab>("active");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const { grouped, loading, error, claimableCount } = useMissions(user?.uid);

  const visibleMissions = grouped[activeTab] ?? [];

  const activeMissions = useMemo(
    () =>
      [...visibleMissions]
        .filter((m) => !m.claimed)
        .sort((a, b) => {
          const scoreA = a.completed ? 1 : 0;
          const scoreB = b.completed ? 1 : 0;
          if (scoreA !== scoreB) return scoreB - scoreA; // completed first
          return (b.assignedAt ?? 0) - (a.assignedAt ?? 0);
        }),
    [visibleMissions],
  );

  const completedMissions = useMemo(
    () =>
      [...visibleMissions]
        .filter((m) => m.claimed)
        .sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0)),
    [visibleMissions],
  );

  const handleClaim = async (missionDocId: string) => {
    if (!user?.uid) return;
    setClaimingId(missionDocId);
    setFeedback("");
    try {
      await claimMissionRewardFromSubcollection(user.uid, missionDocId);
      setFeedback("Recompensa coletada com sucesso.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao coletar recompensa.";
      setFeedback(msg);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-4 py-5 space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-gold/35 bg-[#2b1409] shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
        <img
          src="/assets/ui/bg_saloon.webp"
          alt="Saloon"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-[#2f1407]/40 to-[#7b3515]/45" />

        <div className="relative px-3 sm:px-5 py-4 sm:py-6">
          <h1 className="font-western text-4xl sm:text-5xl text-gold text-glow-gold leading-none">
            MISSÕES
          </h1>
          <p className="mt-2 font-stats text-base sm:text-lg uppercase tracking-[0.12em] text-sand/80">
            {claimableCount > 0
              ? `Você tem ${claimableCount} recompensa(s) pronta(s).`
              : "Conclua objetivos para ganhar ouro e rubis."}
          </p>

          <div className="mt-4 flex gap-1 sm:gap-2 flex-wrap">
            {(["daily", "weekly", "monthly"] as MissionTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg border px-3 sm:px-4 py-2 font-stats text-sm sm:text-base uppercase tracking-[0.12em] transition-colors ${
                  activeTab === tab
                    ? "border-gold/60 bg-gold/20 text-gold"
                    : "border-sand/25 bg-black/25 text-sand/75 hover:bg-black/40"
                }`}
              >
                {categoryLabel(tab)}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-1 sm:gap-2">
            <button
              onClick={() => setDisplayTab("active")}
              className={`rounded-md px-3 py-1.5 font-stats text-sm sm:text-base uppercase tracking-[0.12em] transition-colors ${
                displayTab === "active"
                  ? "bg-gold/30 text-gold border border-gold/50"
                  : "bg-sand/10 text-sand/70 border border-sand/20"
              }`}
            >
              Ativas
            </button>
            <button
              onClick={() => setDisplayTab("completed")}
              className={`rounded-md px-3 py-1.5 font-stats text-sm sm:text-base uppercase tracking-[0.12em] transition-colors ${
                displayTab === "completed"
                  ? "bg-green-500/30 text-green-300 border border-green-500/50"
                  : "bg-sand/10 text-sand/70 border border-sand/20"
              }`}
            >
              Concluídas ({completedMissions.length})
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <section className="rounded-xl border border-gold/40 bg-black/35 px-3 py-2 mx-2 sm:mx-0">
          <p className="font-stats text-base uppercase tracking-[0.12em] text-gold">
            {feedback}
          </p>
        </section>
      )}

      <section className="card-wood rounded-2xl p-3 sm:p-4 space-y-3 mx-2 sm:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-western text-lg sm:text-2xl text-gold tracking-wider">
            {categoryLabel(activeTab)} ·{" "}
            {displayTab === "active" ? "Ativas" : "Concluídas"}
          </h2>
          <span className="font-stats text-sm sm:text-base uppercase tracking-[0.12em] text-sand/70">
            {displayTab === "active"
              ? activeMissions.length
              : completedMissions.length}
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-sand/20 bg-black/25 px-4 py-6 text-center">
            <p className="font-stats text-base uppercase tracking-[0.12em] text-sand/70">
              Carregando missões...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-6 text-center">
            <p className="font-stats text-base uppercase tracking-[0.12em] text-red-300">
              {error}
            </p>
          </div>
        ) : (displayTab === "active" ? activeMissions : completedMissions)
            .length === 0 ? (
          <div className="rounded-xl border border-sand/20 bg-black/25 px-4 py-6 text-center">
            <p className="font-stats text-base uppercase tracking-[0.12em] text-sand/70">
              Nenhuma missão{displayTab === "active" ? " ativa" : " concluída"}{" "}
              nesta categoria.
            </p>
          </div>
        ) : displayTab === "active" ? (
          activeMissions.map((mission) => {
            const target = mission.objective?.target || 1;
            const progress = Math.min(mission.progress || 0, target);
            const progressPct = Math.max(
              0,
              Math.min(100, (progress / target) * 100),
            );
            const canClaim = mission.completed && !mission.claimed;

            return (
              <article
                key={mission.docId}
                className={`rounded-xl border px-3 py-3 ${
                  mission.claimed
                    ? "border-sand/15 bg-black/20 opacity-70"
                    : canClaim
                      ? "border-green-500/45 bg-green-900/20"
                      : "border-sand/25 bg-black/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-flex h-4 w-4 rounded-full ${difficultyDotColor(mission.difficulty)}`}
                      />
                      <span className="font-stats text-sm uppercase tracking-[0.12em] text-sand/70">
                        {difficultyLabel(mission.difficulty)}
                      </span>
                    </div>
                    <h3 className="font-western text-xl sm:text-2xl text-sand-light leading-tight">
                      {mission.name}
                    </h3>
                    {typeof mission.description === "object" &&
                    mission.description !== null ? (
                      <div className="mt-2 space-y-2 text-base sm:text-lg">
                        <div>
                          <p className="font-stats uppercase tracking-[0.12em] text-sand/50 mb-0.5 text-sm">
                            Objetivo:
                          </p>
                          <p className="font-western text-white font-semibold leading-snug text-lg">
                            {mission.description.achievement}
                          </p>
                        </div>
                        <div>
                          <p className="font-stats uppercase tracking-[0.12em] text-sand/50 mb-0.5 text-sm">
                            Como:
                          </p>
                          <p className="font-stats text-white/90 leading-snug text-base">
                            {mission.description.how}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-stats text-base uppercase tracking-[0.11em] text-white mt-1">
                        {mission.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center justify-end gap-2">
                        <picture>
                          <source
                            srcSet="/assets/ui/gold_coin.webp"
                            type="image/webp"
                          />
                          <img
                            src="/assets/ui/png/gold_coin.png"
                            alt="gold"
                            className="w-5 h-5"
                          />
                        </picture>
                        <span className="font-stats text-base text-gold font-semibold">
                          +{mission.reward?.gold || 0}
                        </span>
                      </div>
                      {(mission.reward?.ruby || 0) > 0 && (
                        <div className="flex items-center justify-end gap-2">
                          <picture>
                            <source
                              srcSet="/assets/ui/ruby_coin.webp"
                              type="image/webp"
                            />
                            <img
                              src="/assets/ui/png/ruby_coin.png"
                              alt="ruby"
                              className="w-5 h-5"
                            />
                          </picture>
                          <span className="font-stats text-base text-red-300 font-semibold">
                            +{mission.reward.ruby}
                          </span>
                        </div>
                      )}
                      <p className="font-stats text-sm uppercase tracking-[0.1em] text-sand/60 mt-1">
                        {formatTimeLeft(mission.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-stats text-sm uppercase tracking-[0.1em] text-sand/65">
                      Progresso
                    </span>
                    <span className="font-stats text-sm uppercase tracking-[0.1em] text-sand-light">
                      {progress}/{target}
                    </span>
                  </div>
                  <div className="h-2 rounded-full border border-sand/20 bg-black/35 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        canClaim ? "bg-green-500" : "bg-gold"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {canClaim && (
                  <button
                    onClick={() => handleClaim(mission.docId)}
                    disabled={claimingId === mission.docId}
                    className="mt-3 w-full rounded-lg border border-green-400/50 bg-green-600/70 px-3 py-2 font-stats text-base uppercase tracking-[0.14em] text-white hover:bg-green-500/80 disabled:opacity-60"
                  >
                    {claimingId === mission.docId
                      ? "Coletando..."
                      : "Coletar recompensa"}
                  </button>
                )}
              </article>
            );
          })
        ) : (
          /* Completed Missions - Compact View */
          completedMissions.map((mission) => (
            <div
              key={mission.docId}
              className="rounded-lg border border-sand/15 bg-black/30 px-3 py-2 flex items-start justify-between gap-2 sm:gap-3 text-sm sm:text-base"
            >
              <div className="min-w-0 flex-1">
                <h4 className="font-western text-sand-light leading-tight text-base">
                  {mission.name}
                </h4>
                {typeof mission.description === "object" &&
                mission.description !== null ? (
                  <p className="font-stats text-sand/70 text-sm mt-1 truncate">
                    {mission.description.how}
                  </p>
                ) : (
                  <p className="font-stats text-sand/70 text-sm mt-1 truncate">
                    {mission.description}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-2">
                  <picture>
                    <source
                      srcSet="/assets/ui/gold_coin.webp"
                      type="image/webp"
                    />
                    <img
                      src="/assets/ui/png/gold_coin.png"
                      alt="gold"
                      className="w-5 h-5"
                    />
                  </picture>
                  <span className="font-stats font-bold text-gold">
                    +{mission.reward?.gold || 0}
                  </span>
                </div>
                {(mission.reward?.ruby || 0) > 0 && (
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <picture>
                      <source
                        srcSet="/assets/ui/ruby_coin.webp"
                        type="image/webp"
                      />
                      <img
                        src="/assets/ui/png/ruby_coin.png"
                        alt="ruby"
                        className="w-5 h-5"
                      />
                    </picture>
                    <span className="font-stats font-bold text-red-400">
                      +{mission.reward.ruby}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
