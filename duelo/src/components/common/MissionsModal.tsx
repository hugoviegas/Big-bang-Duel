import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  increment,
  runTransaction,
} from "firebase/firestore";
import { syncMissionsToPlayerProfile } from "../../lib/missions";

interface MissionProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MissionsModal({ isOpen, onClose }: MissionProps) {
  const user = useAuthStore((s: any) => s.user);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const q = query(collection(db, "players", user.uid, "missions"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMissions(list);
      setLoading(false);
      // Update the profile's activeMissions field for evaluation logic
      syncMissionsToPlayerProfile(user.uid, list);
    });

    return () => unsubscribe();
  }, [user?.uid, isOpen]);

  const claimReward = async (mission: any) => {
    if (mission.claimed || !mission.completed) return;

    try {
      await runTransaction(db, async (tx) => {
        const missionRef = doc(db, "players", user.uid, "missions", mission.id);
        const playerRef = doc(db, "players", user.uid);

        tx.update(missionRef, { claimed: true });

        const updates: any = {};
        if (mission.reward?.gold) {
          updates["currencies.gold"] = increment(mission.reward.gold);
        }
        if (mission.reward?.ruby) {
          updates["currencies.ruby"] = increment(mission.reward.ruby);
        }
        tx.update(playerRef, updates);
      });
    } catch (error) {
      console.error("Error claiming reward:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/60 font-sans animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl shadow-blue-500/10">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 skew-x-[-10deg]">
              <span className="font-bungee text-white text-xl">M</span>
            </div>
            <div>
              <h2 className="text-xl font-bungee text-white">
                Missões Quânticas
              </h2>
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">
                Acesse novos horizontes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-neutral-400"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="font-bungee text-sm">Sincronizando...</p>
            </div>
          ) : missions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-neutral-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bungee text-neutral-500">
                  Nenhuma missão ativa
                </p>
                <p className="text-sm text-neutral-600">
                  O Grande Mestre não designou tarefas ainda.
                </p>
              </div>
            </div>
          ) : (
            missions.map((m) => {
              const progressPct = Math.min(
                100,
                (m.progress / (m.objective?.target || 1)) * 100,
              );
              const isCollectable = m.completed && !m.claimed;

              return (
                <div
                  key={m.id}
                  className={`relative group bg-neutral-800/40 border transition-all duration-300 rounded-2xl p-5 ${
                    isCollectable
                      ? "border-green-500/50 bg-green-500/5"
                      : m.claimed
                        ? "border-white/5 opacity-60"
                        : "border-white/10 hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${
                            m.category === "daily"
                              ? "text-blue-400 border-blue-500/20 bg-blue-500/5"
                              : m.category === "weekly"
                                ? "text-purple-400 border-purple-500/20 bg-purple-500/5"
                                : "text-amber-400 border-amber-500/20 bg-amber-500/5"
                          }`}
                        >
                          {m.category}
                        </span>
                        <span className="text-[9px] font-mono text-neutral-500 uppercase">
                          {m.difficulty}
                        </span>
                      </div>
                      <h4 className="font-bungee text-white group-hover:text-blue-400 transition-colors uppercase leading-tight">
                        {m.name}
                      </h4>
                    </div>

                    <div className="flex gap-2">
                      {m.reward?.gold > 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-amber-400 font-bold text-sm tracking-tighter">
                            {m.reward.gold}
                          </span>
                          <span className="text-[8px] font-bungee text-amber-500/60">
                            OURO
                          </span>
                        </div>
                      )}
                      {m.reward?.ruby > 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-red-500 font-bold text-sm tracking-tighter">
                            {m.reward.ruby}
                          </span>
                          <span className="text-[8px] font-bungee text-red-500/60">
                            RUBI
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 mb-4 line-clamp-2 italic leading-snug">
                    "{m.description}"
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-neutral-500">PROGRESSO</span>
                      <span
                        className={
                          m.completed
                            ? "text-green-500 underline"
                            : "text-blue-400"
                        }
                      >
                        {m.progress} / {m.objective?.target}
                      </span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          m.completed
                            ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {isCollectable && (
                    <button
                      onClick={() => claimReward(m)}
                      className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bungee rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-95 animate-bounce-subtle"
                    >
                      COLETAR RECOMPENSA
                    </button>
                  )}

                  {m.claimed && (
                    <div className="mt-4 w-full py-2 bg-neutral-900/50 text-neutral-600 font-bungee rounded-xl flex items-center justify-center gap-2 border border-white/5">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      CONCLUÍDA
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950/80 border-t border-white/10 text-center">
          <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-[0.2em]">
            Protocolo de Desafios v2.5.0 // Big Bang Duel
          </p>
        </div>
      </div>
    </div>
  );
}
