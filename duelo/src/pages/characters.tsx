import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useUserPreferences } from "../hooks/useUserPreferences";
import {
  CHARACTERS,
  CLASS_INFO,
  getClassIconSources,
  RARITY_STYLES,
  RARITY_LABELS,
  type CharacterDef,
} from "../lib/characters";
import type { CharacterClass } from "../types";
import {
  normalizeUnlocks,
  getUnlockLevelForCharacter,
  calculateProgression,
  normalizeClassMastery,
  getClassAbilityChance,
  CLASS_MASTERY_THRESHOLDS,
  getClassMasteryUpgradeCost,
  resolveCharacterUnlockStatus,
  normalizeCurrencies,
} from "../lib/progression";
import {
  buyCharacterInShop,
  buyClassMasteryLevel,
} from "../lib/firebaseService";
import { hasCompletedAllAchievements } from "../lib/achievements";

const CHARACTER_PRICE_GOLD = 1000;
type TabType = "characters" | "classes";

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
  iconClass?: CharacterClass;
}> = [
  { value: "all", label: "Todos" },
  { value: "atirador", label: "Atirador", iconClass: "atirador" },
  { value: "estrategista", label: "Estrategista", iconClass: "estrategista" },
  { value: "sorrateiro", label: "Sorrateiro", iconClass: "sorrateiro" },
  { value: "ricochete", label: "Ricochete", iconClass: "ricochete" },
  { value: "sanguinario", label: "Sanguinário", iconClass: "sanguinario" },
  { value: "suporte", label: "Suporte", iconClass: "suporte" },
];

