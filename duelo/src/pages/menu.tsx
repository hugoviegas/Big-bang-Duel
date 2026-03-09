import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Gamepad2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { ref, onValue, off } from "firebase/database";
import { rtdb } from "../lib/firebase";
import { useFirebaseRoom } from "../hooks/useFirebase";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { GamePrep } from "../components/game/GamePrep";
import type { GameMode, BotDifficulty, Room } from "../types";
import { normalizeUnlocks } from "../lib/progression";

type MenuStep = "main" | "solo_setup";
type QuickMatchStatus = "searching" | "error" | null;

// Storage keys
const STORAGE_KEY_MODE = "gameprep-selected-mode";
const STORAGE_KEY_DIFFICULTY = "gameprep-selected-difficulty";

const SEARCHING_MESSAGES = [
  "Varrendo o salao por duelos abertos...",
  "Procurando adversario no modo avancado...",
  "Preparando a arena para um confronto rapido...",
];

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
  const [quickMatchStatus, setQuickMatchStatus] =
    useState<QuickMatchStatus>(null);
  const [quickError, setQuickError] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const { loadPreferences } = useUserPreferences();
  const ripple = useRipple();

  const unlocks = normalizeUnlocks(user?.unlocks);
  const unlockedCharacters = unlocks.charactersUnlocked;
  const selectedCharacter = unlockedCharacters.includes(user?.avatar ?? "")
    ? (user?.avatar ?? "marshal")
    : (unlockedCharacters[0] ?? "marshal");
  const savedMode = loadSavedGameMode();
  const savedDifficulty = loadSavedBotDifficulty();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Animate searching messages
  useEffect(() => {
    if (quickMatchStatus !== "searching") return;
    const cycle = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SEARCHING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(cycle);
  }, [quickMatchStatus]);

  const { quickMatch } = useFirebaseRoom();
  const quickListenerRef = useRef<(() => void) | null>(null);

  const handleCancelQuickMatch = async () => {
    // Cleanup listener
    if (quickListenerRef.current) {
      quickListenerRef.current();
      quickListenerRef.current = null;
    }

    setQuickMatchStatus(null);
    setQuickError("");
    setMessageIndex(0);
  };

  const handleQuickMatchClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    ripple(e);

    // Show popup
    setQuickMatchStatus("searching");
    setQuickError("");
    setMessageIndex(0);

    try {
      const result = await quickMatch(selectedCharacter);
      if (!result) {
        setQuickMatchStatus("error");
        setQuickError("Não foi possível iniciar a busca de partida.");
        return;
      }

      // joined existing room: launch immediately
      if (!result.isHost) {
        setQuickMatchStatus(null);
        initializeGame(
          result.mode,
          true,
          false,
          result.roomId,
          undefined,
          selectedCharacter,
          result.config,
          user?.displayName,
        );
        navigate(`/game/${result.roomId}`);
        return;
      }

      // host: listen for guest joining
      const roomRef = ref(rtdb, `rooms/${result.roomId}`);
      let unsub = false;
      const unsubscribe = onValue(roomRef, (snap) => {
        if (unsub) return;
        if (!snap.exists()) return;
        const room = snap.val() as Room;
        if (room.guestId && room.status === "in_progress") {
          unsub = true;
          off(roomRef, "value", unsubscribe);
          quickListenerRef.current = null;
          setQuickMatchStatus(null);
          initializeGame(
            result.mode,
            true,
            true,
            result.roomId,
            undefined,
            selectedCharacter,
            result.config,
            user?.displayName,
          );
          navigate(`/game/${result.roomId}`);
        }
      });

      quickListenerRef.current = () => {
        unsub = true;
        off(roomRef, "value", unsubscribe);
      };
    } catch (err) {
      console.error("[menu quickMatch]", err);
      setQuickMatchStatus("error");
      setQuickError("Falha ao buscar partida rápida. Tente novamente.");
    }
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
    <>
      {step === "main" && (
        <div className="hero">
          {/* ── Online Button ── */}
          <button
            className="play-btn btn-online"
            onClick={(e) => {
              handleQuickMatchClick(e);
            }}
          >
            <div className="btn-texture" />
            <div className="btn-icon-wrap">
              <div className="pulse-ring" />
              <Users
                size={48}
                color="rgba(255,200,180,0.9)"
                strokeWidth={1.5}
              />
            </div>
            <div className="flex flex-col relative z-[1]">
              <span className="btn-label">Jogar Rápido</span>
              <span className="btn-sub">Busca automática &bull; Online</span>
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
              <Gamepad2
                size={48}
                color="rgba(200,168,75,0.9)"
                strokeWidth={1.5}
              />
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
            availableCharacterIds={unlockedCharacters}
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

      {/* ===== QUICK MATCH POPUP ===== */}
      {quickMatchStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-wood w-full max-w-md p-6 md:p-8 flex flex-col items-center justify-center text-center animate-fade-up">
            {quickMatchStatus === "searching" && (
              <>
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
                  <div className="absolute inset-0 m-auto w-14 h-14 rounded-full border-2 border-sky-500/30 border-l-sky-400 animate-spin [animation-duration:1.2s]" />
                </div>
                <h2 className="font-western text-2xl md:text-3xl text-gold mb-2 text-glow-gold">
                  BUSCANDO PARTIDA
                </h2>
                <p className="font-stats text-sand/70 uppercase tracking-widest text-xs md:text-sm min-h-[2.5rem]">
                  {SEARCHING_MESSAGES[messageIndex]}
                </p>
                <button
                  onClick={handleCancelQuickMatch}
                  className="btn-western btn-red mt-6"
                >
                  CANCELAR
                </button>
              </>
            )}

            {quickMatchStatus === "error" && (
              <>
                <h2 className="font-western text-2xl md:text-3xl text-red-400 mb-4">
                  FALHA NA BUSCA
                </h2>
                <p className="font-stats text-sand/70 uppercase tracking-widest text-xs md:text-sm max-w-xs mb-6">
                  {quickError}
                </p>
                <div className="w-full space-y-3">
                  <button
                    onClick={handleQuickMatchClick}
                    className="btn-western w-full"
                  >
                    TENTAR DE NOVO
                  </button>
                  <button
                    onClick={handleCancelQuickMatch}
                    className="btn-western btn-sky w-full"
                  >
                    VOLTAR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
