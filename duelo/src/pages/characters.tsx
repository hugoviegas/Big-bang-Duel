import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useUserPreferences } from "../hooks/useUserPreferences";
import {
  CHARACTERS,
  RARITY_STYLES,
  RARITY_LABELS,
  type CharacterDef,
} from "../lib/characters";

/** Rarity border glow for the detail panel */
const RARITY_GLOW: Record<CharacterDef["rarity"], string> = {
  common: "",
  rare: "shadow-[0_0_40px_rgba(56,189,248,0.20)]",
  legendary: "shadow-[0_0_60px_rgba(234,179,8,0.25)]",
};

/** Reusable detail panel component - Professional layout with large image */
function DetailPanel({
  char,
  saving,
  isSaved,
  onSelect,
  isMobile = false,
  onClose,
}: {
  char: CharacterDef;
  saving: boolean;
  isSaved: boolean;
  onSelect: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}) {
  return (
    <motion.div
      key={char.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`card-wood rounded-2xl overflow-hidden flex flex-col ${isMobile ? "h-[90vh] max-h-[800px] w-[95vw] max-w-[450px] mx-auto my-auto shadow-2xl" : "h-auto max-h-[95vh] w-full max-w-md shadow-2xl"} ${RARITY_GLOW[char.rarity]}`}
    >
      {/* ═══ CHARACTER PORTRAIT (Responsive Height) ═══ */}
      <div
        className={`relative w-full overflow-hidden flex-shrink-0 ${
          isMobile ? "h-[55vh] max-h-[550px]" : "h-[350px] md:h-[400px]"
        } bg-black/40`}
      >
        <img
          src={char.image}
          alt={char.name}
          className="w-full h-full object-contain object-top transition-all duration-700 hover:scale-105"
        />

        {/* Dynamic Name Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

        <div className="absolute inset-x-0 bottom-0 text-center pb-3 md:pb-4 px-4">
          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-western text-2xl md:text-4xl text-gold text-glow-gold leading-none drop-shadow-2xl"
          >
            {char.name}
          </motion.h2>
          <motion.p
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 0.8 }}
            className="font-stats text-[9px] md:text-xs text-sand/90 uppercase tracking-[0.15em] mt-0.5 drop-shadow-md"
          >
            {char.title}
          </motion.p>
        </div>
      </div>

      {/* ═══ INFORMATION & ACTIONS (Fixed Height, Scrollable Content) ═══ */}
      <div
        className={`flex flex-col gap-3 overflow-hidden ${
          isMobile
            ? "p-4 flex-1 bg-black/20"
            : "p-4 md:p-5 h-[calc(95vh-400px)] md:h-[calc(95vh-450px)] max-h-96 bg-black/10"
        }`}
      >
        {/* Rarity Badge */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div
            className={`px-3 py-1 rounded-full border ${RARITY_STYLES[char.rarity]} bg-black/60 shadow-inner`}
          >
            <span className="text-[9px] md:text-[10px] font-stats uppercase tracking-widest font-bold">
              {RARITY_LABELS[char.rarity]}
            </span>
          </div>
          <div className="h-px flex-1 mx-3 bg-gradient-to-r from-transparent via-sand/20 to-transparent" />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {/* Description Box */}
          <div className="bg-black/50 border border-sand/30 rounded-lg p-3 md:p-4 relative overflow-hidden transition-all hover:border-gold/30 flex-shrink-0">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" />
            <p className="font-stats text-xs md:text-sm text-sand-light leading-relaxed relative z-10 text-center">
              "{char.description}"
            </p>
          </div>

          {/* Story Fragment (Desktop Only) */}
          {!isMobile && char.story && (
            <div className="mt-3 text-center flex-shrink-0">
              <p className="font-western text-[8px] text-gold/40 uppercase tracking-wider mb-1">
                Lenda
              </p>
              <p className="font-stats text-[11px] text-sand/50 leading-relaxed italic">
                {char.story}
              </p>
            </div>
          )}
        </div>

        {/* ═══ ACTION BUTTONS (Always Visible at Bottom) ═══ */}
        <div className="flex gap-2 flex-shrink-0 pt-2 border-t border-sand/10">
          {isMobile && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-sand/30 text-sand/60 hover:text-sand font-western text-xs tracking-wider transition-all hover:bg-white/5 active:scale-95"
            >
              VOLTAR
            </button>
          )}

          {isSaved ? (
            <div
              className={`${isMobile ? "flex-1" : "w-full"} flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gold/40 bg-gradient-to-b from-gold/20 to-gold/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]`}
            >
              <svg
                className="w-4 h-4 text-gold animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span className="font-western text-gold text-xs md:text-sm tracking-[0.15em]">
                ATIVO
              </span>
            </div>
          ) : (
            <button
              onClick={onSelect}
              disabled={saving}
              className={`${isMobile ? "flex-1" : "w-full"} py-2.5 rounded-lg bg-btn-western border border-gold/40 text-gold font-western text-xs md:text-sm tracking-[0.15em] shadow-lg shadow-black/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50`}
            >
              {saving ? (
                <div className="w-3 h-3 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              ) : (
                "SELECIONAR"
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CharactersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { loadPreferences, saveCharacter } = useUserPreferences();

  const currentCharId = user?.avatar ?? "marshal";
  const [expanded, setExpanded] = useState<CharacterDef | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string>(currentCharId);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Sync saved ID with store
  useEffect(() => {
    setSavedId(user?.avatar ?? "marshal");
  }, [user?.avatar]);

  const handleSelect = async (char: CharacterDef) => {
    setSaving(true);
    await saveCharacter(char.id);
    setSavedId(char.id);
    setSaving(false);
    // Auto-close modal on mobile after selection
    setExpanded(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60 pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center gap-4 px-4 pt-5 pb-3 md:px-8">
        <button
          onClick={() => navigate("/menu")}
          className="flex items-center gap-2 text-sand/60 hover:text-sand font-western text-sm tracking-widest transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          VOLTAR
        </button>
        <div className="flex-1" />
        <h1 className="font-western text-2xl md:text-3xl text-gold text-glow-gold tracking-widest">
          PISTOLEIROS
        </h1>
        <div className="flex-1" />
        <div className="w-16" />
      </header>

      {/* ── Body — Desktop: two-column, Mobile: single column ── */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-4 px-3 pb-6 md:px-6 md:gap-6 overflow-hidden">
        {/* ── Gallery grid ── */}
        <div className="flex-1 md:w-[55%] lg:w-[60%] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-4">
            {CHARACTERS.map((char) => {
              const isSelected = savedId === char.id;
              return (
                <motion.button
                  key={char.id}
                  layout
                  onClick={() => setExpanded(char)}
                  whileTap={{ scale: 0.94 }}
                  className={`
                    relative flex flex-col items-center rounded-xl border-2 transition-all duration-200 overflow-hidden
                    ${isSelected ? "border-gold bg-gold/10 shadow-lg shadow-gold/20" : "border-sand/20 bg-black/40 hover:border-sand/50 hover:bg-black/60"}
                  `}
                >
                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 z-10 bg-gold rounded-full w-3 h-3 shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
                  )}

                  {/* Rarity badge */}
                  <div
                    className={`absolute bottom-1 left-1 z-10 text-[7px] font-stats uppercase px-1 py-0.5 rounded border ${RARITY_STYLES[char.rarity]} bg-black/70`}
                  >
                    {RARITY_LABELS[char.rarity]}
                  </div>

                  {/* Character image */}
                  <div className="w-full aspect-[3/4] overflow-hidden">
                    <img
                      src={char.image}
                      alt={char.name}
                      loading="lazy"
                      className="w-full h-full object-contain object-center transition-transform duration-300 hover:scale-105"
                    />
                  </div>

                  {/* Name */}
                  <div className="w-full px-1 pb-2 pt-1 text-center">
                    <span className="font-western text-[9px] md:text-[10px] text-sand-light leading-tight line-clamp-1">
                      {char.name}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT — Desktop detail panel (hidden on mobile) ── */}
        <div className="hidden md:flex md:w-[45%] lg:w-[40%] md:sticky md:top-0 md:self-start md:flex-col md:max-h-screen">
          <AnimatePresence mode="wait">
            {expanded ? (
              <DetailPanel
                char={expanded}
                saving={saving}
                isSaved={savedId === expanded.id}
                onSelect={() => handleSelect(expanded)}
                isMobile={false}
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-wood rounded-2xl p-8 text-center opacity-40"
              >
                <p className="font-western text-sand text-sm">
                  Selecione um pistoleiro para ver os detalhes
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MOBILE MODAL — fullscreen overlay on mobile ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 md:hidden flex flex-col p-3 pt-safe"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <DetailPanel
                char={expanded}
                saving={saving}
                isSaved={savedId === expanded.id}
                onSelect={() => handleSelect(expanded)}
                isMobile={true}
                onClose={() => setExpanded(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
