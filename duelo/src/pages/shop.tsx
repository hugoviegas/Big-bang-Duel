import { useMemo, useState } from "react";
import { CHARACTERS, RARITY_LABELS } from "../lib/characters";
import { useAuthStore } from "../store/authStore";
import { buyCharacterInShop } from "../lib/firebaseService";
import {
  calculateProgression,
  normalizeCurrencies,
  normalizeUnlocks,
  resolveCharacterUnlockStatus,
} from "../lib/progression";
import { hasCompletedAllAchievements } from "../lib/achievements";

export default function ShopPage() {
  const user = useAuthStore((s) => s.user);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [confirmCharacterId, setConfirmCharacterId] = useState<string | null>(
    null,
  );

  const progression = calculateProgression(user?.progression?.xpTotal ?? 0);
  const currencies = normalizeCurrencies(user?.currencies);
  const unlocks = normalizeUnlocks(user?.unlocks);
  const allAchievementsCompleted = hasCompletedAllAchievements(
    user?.achievements,
  );
  const unlockedSet = useMemo(
    () => new Set(unlocks.charactersUnlocked),
    [unlocks.charactersUnlocked],
  );

  const handleBuyCharacter = async (characterId: string) => {
    if (!user) return;
    setMessage("");
    setLoadingId(characterId);

    const response = await buyCharacterInShop(user.uid, characterId);
    setLoadingId(null);
    setConfirmCharacterId(null);

    // Firebase listener will automatically update user state
    // No need to call updateUser() - that can cause sync issues
    setMessage(response.message);
  };

  const handleConfirmClick = (characterId: string) => {
    setConfirmCharacterId(characterId);
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-1 text-glow-gold animate-drop-bounce">
        LOJA
      </h1>
      <p className="text-center font-stats text-sm text-sand/50 mb-3">
        Compre personagens e itens especiais
      </p>

      <div className="card-wood p-4 rounded-2xl">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-gold/30 bg-black/30 p-3 flex items-center gap-2 justify-center">
            <picture>
              <source srcSet="/assets/ui/gold_coin.webp" type="image/webp" />
              <img
                src="/assets/ui/png/gold_coin.png"
                alt="gold"
                className="w-12 h-12 inline-block"
              />
            </picture>
            <div>
              <div className="font-western text-gold text-xl">
                {currencies.gold.toLocaleString("pt-BR")}
              </div>
              <div className="font-stats text-[10px] text-sand/60 uppercase tracking-widest">
                Gold
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-fuchsia-400/30 bg-black/30 p-3 flex items-center gap-2 justify-center">
            <picture>
              <source srcSet="/assets/ui/ruby_coin.webp" type="image/webp" />
              <img
                src="/assets/ui/png/ruby_coin.png"
                alt="ruby"
                className="w-12 h-12 inline-block"
              />
            </picture>
            <div>
              <div className="font-western text-fuchsia-300 text-xl">
                {currencies.ruby.toLocaleString("pt-BR")}
              </div>
              <div className="font-stats text-[10px] text-sand/60 uppercase tracking-widest">
                Ruby
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-sand/20 bg-black/35 p-3 text-center font-stats text-xs text-sand-light">
          {message}
        </div>
      )}

      <div className="card-wood p-4 rounded-2xl">
        <h2 className="font-western text-gold text-lg tracking-wider mb-3">
          Personagens
        </h2>

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          {CHARACTERS.map((char) => {
            const unlockStatus = resolveCharacterUnlockStatus(
              char.id,
              progression.level,
              allAchievementsCompleted,
            );
            const isOwned = unlockedSet.has(char.id);
            const canBeBought = unlockStatus.purchasable;
            const meetsRule = unlockStatus.unlockedByRule;
            const canBuy =
              !isOwned &&
              canBeBought &&
              meetsRule &&
              currencies.gold >= char.value;

            return (
              <div
                key={char.id}
                className="rounded-xl border border-sand/15 bg-black/30 p-3 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-sand/20 bg-black/30 flex-shrink-0">
                  <img
                    src={char.profileImage}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-western text-sm text-sand-light truncate">
                    {char.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-stats text-[10px] text-sand/50 uppercase tracking-wider">
                      {RARITY_LABELS[char.rarity]}
                    </span>
                    <span className="text-sand/40">•</span>
                    <span className="font-stats text-[10px] text-gold flex items-center gap-1">
                      <picture>
                        <source
                          srcSet="/assets/ui/gold_coin.webp"
                          type="image/webp"
                        />
                        <img
                          src="/assets/ui/png/gold_coin.png"
                          alt="gold"
                          className="w-3 h-3 inline-block"
                        />
                      </picture>
                      {char.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                {isOwned ? (
                  <span className="px-2 py-1 rounded-lg border border-green-500/40 text-green-400 font-stats text-[10px] uppercase tracking-wider">
                    Adquirido
                  </span>
                ) : (
                  <button
                    disabled={!canBuy || loadingId === char.id}
                    onClick={() => handleConfirmClick(char.id)}
                    className={`px-3 py-1.5 rounded-lg font-stats text-[10px] uppercase tracking-wider border transition-all ${
                      canBuy
                        ? "border-gold/50 text-gold bg-gold/10 hover:bg-gold/20"
                        : "border-sand/20 text-sand/40 bg-black/20"
                    }`}
                  >
                    {loadingId === char.id ? (
                      "..."
                    ) : !canBeBought ? (
                      "Especial"
                    ) : !meetsRule ? (
                      unlockStatus.requiredLevel ? (
                        `Nv ${unlockStatus.requiredLevel}`
                      ) : (
                        "Bloqueado"
                      )
                    ) : currencies.gold < char.value ? (
                      "Sem Gold"
                    ) : (
                      <span className="flex items-center gap-2">
                        <picture>
                          <source
                            srcSet="/assets/ui/gold_coin.webp"
                            type="image/webp"
                          />
                          <img
                            src="/assets/ui/png/gold_coin.png"
                            alt="gold"
                            className="w-4 h-4 inline-block"
                          />
                        </picture>
                        <span>Comprar</span>
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-wood p-4 rounded-2xl space-y-3">
        <h2 className="font-western text-gold text-lg tracking-wider">
          Emojis Personalizados
        </h2>
        <p className="font-stats text-xs text-sand/60 uppercase tracking-widest">
          Em breve: compre e equipe emojis para usar durante a partida
        </p>
      </div>

      <div className="card-wood p-4 rounded-2xl space-y-3">
        <h2 className="font-western text-gold text-lg tracking-wider">
          Comprar Ouro e Ruby
        </h2>
        <p className="font-stats text-xs text-sand/60 uppercase tracking-widest">
          Em breve: pacotes com dinheiro real
        </p>
      </div>

      {/* Purchase Confirmation Modal */}
      {confirmCharacterId &&
        (() => {
          const char = CHARACTERS.find((c) => c.id === confirmCharacterId);
          if (!char) return null;

          return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="card-wood rounded-2xl p-6 max-w-sm w-full border border-gold/30 space-y-4">
                {/* Header */}
                <div className="text-center">
                  <h2 className="font-western text-2xl text-gold mb-1">
                    Confirmar Compra
                  </h2>
                  <p className="font-stats text-xs text-sand/60 uppercase tracking-widest">
                    Deseja adquirir este personagem?
                  </p>
                </div>

                {/* Character Card */}
                <div className="rounded-xl bg-black/50 p-4 border border-sand/20 flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-sand/30 bg-black/30 flex-shrink-0">
                    <img
                      src={char.profileImage}
                      alt={char.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-western text-sm text-sand-light mb-1">
                      {char.name}
                    </h3>
                    <p className="font-stats text-[11px] text-sand/60 mb-2">
                      {char.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-stats uppercase tracking-wider border border-gold/40 text-gold bg-gold/10">
                        {RARITY_LABELS[char.rarity]}
                      </span>
                      <span className="text-sand/40">•</span>
                      <span className="font-stats text-[10px] text-gold flex items-center gap-1">
                        <picture>
                          <source
                            srcSet="/assets/ui/gold_coin.webp"
                            type="image/webp"
                          />
                          <img
                            src="/assets/ui/png/gold_coin.png"
                            alt="gold"
                            className="w-3 h-3"
                          />
                        </picture>
                        {char.value.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cost and Balance */}
                <div className="rounded-xl bg-black/30 p-3 space-y-2 border border-sand/15">
                  <div className="flex items-center justify-between">
                    <span className="font-stats text-xs text-sand/70">
                      Custo:
                    </span>
                    <span className="font-stats text-sm text-gold font-semibold flex items-center gap-1">
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
                      {char.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-stats text-xs text-sand/70">
                      Seu Ouro:
                    </span>
                    <span
                      className={`font-stats text-sm font-semibold ${
                        currencies.gold >= char.value
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {currencies.gold.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="h-px bg-sand/20 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="font-stats text-xs text-sand/70">
                      Após Compra:
                    </span>
                    <span className="font-stats text-sm text-sand-light font-semibold">
                      {(currencies.gold - char.value).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmCharacterId(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-sand/30 text-sand font-stats text-sm uppercase tracking-wider transition-colors hover:border-sand/50 hover:bg-sand/5"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={
                      currencies.gold < char.value || loadingId === char.id
                    }
                    onClick={() => handleBuyCharacter(char.id)}
                    className={`flex-1 px-4 py-2 rounded-lg font-stats text-sm uppercase tracking-wider transition-colors border ${
                      currencies.gold >= char.value && loadingId !== char.id
                        ? "border-gold/50 text-gold bg-gold/10 hover:bg-gold/20"
                        : "border-sand/20 text-sand/40 bg-black/20"
                    }`}
                  >
                    {loadingId === char.id ? "Comprando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
