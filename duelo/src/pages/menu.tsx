import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { SettingsModal } from "../components/common/SettingsModal";
import { GamePrep } from "../components/game/GamePrep";
import { getCharacter, getAvatarCrop } from "../lib/characters";
import type { GameMode, BotDifficulty } from "../types";

type MenuStep = "main" | "solo_setup";

// Storage keys
const STORAGE_KEY_MODE = "gameprep-selected-mode";
const STORAGE_KEY_DIFFICULTY = "gameprep-selected-difficulty";

// Helper functions for loading from localStorage
function loadSavedGameMode(): GameMode {
  const stored = localStorage.getItem(STORAGE_KEY_MODE);
  return (stored as GameMode) || "normal";
}

function loadSavedBotDifficulty(): BotDifficulty {
  const stored = localStorage.getItem(STORAGE_KEY_DIFFICULTY);
  return (stored as BotDifficulty) || "medium";
}

export default function MenuPage() {
  const [step, setStep] = useState<MenuStep>("main");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const { loadPreferences } = useUserPreferences();

  // The selected character for solo play mirrors user.avatar (persisted preference)
  const selectedCharacter = user?.avatar ?? "marshal";
  const activeChar = getCharacter(selectedCharacter);

  // Load saved game preferences from localStorage
  const savedMode = loadSavedGameMode();
  const savedDifficulty = loadSavedBotDifficulty();

  // Load cross-device preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleStartSolo = (
    character: string,
    mode: GameMode,
    difficulty: BotDifficulty,
  ) => {
    initializeGame(mode, false, false, undefined, difficulty, character);
    navigate("/game");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

      {/* Tumbleweed */}
      <div className="animate-tumbleweed absolute bottom-16 w-10 h-10 rounded-full border-2 border-brown-mid/40 opacity-30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* ===== MAIN MENU ===== */}
        {step === "main" && (
          <div className="flex flex-col items-center">
            {/* Logo */}
            <img
              src="/assets/ui/logo_bbd.webp"
              alt="Big Bang Duel"
              className="w-56 md:w-64 h-auto mb-8 animate-drop-bounce animate-logo-float drop-shadow-2xl"
            />

            {/* Player info */}
            {user && (
              <button
                onClick={() => navigate("/characters")}
                className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full mb-6 flex items-center gap-3 border border-gold/30 hover:border-gold/60 transition-all animate-fade-up group"
              >
                {/* Face-cropped avatar */}
                <div className="w-9 h-9 rounded-full border-2 border-gold/60 overflow-hidden flex-shrink-0">
                  <img
                    src={activeChar.image}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ objectPosition: getAvatarCrop(selectedCharacter) }}
                  />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-western text-gold text-sm tracking-wider leading-none">
                    {user.displayName}
                  </span>
                  <span className="font-stats text-[9px] text-sand/50 uppercase tracking-widest mt-0.5">
                    {activeChar.name}
                  </span>
                </div>
                <svg
                  className="w-3 h-3 text-sand/40 group-hover:text-gold transition-colors ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}

            {/* Menu Buttons */}
            <div className="w-full space-y-3">
              <button
                onClick={() => setStep("solo_setup")}
                className="btn-western animate-fade-up animate-fade-up-delay-1"
              >
                JOGAR SOLO
              </button>
              <button
                onClick={() => navigate("/online")}
                className="btn-western animate-fade-up animate-fade-up-delay-2"
              >
                JOGAR ONLINE
              </button>
              <button
                onClick={() => navigate("/leaderboard")}
                className="btn-western animate-fade-up animate-fade-up-delay-3"
              >
                RANKING
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="btn-western btn-sky animate-fade-up animate-fade-up-delay-4"
              >
                CONFIGURAÇÕES
              </button>
              <button
                onClick={handleLogout}
                className="btn-western btn-danger animate-fade-up animate-fade-up-delay-5"
              >
                SAIR
              </button>
            </div>
          </div>
        )}

        {/* ===== SOLO SETUP — NEW ACCORDION LAYOUT ===== */}
        {step === "solo_setup" && (
          <div className="animate-fade-up">
            <h2 className="font-western text-3xl text-gold text-center mb-6 text-glow-gold">
              PREPARE SEU DUELO
            </h2>
            <GamePrep
              onStart={handleStartSolo}
              selectedCharacter={selectedCharacter}
              selectedMode={savedMode}
              selectedDifficulty={savedDifficulty}
            />
            <button
              onClick={() => setStep("main")}
              className="w-full mt-6 py-3 px-4 rounded-xl btn-western bg-black/40 border-2 border-sand/30 hover:border-sand/60 hover:bg-black/60 text-sand-light font-western text-sm tracking-widest transition-all"
            >
              VOLTAR
            </button>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
