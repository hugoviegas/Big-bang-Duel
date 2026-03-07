import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import {
  CHARACTERS,
  getCharacter,
  getAllAvatarOptions,
  resolveAvatarPicture,
  RARITY_STYLES,
  RARITY_LABELS,
} from "../lib/characters";
import { updatePlayerProfile } from "../lib/firebaseService";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const updateCharacter = useAuthStore((s) => s.updateCharacter);

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

  const activeChar = getCharacter(selectedAvatar);
  const currentAvatarPic = resolveAvatarPicture(
    selectedAvatar,
    selectedAvatarPicture,
  );
  const allAvatarOptions = getAllAvatarOptions();
  const playerCode = user?.playerCode ?? "";
  const statsByMode = user?.statsByMode ?? {
    solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
    online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
    overall: {
      wins: user?.wins ?? 0,
      losses: user?.losses ?? 0,
      draws: user?.draws ?? 0,
      totalGames: user?.totalGames ?? 0,
      winRate: user?.winRate ?? 0,
    },
  };

  const handleSelectAvatarPicture = (image: string) => {
    setSelectedAvatarPicture(image);
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);

    const trimmedName = displayName.trim().slice(0, 20);

    // Update local state
    updateUser({
      displayName: trimmedName,
      avatarPicture: selectedAvatarPicture ?? undefined,
    });
    updateCharacter(selectedAvatar);

    // Sync to Firestore
    await updatePlayerProfile(user.uid, {
      displayName: trimmedName,
      avatar: selectedAvatar,
      avatarPicture: selectedAvatarPicture ?? undefined,
    }).catch(() => {});

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyCode = () => {
    if (!playerCode) return;
    navigator.clipboard.writeText(playerCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">
        PERFIL
      </h1>
      <p className="text-center font-stats text-sm text-sand/50 mb-6">
        Personalize seu pistoleiro
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
              {displayName || "Pistoleiro"}
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

        {/* Avatar Picture Selection */}
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

        {/* Character Selection (for gameplay) */}
        <div>
          <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-3">
            Personagem Ativo
          </label>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
            {CHARACTERS.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  setSelectedAvatar(char.id);
                  // If user hasn't explicitly picked a picture yet, auto-follow character
                  if (!user?.avatarPicture && !selectedAvatarPicture) {
                    setSelectedAvatarPicture(null);
                  }
                }}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                  selectedAvatar === char.id
                    ? "border-gold ring-2 ring-gold/40 scale-105"
                    : `${RARITY_STYLES[char.rarity]} opacity-70 hover:opacity-100 hover:scale-105`
                }`}
              >
                <img
                  src={char.profileImage}
                  alt={char.name}
                  className="w-full h-full object-cover"
                />
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

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          className={`btn-western w-full ${saved ? "btn-sky" : ""}`}
        >
          {saving ? "SALVANDO..." : saved ? "✓ SALVO!" : "SALVAR PERFIL"}
        </button>
      </div>
    </div>
  );
}