function ClassIcon({
  charClass,
  size = "w-5 h-5",
}: {
  charClass: CharacterClass;
  size?: string;
}) {
  const sources = getClassIconSources(charClass);

  return (
    <picture>
      <source srcSet={sources.webp} type="image/webp" />
      <img
        src={sources.png}
        alt={CLASS_INFO[charClass].name}
        className={size}
      />
    </picture>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CLASS MASTERY CARD (for Classes tab)
══════════════════════════════════════════════════════════════════════ */
function ClassMasteryCard({
  charClass,
  mastery,
  playerGold,
  upgradeCost,
  upgrading,
  onUpgrade,
}: {
  charClass: CharacterClass;
  mastery: ReturnType<typeof normalizeClassMastery>[CharacterClass];
  playerGold: number;
  upgradeCost: number | null;
  upgrading: boolean;
  onUpgrade: () => void;
}) {
  const classInfo = CLASS_INFO[charClass];
  const clsBox = CLASS_BOX[charClass];
  const currentThreshold = CLASS_MASTERY_THRESHOLDS[mastery.level - 1] ?? 0;
  const nextThreshold =
    CLASS_MASTERY_THRESHOLDS[mastery.level] ?? currentThreshold;
  const progressInLevel =
    nextThreshold > currentThreshold
      ? Math.min(
          100,
          Math.round(
            ((mastery.points - currentThreshold) /
              (nextThreshold - currentThreshold)) *
              100,
          ),
        )
      : 100;
  const abilityChance = Math.round(
    getClassAbilityChance(charClass, mastery.level) * 100,
  );
  const nextAbilityChance = Math.round(
    getClassAbilityChance(
      charClass,
      Math.min(mastery.level + 1, CLASS_MASTERY_THRESHOLDS.length),
    ) * 100,
  );
  const renderedDescription = (classInfo.description || "").replace(
    "{chance}",
    `${abilityChance}%`,
  );
  const canPreviewNext = mastery.points >= nextThreshold && mastery.level < 5;

  const nextThresholdForDisplay = nextThreshold;
  const showUpgradeButton =
    mastery.level < 5 &&
    mastery.points >= nextThresholdForDisplay &&
    upgradeCost !== null;
  const canPay = (upgradeCost ?? Number.MAX_SAFE_INTEGER) <= playerGold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border-2 p-0 overflow-hidden ${clsBox} backdrop-blur-sm shadow-xl`}
    >
      <div className="flex h-full">
        {/* Icon column - larger, occupies card height */}
        <div className="flex-shrink-0 w-28 p-4 flex items-center justify-center bg-black/20">
          <ClassIcon
            charClass={charClass}
            size="h-full w-auto max-w-[64px] max-h-[120px]"
          />
        </div>

        {/* Info column */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-western text-lg text-white font-bold tracking-wide leading-tight">
                {classInfo.name}
              </p>
              <p className="font-stats text-[11px] text-sand/85 uppercase tracking-widest font-semibold leading-tight">
                {classInfo.abilityName}
              </p>
            </div>
            <div className="text-right bg-black/50 rounded-xl px-3 py-2.5 border border-gold/40">
              <p className="font-western text-2xl text-gold font-bold leading-none">
                Nv {mastery.level}
              </p>
              <p className="font-stats text-[10px] text-sand/75 font-medium leading-tight mt-1">
                {mastery.points} pts
              </p>
            </div>
          </div>

          <div className="h-3 rounded-full bg-black/50 border border-white/20 overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressInLevel}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-gold/90 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.7)]"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="font-stats text-[11px] text-sand/85 font-semibold">
              {mastery.level < 5
                ? `${mastery.points}/${nextThreshold} para Nv ${mastery.level + 1}`
                : "🏆 Máximo"}
            </p>
            <div className="px-3 py-1.5 rounded-lg border border-gold/70 bg-gold/30 backdrop-blur-sm shadow-md">
              <span className="font-western text-lg text-gold font-bold leading-none">
                {canPreviewNext
                  ? `${abilityChance}% › ${nextAbilityChance}%`
                  : `${abilityChance}%`}
              </span>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-3" />
          <p className="font-sans text-sm text-sand/90 leading-relaxed font-medium">
            {renderedDescription}
          </p>

          {showUpgradeButton && upgradeCost !== null && (
            <button
              onClick={onUpgrade}
              disabled={!canPay || upgrading}
              className="mt-4 w-full rounded-xl border border-gold/40 bg-black/50 px-3 py-2 font-stats text-xs uppercase tracking-wider text-gold transition-colors hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {upgrading
                ? "Evoluindo..."
                : `Evoluir para Nv ${mastery.level + 1} · ${upgradeCost.toLocaleString("pt-BR")} Gold`}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   GALLERY CARD
══════════════════════════════════════════════════════════════════════ */
function CharacterCard({
  char,
  isActive,
  isLocked,
  canBuy,
  lockLabel,
  unlockLevel,
  onClick,
}: {
  char: CharacterDef;
  isActive: boolean;
  isLocked: boolean;
  canBuy: boolean;
  lockLabel: string;
  unlockLevel: number | null;
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

        {isLocked && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1">
            <span className="text-xl">🔒</span>
            <span className="font-stats text-[9px] uppercase tracking-wider text-sand/80">
              {lockLabel ||
                (unlockLevel ? `Requer Nv ${unlockLevel}` : "Bloqueado")}
            </span>
          </div>
        )}

        {canBuy && (
          <div className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded-md border border-green-400/50 bg-green-950/70">
            <span className="font-stats text-[8px] uppercase tracking-wider text-green-300">
              Comprável
            </span>
          </div>
        )}
      </div>

      {/* Name + class chip */}
      <div className="px-2.5 pb-3 pt-2 bg-black/30">
        <p className="font-western text-[10px] text-sand-light leading-tight line-clamp-1 mb-1.5">
          {char.name}
        </p>
        <div
          className={`inline-flex items-center gap-1 px-1.5 py-[3px] rounded-[5px] border ${CLASS_CARD_CHIP[char.characterClass]}`}
        >
          <ClassIcon charClass={char.characterClass} size="w-3.5 h-3.5" />
          <span className="font-stats text-[7px] uppercase tracking-wide font-bold">
            {cls.name}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PURCHASE CONFIRMATION MODAL
══════════════════════════════════════════════════════════════════════ */
function ConfirmPurchaseModal({
  char,
  onConfirm,
  onCancel,
  loading,
}: {
  char: CharacterDef;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-black border-2 border-gold/40 rounded-2xl p-6 max-w-xs w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-western text-gold text-xl tracking-wider mb-2">
          Confirmar Compra
        </h3>
        <p className="font-sans text-gray-300 text-sm mb-4">
          Deseja comprar{" "}
          <span className="font-bold text-white">{char.name}</span> por{" "}
          <span className="font-bold text-gold">
            {CHARACTER_PRICE_GOLD.toLocaleString("pt-BR")} Gold
          </span>
          ?
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-sand/30 text-sand/70 font-western text-sm tracking-wider hover:bg-black/50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-green-950/50 border border-green-500/50 text-green-300 font-western text-sm tracking-wider hover:bg-green-950/70 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-3 h-3 border border-green-400/50 border-t-green-300 rounded-full animate-spin" />
            ) : (
              "Comprar"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

/* ══════════════════════════════════════════════════════════════════════
   DETAIL MODAL — rendered via portal at document.body to escape
   overflow:hidden constraints of .mobile-shell
══════════════════════════════════════════════════════════════════════ */
function CharacterModal({
  char,
  saving,
  isActive,
  isOwned,
  canBuy,
  lockReason,
  classMastery,
  onSelect,
  onBuy,
  onClose,
}: {
  char: CharacterDef;
  saving: boolean;
  isActive: boolean;
  isOwned: boolean;
  canBuy: boolean;
  lockReason: string;
  classMastery: ReturnType<typeof normalizeClassMastery>;
  onSelect: () => void;
  onBuy: () => void;
  onClose: () => void;
}) {
  const cls = CLASS_INFO[char.characterClass];
  const clsBox = CLASS_BOX[char.characterClass];

  // Portrait height : 55% of viewport height, capped at 360px
  const portraitHeightStyle = "min(55vh, 360px)";
  const abilityChance = Math.round(
    getClassAbilityChance(
      char.characterClass,
      classMastery[char.characterClass].level,
    ) * 100,
  );

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
        <div
          className="flex-none flex items-center justify-between px-4 pb-2 z-10"
          style={{
            paddingTop: "max(16px, calc(env(safe-area-inset-top, 0px) + 16px))",
          }}
        >
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
              Habilidade Passiva
            </p>
            <div className={`rounded-xl border-2 p-3.5 ${clsBox}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0">
                  <ClassIcon
                    charClass={char.characterClass}
                    size="w-10 h-10 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-sans text-base font-bold text-white leading-tight">
                    {cls.abilityName}
                  </p>
                  <p className="font-sans text-xs text-gray-300 mt-0.5 capitalize">
                    {cls.name}
                  </p>
                  <div className="mt-2 inline-block px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                    <span className="font-western text-lg text-gold">
                      {abilityChance}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-[1px] bg-white/10 mb-3" />
              <p className="font-sans text-sm leading-relaxed text-white">
                {(cls.description || "").replace(
                  "{chance}",
                  `${abilityChance}%`,
                )}
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
          ) : isOwned ? (
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
          ) : canBuy ? (
            <button
              onClick={onBuy}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-green-950/40 border border-green-500/50 text-green-300 font-western text-sm tracking-[0.05em] shadow-lg shadow-black/50 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-green-500/40 border-t-green-400 rounded-full animate-spin" />
              ) : (
                <>
                  <picture>
                    <source
                      srcSet="/assets/ui/gold_coin.webp"
                      type="image/webp"
                    />
                    <img
                      src="/assets/ui/gold_coin.png"
                      alt="gold"
                      className="w-4 h-4"
                    />
                  </picture>
                  Comprar {CHARACTER_PRICE_GOLD.toLocaleString("pt-BR")}
                </>
              )}
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border border-sand/30 bg-black/40">
              <span className="font-western text-sand-light text-sm tracking-[0.08em]">
                BLOQUEADO · {lockReason}
              </span>
            </div>
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
  const progression = calculateProgression(user?.progression?.xpTotal ?? 0);
  const currencies = normalizeCurrencies(user?.currencies);
  const unlocks = normalizeUnlocks(user?.unlocks);
  const classMastery = normalizeClassMastery(user?.classMastery);
  const allAchievementsCompleted = hasCompletedAllAchievements(
    user?.achievements,
  );
  const unlockedSet = useMemo(
    () => new Set(unlocks.charactersUnlocked),
    [unlocks.charactersUnlocked],
  );

  const currentCharId = user?.avatar ?? "marshal";
  const [expanded, setExpanded] = useState<CharacterDef | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string>(currentCharId);
  const [filter, setFilter] = useState<CharacterClass | "all">("all");
  const [tab, setTab] = useState<TabType>("characters");
  const [buying, setBuying] = useState<string | null>(null);
  const [upgradingClass, setUpgradingClass] = useState<CharacterClass | null>(
    null,
  );
  const [confirmPurchase, setConfirmPurchase] = useState<CharacterDef | null>(
    null,
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

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
    if (!unlockedSet.has(char.id)) {
      return;
    }
    setSaving(true);
    await saveCharacter(char.id);
    setSavedId(char.id);
    setSaving(false);
    setExpanded(null);
  };

  const handleBuyCharacter = async (char: CharacterDef) => {
    if (!user) return;
    setBuying(char.id);
    setMessage("");

    const response = await buyCharacterInShop(user.uid, char.id);
    setBuying(null);
    setConfirmPurchase(null);
    setMessage(response.message);

    setTimeout(() => setMessage(""), 3000);
  };

  const filtered =
    filter === "all"
      ? CHARACTERS
      : CHARACTERS.filter((c) => c.characterClass === filter);

  const classTabs = CLASS_FILTERS.filter((c) => c.value !== "all") as Array<{
    value: CharacterClass;
    label: string;
    iconClass?: CharacterClass;
  }>;

  const handleBuyClassMastery = async (charClass: CharacterClass) => {
    if (!user) return;
    setUpgradingClass(charClass);
    setMessage("");

    const response = await buyClassMasteryLevel(user.uid, charClass);

    setUpgradingClass(null);
    setMessage(response.message);
    setTimeout(() => setMessage(""), 3000);
  };

  const getCharacterState = (char: CharacterDef) => {
    const unlockStatus = resolveCharacterUnlockStatus(
      char.id,
      progression.level,
      allAchievementsCompleted,
    );
    const isOwned = unlockedSet.has(char.id);
    const canBuy =
      !isOwned && unlockStatus.purchasable && unlockStatus.unlockedByRule;
    const isLocked = !isOwned && !canBuy;

    return {
      isOwned,
      canBuy,
      isLocked,
      unlockLevel: getUnlockLevelForCharacter(char.id),
      lockReason: unlockStatus.reason,
    };
  };

  const filteredWithState = filtered.map((char) => {
    const state = getCharacterState(char);
    return {
      char,
      ...state,
    };
  });

  const expandedState = expanded ? getCharacterState(expanded) : null;

  // Partition owned and purchasable characters for UI sections
  const ownedChars = filteredWithState
    .filter((f) => f.isOwned)
    .map((f) => f.char);

  const purchasableOrdered = filteredWithState
    .filter((f) => !f.isOwned)
    .sort((a, b) => (a.canBuy === b.canBuy ? 0 : a.canBuy ? -1 : 1));

  return (
    <div className="w-full px-3 pt-4 pb-8">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-western text-3xl text-gold text-glow-gold tracking-widest">
          PISTOLEIROS
        </h1>
        <p className="font-stats text-[10px] text-sand/50 uppercase tracking-[0.2em] mt-1">
          {CHARACTERS.length} personagens · coleção e maestria
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-sand/30 bg-gradient-to-r from-black/50 to-black/30 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-stats text-[11px] uppercase tracking-wider text-sand/70 font-bold">
            💰 Moedas
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <picture>
                <source srcSet="/assets/ui/gold_coin.webp" type="image/webp" />
                <img
                  src="/assets/ui/png/gold_coin.png"
                  alt="gold"
                  className="w-5 h-5"
                />
              </picture>
              <span className="font-western text-sm text-gold font-bold">
                {currencies.gold.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <picture>
                <source srcSet="/assets/ui/ruby_coin.webp" type="image/webp" />
                <img
                  src="/assets/ui/png/ruby_coin.png"
                  alt="ruby"
                  className="w-5 h-5"
                />
              </picture>
              <span className="font-western text-sm text-red-400 font-bold">
                {currencies.ruby.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-sand/20 bg-black/20 p-1.5">
        <button
          onClick={() => setTab("characters")}
          className={`rounded-lg py-2 font-stats text-[11px] uppercase tracking-wider border transition-all ${
            tab === "characters"
              ? "bg-gold/20 border-gold/50 text-gold"
              : "bg-black/30 border-transparent text-sand/60"
          }`}
        >
          Personagens
        </button>
        <button
          onClick={() => setTab("classes")}
          className={`rounded-lg py-2 font-stats text-[11px] uppercase tracking-wider border transition-all ${
            tab === "classes"
              ? "bg-gold/20 border-gold/50 text-gold"
              : "bg-black/30 border-transparent text-sand/60"
          }`}
        >
          Classes
        </button>
      </div>

      {tab === "characters" ? (
        <>
          {/* Class filter pills */}
          <div className="mb-5 -mx-3 px-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              {CLASS_FILTERS.map(({ value, label, iconClass }) => {
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
                    {iconClass ? (
                      <ClassIcon
                        charClass={iconClass}
                        size="w-4 h-4 rounded-sm"
                      />
                    ) : (
                      <span className="font-stats text-[9px] opacity-70">
                        #
                      </span>
                    )}
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

          {/* Owned characters top */}
          {ownedChars.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-gold/60 to-gold/20" />
                <p className="font-western text-sm text-gold tracking-wider font-bold">
                  👑 POSSUÍDOS
                </p>
                <div className="h-[2px] flex-1 bg-gradient-to-l from-gold/60 to-gold/20" />
              </div>
              <motion.div
                layout
                className="grid grid-cols-2 gap-4 md:grid-cols-3"
              >
                <AnimatePresence mode="popLayout">
                  {ownedChars.map((char) => (
                    <CharacterCard
                      key={char.id}
                      char={char}
                      isActive={savedId === char.id}
                      isLocked={false}
                      canBuy={false}
                      lockLabel={""}
                      unlockLevel={null}
                      onClick={() => setExpanded(char)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {/* Purchasable / blocked */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-sand/40 to-sand/10" />
              <p className="font-western text-sm text-sand/70 tracking-wider font-bold">
                🏷️ DISPONÍVEL
              </p>
              <div className="h-[2px] flex-1 bg-gradient-to-l from-sand/40 to-sand/10" />
            </div>
            <motion.div
              layout
              className="grid grid-cols-2 gap-4 md:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {purchasableOrdered.map(
                  ({ char, isLocked, unlockLevel, canBuy, lockReason }) => (
                    <CharacterCard
                      key={char.id}
                      char={char}
                      isActive={savedId === char.id}
                      isLocked={isLocked}
                      canBuy={canBuy}
                      lockLabel={lockReason}
                      unlockLevel={unlockLevel}
                      onClick={() => setExpanded(char)}
                    />
                  ),
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {classTabs.map(({ value }) => (
            <ClassMasteryCard
              key={value}
              charClass={value}
              mastery={classMastery[value]}
              playerGold={currencies.gold}
              upgradeCost={getClassMasteryUpgradeCost(
                classMastery[value].level + 1,
              )}
              upgrading={upgradingClass === value}
              onUpgrade={() => handleBuyClassMastery(value)}
            />
          ))}
        </div>
      )}

      {/* Detail modal — portal-rendered */}
      <AnimatePresence>
        {expanded && (
          <CharacterModal
            char={expanded}
            saving={saving}
            isActive={savedId === expanded.id}
            isOwned={expandedState?.isOwned ?? false}
            canBuy={expandedState?.canBuy ?? false}
            lockReason={expandedState?.lockReason ?? "Bloqueado"}
            classMastery={classMastery}
            onSelect={() => handleSelect(expanded)}
            onBuy={() => setConfirmPurchase(expanded)}
            onClose={() => setExpanded(null)}
          />
        )}
      </AnimatePresence>

      {/* Purchase confirmation modal */}
      <AnimatePresence>
        {confirmPurchase && (
          <ConfirmPurchaseModal
            char={confirmPurchase}
            loading={buying === confirmPurchase.id}
            onConfirm={() => handleBuyCharacter(confirmPurchase)}
            onCancel={() => setConfirmPurchase(null)}
          />
        )}
      </AnimatePresence>

      {/* Purchase feedback message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-gold/40 bg-black/80 px-4 py-2 text-center font-stats text-[11px] text-gold shadow-lg"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 rounded-2xl border border-sand/30 bg-gradient-to-r from-black/50 to-black/30 backdrop-blur-sm p-4">
        <p className="font-stats text-[11px] uppercase tracking-widest text-sand/60 font-bold mb-2">
          {tab === "characters"
            ? "📊 Progressão de Desbloqueio"
            : "🎓 Progresso de Maestria"}
        </p>
        <p className="font-stats text-sm text-sand/80 font-medium">
          {tab === "characters" ? (
            <>
              Nível:{" "}
              <span className="text-gold font-bold">
                Nv {progression.level}
              </span>
              {" · "}
              Possessão:{" "}
              <span className="text-gold font-bold">
                {unlockedSet.size}/{CHARACTERS.length}
              </span>
            </>
          ) : (
            <>
              Classes Nv 5:{" "}
              <span className="text-gold font-bold">
                {Object.values(classMastery).filter((m) => m.level >= 5).length}
                /6
              </span>
              {" · "}
              Pontos:{" "}
              <span className="text-gold font-bold">
                {Object.values(classMastery).reduce(
                  (sum, m) => sum + m.points,
                  0,
                )}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
