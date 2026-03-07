import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Gamepad2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { GamePrep } from "../components/game/GamePrep";
import type { GameMode, BotDifficulty } from "../types";

type MenuStep = "main" | "solo_setup";

// Storage keys
const STORAGE_KEY_MODE = "gameprep-selected-mode";
const STORAGE_KEY_DIFFICULTY = "gameprep-selected-difficulty";

function loadSavedGameMode(): GameMode {
  const stored = localStorage.getItem(STORAGE_KEY_MODE);
  return (stored as GameMode) || "normal";
}

function loadSavedBotDifficulty(): BotDifficulty {
  const stored = localStorage.getItem(STORAGE_KEY_DIFFICULTY);
  return (stored as BotDifficulty) || "medium";
}

/** Ripple effect on button press */
function useRipple() {
  return useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position:absolute; border-radius:50%;
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top - size / 2}px;
      background:rgba(255,255,255,0.18);
      transform:scale(0); animation:rippleAnim 0.5s ease-out forwards;
      pointer-events:none; z-index:20;
    `;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }, []);
}

export default function MenuPage() {
  const [step, setStep] = useState<MenuStep>("main");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const { loadPreferences } = useUserPreferences();
  const ripple = useRipple();

  const selectedCharacter = user?.avatar ?? "marshal";
  const savedMode = loadSavedGameMode();
  const savedDifficulty = loadSavedBotDifficulty();

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleStartSolo = (
    character: string,
    mode: GameMode,
    difficulty: BotDifficulty,
  ) => {
    initializeGame(mode, false, false, undefined, difficulty, character);
    navigate("/game");
  };

  return (
    <>
      {step === "main" && (
        <div className="hero">
          {/* ── Online Button ── */}
          <button
            className="play-btn btn-online"
            onClick={(e) => {
              ripple(e);
              navigate("/online");
            }}
          >
            <div className="btn-texture" />
            <div className="btn-icon-wrap">
              <div className="pulse-ring" />
              <Users size={48} color="rgba(255,200,180,0.9)" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col relative z-[1]">
              <span className="btn-label">Jogar Online</span>
              <span className="btn-sub">2 Jogadores &bull; Ranked</span>
            </div>
            <div className="btn-arrow">
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7"
                fill="none"
                stroke="rgba(255,200,180,0.5)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 5l8 7-8 7" />
              </svg>
            </div>
          </button>

          {/* ── Solo Button ── */}
          <button
            className="play-btn btn-solo"
            onClick={(e) => {
              ripple(e);
              setStep("solo_setup");
            }}
          >
            <div className="btn-texture" />
            <div className="btn-icon-wrap">
              <Gamepad2 size={48} color="rgba(200,168,75,0.9)" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col relative z-[1]">
              <span className="btn-label">Jogar Solo</span>
              <span className="btn-sub">1 Jogador &bull; vs IA</span>
            </div>
            <div className="btn-arrow">
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7"
                fill="none"
                stroke="rgba(200,168,75,0.5)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 5l8 7-8 7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* ===== SOLO SETUP ===== */}
      {step === "solo_setup" && (
        <div
          className="flex-1 overflow-y-auto p-4"
          style={{ background: "#1a0a04" }}
        >
          <h2 className="font-western text-2xl text-gold-l text-center mb-4 text-glow-gold">
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
            className="w-full mt-4 py-3 px-4 rounded-xl bg-black/40 border-2 border-sand/30 hover:border-sand/60 hover:bg-black/60 text-sand-light font-western text-sm tracking-widest transition-all"
          >
            VOLTAR
          </button>
        </div>
      )}
    </>
  );
}
