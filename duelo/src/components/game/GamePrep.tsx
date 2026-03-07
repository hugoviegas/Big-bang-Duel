import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, getCharacter } from "../../lib/characters";
import type { GameMode, BotDifficulty } from "../../types";

interface GamePrepProps {
  onStart: (
    character: string,
    mode: GameMode,
    difficulty: BotDifficulty,
  ) => void;
  selectedCharacter: string;
  availableCharacterIds?: string[];
  selectedMode: GameMode;
  selectedDifficulty: BotDifficulty;
}

const MODES = [
  {
    id: "beginner" as GameMode,
    name: "INICIANTE",
    desc: "3 vidas, 3 cartas",
  },
  {
    id: "normal" as GameMode,
    name: "NORMAL",
    desc: "4 vidas, 4 cartas (Tiro Duplo)",
  },
  {
    id: "advanced" as GameMode,
    name: "AVANÇADO",
    desc: "4 vidas, 5 cartas (Contra-golpe)",
  },
];

const DIFFICULTIES = [
  {
    id: "easy" as BotDifficulty,
    name: "FÁCIL",
    desc: "IA treinada para errar — aprenda o jogo · 30s por jogada",
  },
  {
    id: "medium" as BotDifficulty,
    name: "MÉDIO",
    desc: "IA com estratégia equilibrada — desafio justo · 10s por jogada",
  },
  {
    id: "hard" as BotDifficulty,
    name: "DIFÍCIL",
    desc: "IA otimizada por Q-Learning — lê seus padrões · 5s por jogada",
  },
];

type AccordionSection = "character" | "mode" | "difficulty" | null;

// Storage keys
const STORAGE_KEY_MODE = "gameprep-selected-mode";
const STORAGE_KEY_DIFFICULTY = "gameprep-selected-difficulty";

// Helper functions for localStorage
function saveGameMode(mode: GameMode) {
  localStorage.setItem(STORAGE_KEY_MODE, mode);
}

function saveBotDifficulty(difficulty: BotDifficulty) {
  localStorage.setItem(STORAGE_KEY_DIFFICULTY, difficulty);
}

export function GamePrep({
  onStart,
  selectedCharacter: initialChar,
  availableCharacterIds,
  selectedMode: initialMode,
  selectedDifficulty: initialDiff,
}: GamePrepProps) {
  const availableSet = new Set(availableCharacterIds ?? CHARACTERS.map((c) => c.id));
  const availableCharacters = CHARACTERS.filter((c) => availableSet.has(c.id));
  const initialResolved = availableSet.has(initialChar)
    ? initialChar
    : (availableCharacters[0]?.id ?? "marshal");

  const [expanded, setExpanded] = useState<AccordionSection>("character");
  const [selectedCharacter, setSelectedCharacter] = useState(initialResolved);
  const [selectedMode, setSelectedMode] = useState(initialMode);
  const [selectedDifficulty, setSelectedDifficulty] = useState(initialDiff);

  const activeChar = getCharacter(
    availableSet.has(selectedCharacter)
      ? selectedCharacter
      : (availableCharacters[0]?.id ?? "marshal"),
  );

  // Save to localStorage whenever mode or difficulty changes
  useEffect(() => {
    saveGameMode(selectedMode);
  }, [selectedMode]);

  useEffect(() => {
    saveBotDifficulty(selectedDifficulty);
  }, [selectedDifficulty]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Character Selection */}
      <div className="card-wood rounded-xl overflow-hidden border border-gold/20">
        <button
          onClick={() =>
            setExpanded(expanded === "character" ? null : "character")
          }
          className="w-full flex items-center justify-between p-4 hover:bg-gold/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border-2 border-gold/40 overflow-hidden">
              <img
                src={activeChar.profileImage}
                alt={activeChar.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left">
              <h3 className="font-western text-gold tracking-wider">
                PERSONAGEM
              </h3>
              <p className="font-stats text-sand/70 text-sm">
                {activeChar.name}
              </p>
            </div>
          </div>
          <motion.svg
            className="w-5 h-5 text-gold"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: expanded === "character" ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </motion.svg>
        </button>

        <AnimatePresence>
          {expanded === "character" && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gold/10"
            >
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableCharacters.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacter(char.id)}
                      className={`relative flex flex-col items-center rounded-lg border-2 transition-all overflow-hidden p-2 ${
                        selectedCharacter === char.id
                          ? "border-gold bg-gold/10"
                          : "border-sand/20 bg-black/20 hover:border-sand/50"
                      }`}
                    >
                      <div className="w-full aspect-[3/4] overflow-hidden rounded-md mb-1">
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-contain object-center"
                        />
                      </div>
                      <span className="font-western text-[10px] text-sand-light text-center line-clamp-1">
                        {char.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Game Mode Selection */}
      <div className="card-wood rounded-xl overflow-hidden border border-gold/20">
        <button
          onClick={() => setExpanded(expanded === "mode" ? null : "mode")}
          className="w-full flex items-center justify-between p-4 hover:bg-gold/5 transition-colors"
        >
          <div className="text-left">
            <h3 className="font-western text-gold tracking-wider">
              MODO DE JOGO
            </h3>
            <p className="font-stats text-sand/70 text-sm">
              {MODES.find((m) => m.id === selectedMode)?.name}
            </p>
          </div>
          <motion.svg
            className="w-5 h-5 text-gold"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: expanded === "mode" ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </motion.svg>
        </button>

        <AnimatePresence>
          {expanded === "mode" && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gold/10"
            >
              <div className="p-4 space-y-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedMode === mode.id
                        ? "border-gold bg-gold/10"
                        : "border-sand/20 bg-black/20 hover:border-sand/50 hover:bg-black/40"
                    }`}
                  >
                    <div className="font-western text-gold text-sm tracking-wider">
                      {mode.name}
                    </div>
                    <div className="font-stats text-sand/70 text-xs mt-1">
                      {mode.desc}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Difficulty Selection */}
      <div className="card-wood rounded-xl overflow-hidden border border-gold/20">
        <button
          onClick={() =>
            setExpanded(expanded === "difficulty" ? null : "difficulty")
          }
          className="w-full flex items-center justify-between p-4 hover:bg-gold/5 transition-colors"
        >
          <div className="text-left">
            <h3 className="font-western text-gold tracking-wider">
              DIFICULDADE
            </h3>
            <p className="font-stats text-sand/70 text-sm">
              {DIFFICULTIES.find((d) => d.id === selectedDifficulty)?.name}
            </p>
          </div>
          <motion.svg
            className="w-5 h-5 text-gold"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: expanded === "difficulty" ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </motion.svg>
        </button>

        <AnimatePresence>
          {expanded === "difficulty" && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gold/10"
            >
              <div className="p-4 space-y-2">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => setSelectedDifficulty(diff.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedDifficulty === diff.id
                        ? "border-gold bg-gold/10"
                        : "border-sand/20 bg-black/20 hover:border-sand/50 hover:bg-black/40"
                    }`}
                  >
                    <div className="font-western text-gold text-sm tracking-wider">
                      {diff.name}
                    </div>
                    <div className="font-stats text-sand/70 text-xs mt-1">
                      {diff.desc}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Start Button */}
      <button
        onClick={() =>
          onStart(activeChar.id, selectedMode, selectedDifficulty)
        }
        className="w-full py-4 rounded-xl btn-western text-lg mt-6 bg-gradient-to-r from-gold/20 to-gold/10 hover:from-gold/30 hover:to-gold/20 border border-gold/40 text-gold font-western tracking-widest"
      >
        INICIAR DUELO
      </button>
    </div>
  );
}
