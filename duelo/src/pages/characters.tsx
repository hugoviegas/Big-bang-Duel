import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useUserPreferences } from "../hooks/useUserPreferences";
import {
  CHARACTERS,
  CLASS_INFO,
  RARITY_STYLES,
  RARITY_LABELS,
  type CharacterDef,
} from "../lib/characters";
import type { CharacterClass } from "../types";

/* ─── Rarity visual helpers ──────────────────────────────────────────── */
const RARITY_BORDER: Record<CharacterDef["rarity"], string> = {
  common: "border-sand/20",
  rare: "border-sky-400/40",
  legendary: "border-gold/50",
};
const RARITY_BORDER_ACTIVE: Record<CharacterDef["rarity"], string> = {
  common: "border-sand/60",
  rare: "border-sky-400",
  legendary: "border-gold",
};
const RARITY_GLOW: Record<CharacterDef["rarity"], string> = {
  common: "",
  rare: "shadow-[0_0_20px_rgba(56,189,248,0.20)]",
  legendary: "shadow-[0_0_40px_rgba(234,179,8,0.28)]",
};
const RARITY_ATMOSPHERE: Record<CharacterDef["rarity"], string> = {
  common: "",
  rare: "bg-[radial-gradient(ellipse_at_50%_85%,rgba(56,189,248,0.09),transparent_65%)]",
  legendary:
    "bg-[radial-gradient(ellipse_at_50%_85%,rgba(234,179,8,0.12),transparent_65%)]",
};

/* ─── Class colour palette ──────────────────────────────────────────── */
const CLASS_BOX: Record<CharacterClass, string> = {
  atirador: "bg-red-950/70 border-red-500/45",
  estrategista: "bg-blue-950/70 border-blue-500/45",
  sorrateiro: "bg-purple-950/70 border-purple-500/45",
  ricochete: "bg-yellow-950/70 border-yellow-500/45",
  sanguinario: "bg-orange-950/70 border-orange-500/45",
  suporte: "bg-green-950/70 border-green-500/45",
};
const CLASS_TEXT: Record<CharacterClass, string> = {
  atirador: "text-red-400",
  estrategista: "text-blue-400",
  sorrateiro: "text-purple-400",
  ricochete: "text-yellow-400",
  sanguinario: "text-orange-400",
  suporte: "text-green-400",
};
const CLASS_CARD_CHIP: Record<CharacterClass, string> = {
  atirador: "bg-red-950/80 border-red-500/50 text-red-400",
  estrategista: "bg-blue-950/80 border-blue-500/50 text-blue-400",
  sorrateiro: "bg-purple-950/80 border-purple-500/50 text-purple-400",
  ricochete: "bg-yellow-950/80 border-yellow-500/50 text-yellow-400",
  sanguinario: "bg-orange-950/80 border-orange-500/50 text-orange-400",
  suporte: "bg-green-950/80 border-green-500/50 text-green-400",
};
const CLASS_PILL_ACTIVE: Record<CharacterClass | "all", string> = {
  all: "bg-gold/20 border-gold/60 text-gold",
  atirador: "bg-red-900/80 border-red-500/60 text-red-300",
  estrategista: "bg-blue-900/80 border-blue-500/60 text-blue-300",
  sorrateiro: "bg-purple-900/80 border-purple-500/60 text-purple-300",
  ricochete: "bg-yellow-900/80 border-yellow-500/60 text-yellow-300",
  sanguinario: "bg-orange-900/80 border-orange-500/60 text-orange-300",
  suporte: "bg-green-900/80 border-green-500/60 text-green-300",
};

/* ─── Filter descriptor list ─────────────────────────────────────────── */
const CLASS_FILTERS: Array<{
  value: CharacterClass | "all";
  label: string;
  icon: string;
}> = [
  { value: "all", label: "Todos", icon: "⚔️" },
  { value: "atirador", label: "Atirador", icon: "🎯" },
  { value: "estrategista", label: "Estrategista", icon: "🧠" },
  { value: "sorrateiro", label: "Sorrateiro", icon: "👻" },
  { value: "ricochete", label: "Ricochete", icon: "🔄" },
  { value: "sanguinario", label: "Sanguinário", icon: "🩸" },
  { value: "suporte", label: "Suporte", icon: "🛡️" },
];

