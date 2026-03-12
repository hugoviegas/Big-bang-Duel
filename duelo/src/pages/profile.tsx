import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  CHARACTERS,
  getCharacter,
  getAllAvatarOptions,
  resolveAvatarPicture,
  RARITY_STYLES,
  RARITY_LABELS,
} from "../lib/characters";
import {
  updatePlayerProfile,
  getPlayerProfile,
  subscribeToPlayerProfile,
} from "../lib/firebaseService";
import {
  calculateProgression,
  normalizeCurrencies,
  normalizeRanked,
  normalizeUnlocks,
} from "../lib/progression";
import { ACHIEVEMENTS, normalizeAchievements } from "../lib/achievements";
import type { PlayerProfile } from "../types";

export default function ProfilePage() {
  const { uid: routeUid } = useParams<{ uid?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isOwnProfile = !routeUid || routeUid === user?.uid;

  // Profile data from Firestore (always has latest data from DB)
  const [ownProfileFromDb, setOwnProfileFromDb] =
    useState<PlayerProfile | null>(null);
  const [publicProfile, setPublicProfile] = useState<PlayerProfile | null>(
    null,
  );
  const [loadingPublic, setLoadingPublic] = useState(false);

  // Subscribe to own profile with real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPlayerProfile(user.uid, (profile) => {
      if (profile) {
        setOwnProfileFromDb(profile);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to public profile with real-time updates (including characterStats and favoriteCharacter)
  useEffect(() => {
    if (!routeUid || routeUid === user?.uid) return;

    setLoadingPublic(true);

    // First load the profile
    getPlayerProfile(routeUid)
      .then((p) => setPublicProfile(p))
      .finally(() => setLoadingPublic(false));

    // Then subscribe to real-time updates
    const unsubscribe = subscribeToPlayerProfile(routeUid, (profile) => {
      if (profile) {
        setPublicProfile(profile);
      }
    });

    return () => unsubscribe();
  }, [routeUid, user?.uid]);

  // The profile data to display
  // For own profile: always use data from Firestore listener (most up-to-date)
  // For public profile: use data from Firestore listener
  const profile: PlayerProfile | null = isOwnProfile
    ? ownProfileFromDb ||
      (user
        ? {
            uid: user.uid,
            displayName: user.displayName,
            playerCode: user.playerCode,
            avatar: user.avatar,
            avatarPicture: user.avatarPicture,
            wins: user.wins,
            losses: user.losses,
            draws: user.draws,
            totalGames: user.totalGames,
            winRate: user.winRate,
            createdAt: user.createdAt
              ? new Date(user.createdAt).getTime()
              : Date.now(),
            lastSeen: user.lastSeen
              ? new Date(user.lastSeen).getTime()
              : Date.now(),
            onlineStatus: user.onlineStatus ?? "offline",
            statsByMode: user.statsByMode,
            progression: user.progression,
            currencies: user.currencies,
            ranked: user.ranked,
            unlocks: user.unlocks,
            characterStats: user.characterStats,
            achievements: user.achievements,
            favoriteCharacter: user.favoriteCharacter,
            winStreak: user.winStreak,
            opponentsFaced: user.opponentsFaced,
            onlinePlayersDefeated: user.onlinePlayersDefeated,
            perfectWins: user.perfectWins,
            highLifeWins: user.highLifeWins,
          }
        : null)
    : publicProfile;

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [selectedAvatar, setSelectedAvatar] = useState(
    user?.avatar ?? "marshal",
  );
  const [selectedAvatarPicture, setSelectedAvatarPicture] = useState(
    user?.avatarPicture ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOwnProfile && loadingPublic) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold font-western text-lg animate-pulse">
          Carregando perfil...
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const activeChar = getCharacter(
    isOwnProfile ? selectedAvatar : profile.avatar,
  );
  const currentAvatarPic = resolveAvatarPicture(
    isOwnProfile ? selectedAvatar : profile.avatar,
    isOwnProfile ? selectedAvatarPicture : profile.avatarPicture,
  );
  const allAvatarOptions = getAllAvatarOptions();
  const playerCode = profile.playerCode ?? "";
  const progression = calculateProgression(profile.progression?.xpTotal ?? 0);
  const currencies = normalizeCurrencies(profile.currencies);
  const ranked = normalizeRanked(profile.ranked);
  const unlocks = normalizeUnlocks(profile.unlocks);
  const statsByMode = profile.statsByMode ?? {
    solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
    online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
    overall: {
      wins: profile.wins ?? 0,
      losses: profile.losses ?? 0,
      draws: profile.draws ?? 0,
      totalGames: profile.totalGames ?? 0,
      winRate: profile.winRate ?? 0,
    },
  };

  const handleSelectAvatarPicture = (image: string) => {
    setSelectedAvatarPicture(image);
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);

    const trimmedName = displayName.trim().slice(0, 20);

    // Sync to Firestore - Firebase listener will update local state automatically
    // This prevents sync conflicts between local and server data
    try {
      await updatePlayerProfile(user.uid, {
        displayName: trimmedName,
        avatar: selectedAvatar,
        avatarPicture: selectedAvatarPicture ?? undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("[Profile] Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!playerCode) return;
    navigator.clipboard.writeText(playerCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">
        PERFIL
      </h1>
      <p className="text-center font-stats text-sm text-sand/50 mb-6">
        {isOwnProfile ? "Personalize seu pistoleiro" : profile.displayName}
      </p>

      {/* Profile Card */}
      <div className="card-wood p-6 rounded-2xl space-y-6 animate-fade-up">
        {/* Avatar Preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-gold/60 overflow-hidden shadow-lg">
              <img
                src={currentAvatarPic}
                alt={activeChar.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 font-stats text-[9px] font-bold px-2 py-0.5 rounded-full border ${RARITY_STYLES[activeChar.rarity]}`}
            >
              {RARITY_LABELS[activeChar.rarity]}
            </span>
          </div>
          <div className="text-center">
            <div className="font-western text-xl text-gold tracking-wider">
              {isOwnProfile
                ? displayName || "Pistoleiro"
                : profile.displayName || "Pistoleiro"}
            </div>
            <div className="font-stats text-xs text-sand/50 mt-0.5">
              {activeChar.name}
            </div>
          </div>
        </div>

        {/* Player Code */}
        <div className="bg-black/30 rounded-xl p-4">
          <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-1">
            Código de Jogador
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl text-gold font-bold tracking-widest flex-1">
              {playerCode || "Gerando..."}
            </span>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 hover:bg-gold/20 transition-all font-stats text-xs text-gold"
            >
              {copiedCode ? "✓ Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="font-stats text-[10px] text-sand/40 mt-1">
            Compartilhe seu código para receber convites de amizade
          </p>
        </div>

        {/* Display Name */}
        {isOwnProfile && (
          <div>
            <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-2">
              Nome de Pistoleiro
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              placeholder="Seu nome..."
              className="w-full px-4 py-3 rounded-xl bg-black/40 border-2 border-sand/20 focus:border-gold/60 text-sand-light font-western text-sm tracking-wider outline-none transition-colors"
            />
            <p className="font-stats text-[10px] text-sand/40 mt-1 text-right">
              {displayName.length}/20
            </p>
          </div>
        )}

        {/* Avatar Picture Selection */}
        {isOwnProfile && (
          <div>
            <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-3">
              Escolha sua Foto de Perfil
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
              {allAvatarOptions.map((opt) => (
                <button
                  key={opt.image}
                  onClick={() => handleSelectAvatarPicture(opt.image)}
                  className={`relative group rounded-full overflow-hidden border-2 transition-all aspect-square ${
                    currentAvatarPic === opt.image
                      ? "border-gold ring-2 ring-gold/40 scale-105"
                      : `${RARITY_STYLES[getCharacter(opt.characterId).rarity]} opacity-70 hover:opacity-100 hover:scale-105`
                  }`}
                >
                  <img
                    src={opt.image}
                    alt={opt.characterName}
                    className="w-full h-full object-cover"
                  />
                  {currentAvatarPic === opt.image && (
                    <div className="absolute inset-0 bg-gold/10 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-gold drop-shadow-lg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Character Selection (for gameplay) */}
        {isOwnProfile && (
          <div>
            <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-3">
              Personagem Ativo
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  disabled={!unlocks.charactersUnlocked.includes(char.id)}
                  onClick={() => {
                    if (!unlocks.charactersUnlocked.includes(char.id)) return;
                    setSelectedAvatar(char.id);
                    // If user hasn't explicitly picked a picture yet, auto-follow character
                    if (!profile.avatarPicture && !selectedAvatarPicture) {
                      setSelectedAvatarPicture(null);
                    }
                  }}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                    selectedAvatar === char.id
                      ? "border-gold ring-2 ring-gold/40 scale-105"
                      : unlocks.charactersUnlocked.includes(char.id)
                        ? `${RARITY_STYLES[char.rarity]} opacity-70 hover:opacity-100 hover:scale-105`
                        : "border-sand/20 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <img
                    src={char.profileImage}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                  {!unlocks.charactersUnlocked.includes(char.id) && (
                    <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                      <span className="text-base">🔒</span>
                    </div>
                  )}
                  {selectedAvatar === char.id && (
                    <div className="absolute inset-0 bg-gold/10 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-gold drop-shadow-lg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="bg-black/30 rounded-xl p-4">
          <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-3">
            Estatísticas
          </label>
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <div className="font-western text-lg text-green-400">
                {statsByMode.overall.wins}
              </div>
              <div className="font-stats text-[9px] text-sand/50">Vitórias</div>
            </div>
            <div>
              <div className="font-western text-lg text-red-400">
                {statsByMode.overall.losses}
              </div>
              <div className="font-stats text-[9px] text-sand/50">Derrotas</div>
            </div>
            <div>
              <div className="font-western text-lg text-gold">
                {statsByMode.overall.totalGames}
              </div>
              <div className="font-stats text-[9px] text-sand/50">Partidas</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-sand/20 bg-black/30 p-3">
              <div className="font-stats text-[10px] text-sand/60 uppercase tracking-widest mb-2">
                Solo
              </div>
              <div className="flex items-center justify-between">
                <span className="font-stats text-xs text-sand/60">
                  Vitórias
                </span>
                <span className="font-western text-green-400 text-base">
                  {statsByMode.solo.wins}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-stats text-xs text-sand/60">
                  Partidas
                </span>
                <span className="font-western text-gold text-base">
                  {statsByMode.solo.totalGames}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-sky/30 bg-black/30 p-3">
              <div className="font-stats text-[10px] text-sky uppercase tracking-widest mb-2">
                Online
              </div>
              <div className="flex items-center justify-between">
                <span className="font-stats text-xs text-sand/60">
                  Vitórias
                </span>
                <span className="font-western text-green-400 text-base">
                  {statsByMode.online.wins}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-stats text-xs text-sand/60">
                  Partidas
                </span>
                <span className="font-western text-gold text-base">
                  {statsByMode.online.totalGames}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-right">
            <span className="font-stats text-[10px] text-sand/50">
              Win Rate Geral:
            </span>
            <span className="font-western text-sky-400 text-base ml-2">
              {statsByMode.overall.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-4">
          <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-3">
            Progressão
          </label>

          <div className="flex items-center justify-between mb-2">
            <span className="font-stats text-xs text-sand/60">Nível atual</span>
            <span className="font-western text-gold text-lg">
              Nv {progression.level}
            </span>
          </div>

          <div className="h-2 rounded-full bg-black/40 border border-sand/20 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-gold"
              style={{
                width: `${Math.min(
                  100,
                  (progression.xpCurrentLevel /
                    Math.max(
                      1,
                      progression.xpForNextLevel -
                        progression.xpForCurrentLevel,
                    )) *
                    100,
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-stats">
            <span className="text-sand/60">
              XP Total: {progression.xpTotal.toLocaleString("pt-BR")}
            </span>
            <span className="text-sky-300">
              Falta {progression.xpToNextLevel.toLocaleString("pt-BR")} XP
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="rounded-lg border border-gold/30 bg-black/25 p-2">
              <div className="font-western text-gold text-base">
                {currencies.gold.toLocaleString("pt-BR")}
              </div>
              <div className="font-stats text-[9px] text-sand/50 uppercase">
                Gold
              </div>
            </div>
            <div className="rounded-lg border border-fuchsia-400/30 bg-black/25 p-2">
              <div className="font-western text-fuchsia-300 text-base">
                {currencies.ruby.toLocaleString("pt-BR")}
              </div>
              <div className="font-stats text-[9px] text-sand/50 uppercase">
                Ruby
              </div>
            </div>
            <div className="rounded-lg border border-orange-300/30 bg-black/25 p-2">
              <div className="font-western text-orange-300 text-base">
                {ranked.trophies.toLocaleString("pt-BR")}
              </div>
              <div className="font-stats text-[9px] text-sand/50 uppercase">
                Troféus
              </div>
            </div>
          </div>

          <div className="mt-3 text-right">
            <span className="font-stats text-[10px] text-sand/50">
              Pico de troféus:
            </span>
            <span className="font-western text-orange-200 text-base ml-2">
              {ranked.trophyPeak.toLocaleString("pt-BR")}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-sand/15">
            <div className="flex items-center justify-between text-xs font-stats text-sand/60">
              <span>Personagens desbloqueados</span>
              <span className="text-gold">
                {unlocks.charactersUnlocked.length}
              </span>
            </div>
          </div>
        </div>

        {/* Per-Character Stats */}
        {profile.characterStats &&
          Object.keys(profile.characterStats).length > 0 && (
            <div className="bg-black/30 rounded-xl p-4">
              <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-3">
                Estatísticas por Personagem
              </label>
              {profile.favoriteCharacter && (
                <div className="flex items-center gap-3 mb-4 p-2 rounded-lg border border-gold/30 bg-gold/5">
                  <img
                    src={getCharacter(profile.favoriteCharacter).profileImage}
                    alt=""
                    className="w-10 h-10 rounded-full border-2 border-gold/50"
                  />
                  <div>
                    <div className="font-stats text-[10px] text-sand/50 uppercase">
                      Favorito
                    </div>
                    <div className="font-western text-gold text-sm">
                      {getCharacter(profile.favoriteCharacter).name}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(profile.characterStats)
                  .sort(([, a], [, b]) => (b.partidas ?? 0) - (a.partidas ?? 0))
                  .map(([charId, stats]) => {
                    const char = getCharacter(charId);
                    return (
                      <div
                        key={charId}
                        className="flex items-center gap-2 p-2 rounded-lg border border-sand/15 bg-black/20"
                      >
                        <img
                          src={char.profileImage}
                          alt={char.name}
                          className="w-8 h-8 rounded-full border border-sand/30"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-stats text-[10px] text-sand/70 truncate">
                            {char.name}
                          </div>
                          <div className="flex gap-2 font-stats text-[9px]">
                            <span className="text-green-400">
                              {stats.vitorias ?? 0}V
                            </span>
                            <span className="text-red-400">
                              {stats.derrotas ?? 0}D
                            </span>
                            <span className="text-sand/50">
                              {stats.partidas ?? 0}P
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        {/* Achievement Summary */}
        {(() => {
          const achMap = normalizeAchievements(profile.achievements);
          const achEntries = Object.values(achMap);
          const totalUnlocked = achEntries.reduce((n, p) => n + p.level, 0);
          const unclaimedCount = isOwnProfile
            ? ACHIEVEMENTS.reduce((n, def) => {
                const p = achMap[def.id];
                return n + (p && p.level > p.claimedLevel ? 1 : 0);
              }, 0)
            : 0;
          if (totalUnlocked === 0 && !isOwnProfile) return null;
          return (
            <div className="bg-black/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest">
                  Conquistas
                </label>
                {isOwnProfile && (
                  <button
                    onClick={() => navigate("/achievements")}
                    className="font-stats text-[10px] text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-2"
                  >
                    Ver Todas →
                    {unclaimedCount > 0 && (
                      <span className="inline-flex bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 ml-1">
                        {unclaimedCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-2">
                {ACHIEVEMENTS.slice(0, 12).map((def) => {
                  const prog = achMap[def.id];
                  const level = prog?.level ?? 0;
                  return (
                    <div
                      key={def.id}
                      title={def.name}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border ${level > 0 ? "border-gold/30 bg-gold/5" : "border-sand/10 bg-black/20 opacity-50"}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`w-5 h-5 ${level > 0 ? "text-yellow-400" : "text-gray-500"}`}
                      >
                        <path fill="currentColor" d={def.icon} />
                      </svg>
                      {level > 0 && (
                        <span className="font-stats text-[8px] text-gold">
                          Nv{level}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalUnlocked > 0 && (
                <div className="mt-2 text-right font-stats text-[10px] text-sand/50">
                  {totalUnlocked} nível{totalUnlocked !== 1 ? "is" : ""}{" "}
                  desbloqueado{totalUnlocked !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })()}

        {/* Save Button */}
        {isOwnProfile && (
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className={`btn-western w-full ${saved ? "btn-sky" : ""}`}
          >
            {saving ? "SALVANDO..." : saved ? "✓ SALVO!" : "SALVAR PERFIL"}
          </button>
        )}
      </div>
    </div>
  );
}
