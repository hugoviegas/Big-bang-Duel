import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { fetchLeaderboard } from "../../lib/firebaseService";
import { getCharacter, getAvatarCrop } from "../../lib/characters";
import type { LeaderboardEntry } from "../../types";

type RankingMode = "overall" | "solo" | "online";

const RANK_STYLES: Record<number, string> = {
  1: "border-yellow-400 bg-yellow-400/10",
  2: "border-gray-300 bg-gray-300/10",
  3: "border-orange-400 bg-orange-400/10",
};

const RANK_BADGES: Record<number, string> = {
  1: "OURO",
  2: "PRATA",
  3: "BRONZE",
};

export function Leaderboard() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<RankingMode>("overall");

  useEffect(() => {
    setIsLoading(true);
    fetchLeaderboard(50, mode)
      .then((data) => {
        setEntries(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [mode]);

  const rankingTitle =
    mode === "online"
      ? "RANKING ONLINE"
      : mode === "solo"
        ? "RANKING SOLO"
        : "RANKING GLOBAL";

  const rankingSubtitle =
    mode === "online"
      ? "Somente partidas online"
      : mode === "solo"
        ? "Somente partidas solo"
        : "Todos os modos combinados";

  return (
    <div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto p-4 py-8">
        <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">
          {rankingTitle}
        </h1>
        <p className="text-center font-stats text-sm text-sand/50 mb-4">
          {rankingSubtitle}
        </p>

        <div className="mb-6 rounded-xl border border-sand/20 bg-black/30 p-1.5 flex gap-1.5">
          <button
            onClick={() => setMode("overall")}
            className={`flex-1 py-2 rounded-lg font-stats text-xs uppercase tracking-widest transition-all ${
              mode === "overall"
                ? "bg-gold/20 border border-gold/40 text-gold"
                : "text-sand/60 hover:text-sand-light hover:bg-black/30"
            }`}
          >
            Global
          </button>
          <button
            onClick={() => setMode("solo")}
            className={`flex-1 py-2 rounded-lg font-stats text-xs uppercase tracking-widest transition-all ${
              mode === "solo"
                ? "bg-gold/20 border border-gold/40 text-gold"
                : "text-sand/60 hover:text-sand-light hover:bg-black/30"
            }`}
          >
            Solo
          </button>
          <button
            onClick={() => setMode("online")}
            className={`flex-1 py-2 rounded-lg font-stats text-xs uppercase tracking-widest transition-all ${
              mode === "online"
                ? "bg-sky/20 border border-sky/50 text-sky"
                : "text-sand/60 hover:text-sand-light hover:bg-black/30"
            }`}
          >
            Online
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && entries.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-sand/20 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="font-stats text-sand/40">
              Nenhum duelo registrado ainda.
            </p>
            <p className="font-stats text-sm text-sand/30 mt-1">
              Jogue partidas para aparecer no ranking!
            </p>
          </div>
        )}

        {/* Leaderboard Table */}
        {!isLoading && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const char = getCharacter(entry.avatar);
              const isMe = entry.uid === currentUser?.uid;
              return (
                <div
                  key={entry.uid}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 backdrop-blur-sm transition-all animate-fade-up ${
                    isMe
                      ? "border-gold/60 bg-gold/10 ring-1 ring-gold/30"
                      : RANK_STYLES[entry.rank] || "border-sand/10 bg-black/30"
                  }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Rank */}
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-western text-sm shrink-0 ${
                      entry.rank <= 3
                        ? "bg-gold/20 text-gold"
                        : "bg-black/30 text-sand/60"
                    }`}
                  >
                    {entry.rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full border-2 border-sand/30 overflow-hidden shrink-0">
                    <img
                      src={char.image}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ objectPosition: getAvatarCrop(entry.avatar) }}
                    />
                  </div>

                  {/* Name + Badge + Code */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-western text-sm text-sand-light tracking-wider truncate">
                        {entry.displayName}
                      </span>
                      {isMe && (
                        <span className="font-stats text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded">
                          VOCÊ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-sand/30">
                        {entry.playerCode}
                      </span>
                      {RANK_BADGES[entry.rank] && (
                        <span
                          className={`font-stats text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            entry.rank === 1
                              ? "bg-yellow-400/20 text-yellow-400"
                              : entry.rank === 2
                                ? "bg-gray-300/20 text-gray-300"
                                : "bg-orange-400/20 text-orange-400"
                          }`}
                        >
                          {RANK_BADGES[entry.rank]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <div className="font-stats text-sm font-bold text-gold">
                      {entry.wins}V / {entry.losses}D
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="font-stats text-[10px] text-sand/50">
                        {entry.totalGames} jogos
                      </span>
                      <span className="font-stats text-[10px] text-sky-400">
                        {entry.winRate}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => navigate("/menu")}
          className="btn-western btn-danger mt-8 max-w-xs mx-auto"
        >
          VOLTAR AO MENU
        </button>
      </div>
    </div>
  );
}