/* ══════════════════════════════════════════════════════════════════════
   GALLERY CARD
══════════════════════════════════════════════════════════════════════ */
function CharacterCard({
  char,
  isActive,
  onClick,
}: {
  char: CharacterDef;
  isActive: boolean;
  onClick: () => void;
}) {
  const cls = CLASS_INFO[char.characterClass];

  return (
    <motion.button
      layout
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col rounded-2xl border-2 overflow-hidden select-none bg-black/60 transition-all duration-200
        ${
          isActive
            ? `${RARITY_BORDER_ACTIVE[char.rarity]} ${RARITY_GLOW[char.rarity]}`
            : `${RARITY_BORDER[char.rarity]} hover:border-sand/40`
        }`}
    >
      {/* Active star */}
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 left-2 z-20 w-5 h-5 rounded-full bg-gold flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.8)]"
        >
          <span className="text-[9px] text-black font-bold leading-none">
            ★
          </span>
        </motion.div>
      )}

      {/* Rarity tag */}
      <div
        className={`absolute top-2 right-2 z-20 px-1.5 py-[3px] rounded-sm border ${RARITY_STYLES[char.rarity]} bg-black/85`}
      >
        <span className="text-[6px] font-stats uppercase tracking-widest font-bold">
          {RARITY_LABELS[char.rarity]}
        </span>
      </div>

      {/* Portrait */}
      <div
        className="relative w-full overflow-hidden bg-gradient-to-b from-zinc-900/60 to-black/60"
        style={{ aspectRatio: "3/4" }}
      >
        {char.rarity !== "common" && (
          <div
            className={`absolute inset-0 pointer-events-none ${RARITY_ATMOSPHERE[char.rarity]}`}
          />
        )}
        <img
          src={char.image}
          alt={char.name}
          loading="lazy"
          className="absolute inset-0 w-full h-[112%] object-contain object-top transition-transform duration-500 hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/65 to-transparent pointer-events-none" />
      </div>

      {/* Name + class chip */}
      <div className="px-2.5 pb-3 pt-2 bg-black/30">
        <p className="font-western text-[10px] text-sand-light leading-tight line-clamp-1 mb-1.5">
          {char.name}
        </p>
        <div
          className={`inline-flex items-center gap-1 px-1.5 py-[3px] rounded-[5px] border ${CLASS_CARD_CHIP[char.characterClass]}`}
        >
          <span className="text-[9px] leading-none">{cls.icon}</span>
          <span className="font-stats text-[7px] uppercase tracking-wide font-bold">
            {cls.name}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DETAIL MODAL — rendered via portal at document.body to escape
   overflow:hidden constraints of .mobile-shell
══════════════════════════════════════════════════════════════════════ */
function CharacterModal({
  char,
  saving,
  isActive,
  onSelect,
  onClose,
}: {
  char: CharacterDef;
  saving: boolean;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const cls = CLASS_INFO[char.characterClass];
  const clsBox = CLASS_BOX[char.characterClass];
  const clsText = CLASS_TEXT[char.characterClass];

  // Portrait height : 55% of viewport height, capped at 360px
  const portraitHeightStyle = "min(55vh, 360px)";

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[9999] flex items-stretch justify-center bg-black/80"
      onClick={onClose}
    >
      {/* Inner shell — matches max-width of mobile-shell on desktop */}
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.8 }}
        className="relative w-full max-w-[430px] bg-black flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP BAR ── */}
        <div className="flex-none flex items-center justify-between px-4 pt-4 pb-2 z-10">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-white/5 border border-sand/15 rounded-full px-3 py-1.5 text-sand/70 hover:text-sand active:scale-95 transition-colors"
          >
            <span className="text-base leading-none">←</span>
            <span className="font-stats text-[10px] uppercase tracking-wider">
              Voltar
            </span>
          </button>
          <div
            className={`px-2.5 py-1 rounded-full border ${RARITY_STYLES[char.rarity]} bg-black/70`}
          >
            <span className="font-stats text-[9px] uppercase tracking-widest font-bold">
              {RARITY_LABELS[char.rarity]}
            </span>
          </div>
        </div>

        {/* ── PORTRAIT ── */}
        <div
          className="flex-none relative w-full overflow-hidden"
          style={{ height: portraitHeightStyle }}
        >
          {/* Atmospheric bg */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
          {char.rarity !== "common" && (
            <div
              className={`absolute inset-0 pointer-events-none ${RARITY_ATMOSPHERE[char.rarity]}`}
            />
          )}

          {/* Character image: h-[115%] slightly overflows so feet are cropped */}
          <img
            src={char.image}
            alt={char.name}
            className="absolute inset-x-0 top-0 object-contain object-top"
          />

          {/* Fade into info — minimal gradient, just enough to blend */}
          <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </div>

        {/* ── SCROLLABLE INFO ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-black px-5 py-4">
          {/* Name + title */}
          <div className="mb-4">
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
              className="font-western text-[2rem] leading-tight text-white"
            >
              {char.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="font-sans text-sm text-gray-300 mt-1"
            >
              {char.title}
            </motion.p>
          </div>

          {/* Passive ability */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mb-4"
          >
            <p className="font-sans text-xs text-gray-400 mb-2.5 uppercase tracking-wide">
              Habilidade Passiva — 20% de chance
            </p>
            <div className={`rounded-xl border-2 p-3.5 ${clsBox}`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl leading-none flex-shrink-0">{cls.icon}</span>
                <div>
                  <p className="font-sans text-base font-bold text-white leading-tight">
                    {cls.abilityName}
                  </p>
                  <p className="font-sans text-xs text-gray-300 mt-0.5 capitalize">
                    {cls.name}
                  </p>
                </div>
              </div>
              <div className="h-[1px] bg-white/10 mb-3" />
              <p className="font-sans text-sm leading-relaxed text-white">
                {cls.description}
              </p>
            </div>
          </motion.div>

          {/* Quote/Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="font-sans text-base text-gray-200 leading-relaxed mb-4 text-center"
          >
            "{char.description}"
          </motion.p>

          {/* Spacer */}
          <div className="h-2" />
        </div>

        {/* ── CTA — outside the scroll area, always visible ── */}
        <div className="flex-none px-5 pt-3 pb-6 bg-black border-t border-white/5">
          {isActive ? (
            <div className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-gold/40 bg-gold/10 shadow-[0_0_20px_rgba(234,179,8,0.10)]">
              <svg
                className="w-5 h-5 text-gold flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span className="font-western text-gold text-base tracking-[0.1em]">
                PERSONAGEM ATIVO
              </span>
            </div>
          ) : (
            <button
              onClick={onSelect}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-btn-western border border-gold/40 text-gold font-western text-base tracking-[0.1em] shadow-lg shadow-black/50 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              ) : (
                "SELECIONAR PERSONAGEM"
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  // Portal to body — escapes overflow:hidden on .mobile-shell
  return createPortal(modal, document.body);
}

/* ══════════════════════════════════════════════════════════════════════
   PAGE ROOT
══════════════════════════════════════════════════════════════════════ */
export default function CharactersPage() {
  const user = useAuthStore((s) => s.user);
  const { loadPreferences, saveCharacter } = useUserPreferences();

  const currentCharId = user?.avatar ?? "marshal";
  const [expanded, setExpanded] = useState<CharacterDef | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string>(currentCharId);
  const [filter, setFilter] = useState<CharacterClass | "all">("all");

  useEffect(() => {
    loadPreferences();
  }, []);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const handleSelect = async (char: CharacterDef) => {
    setSaving(true);
    await saveCharacter(char.id);
    setSavedId(char.id);
    setSaving(false);
    setExpanded(null);
  };

  const filtered =
    filter === "all"
      ? CHARACTERS
      : CHARACTERS.filter((c) => c.characterClass === filter);

  return (
    <div className="w-full px-3 pt-4 pb-8">
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="font-western text-3xl text-gold text-glow-gold tracking-widest">
          PISTOLEIROS
        </h1>
        <p className="font-stats text-[10px] text-sand/40 uppercase tracking-[0.2em] mt-1">
          {CHARACTERS.length} personagens · escolha o seu
        </p>
      </div>

      {/* Class filter pills */}
      <div className="mb-5 -mx-3 px-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
          {CLASS_FILTERS.map(({ value, label, icon }) => {
            const isActive = filter === value;
            return (
              <motion.button
                key={value}
                onClick={() => setFilter(value)}
                whileTap={{ scale: 0.93 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap
                  ${
                    isActive
                      ? CLASS_PILL_ACTIVE[value]
                      : "bg-black/40 border-sand/15 text-sand/45 hover:border-sand/30 hover:text-sand/65"
                  }`}
              >
                <span className="text-sm leading-none">{icon}</span>
                <span className="font-stats text-[10px] font-bold uppercase tracking-wider">
                  {label}
                </span>
                {isActive && filter !== "all" && (
                  <span className="font-stats text-[9px] opacity-60 ml-0.5">
                    {filtered.length}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <motion.div layout className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((char) => (
            <CharacterCard
              key={char.id}
              char={char}
              isActive={savedId === char.id}
              onClick={() => setExpanded(char)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Detail modal — portal-rendered */}
      <AnimatePresence>
        {expanded && (
          <CharacterModal
            char={expanded}
            saving={saving}
            isActive={savedId === expanded.id}
            onSelect={() => handleSelect(expanded)}
            onClose={() => setExpanded(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
