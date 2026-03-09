import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { CardItem } from "./CardItem";
import {
  CARDS_BY_MODE,
  getAvailableCards,
  MAX_DOUBLE_SHOT_USES,
} from "../../lib/gameEngine";
import type { CardType } from "../../types";

const CARD_DETAILS: Record<
  CardType,
  { label: string; description: string; cost: number }
> = {
  shot: {
    label: "Tiro",
    description: "Dispara 1 bala no oponente. Causa 1 de dano.",
    cost: 1,
  },
  double_shot: {
    label: "Tiro Duplo",
    description:
      "Dispara 2 balas. Causa 2 de dano. Desvio não o bloqueia totalmente (1 de dano passa). Máx 3 usos por round.",
    cost: 2,
  },
  dodge: {
    label: "Desvio",
    description:
      "Desvia de tiros. AVISO: Tiro Duplo ainda causa 1 de dano mesmo ao desviar. Máx 3 esquivas consecutivas.",
    cost: 0,
  },
  reload: {
    label: "Recarga",
    description: "Recarrega +1 bala. Vulnerável a tiros.",
    cost: 0,
  },
  counter: {
    label: "Contra-golpe",
    description:
      "Desvia e contra-ataca. Gasta 1 bala. Só funciona contra tiros.",
    cost: 1,
  },
};

import { useFirebaseRoom } from "../../hooks/useFirebase";

export function CardHand() {
  const {
    mode,
    player,
    phase,
    turn,
    attackTimer,
    selectCard,
    resolveTurn,
    isOnline,
    roomId,
  } = useGameStore();
  const { submitChoice } = useFirebaseRoom();

  // ── timer state ──────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<number>(attackTimer);
  const autoFiredRef = useRef(false); // prevent double-fire

  // Reset + start timer whenever we enter a new selection phase/turn
  useEffect(() => {
    if (phase !== "selecting" || attackTimer <= 0) {
      setTimeLeft(attackTimer);
      autoFiredRef.current = false;
      return;
    }

    setTimeLeft(attackTimer);
    autoFiredRef.current = false;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "selecting", turn, attackTimer]);

  // When time hits 0 → auto-select if needed, then resolve
  useEffect(() => {
    if (timeLeft !== 0 || phase !== "selecting" || autoFiredRef.current) return;
    autoFiredRef.current = true;

    const store = useGameStore.getState();
    const available = getAvailableCards(
      store.mode,
      store.player.ammo,
      store.player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
      store.player.dodgeStreak ?? 0,
    );
    const chosen =
      store.player.selectedCard ??
      available[Math.floor(Math.random() * available.length)];

    if (!store.player.selectedCard) {
      store.selectCard(chosen);
    }

    // Auto-confirm: aguarda um pouco para o bot escolher sua carta em modo solo
    setTimeout(() => {
      const finalState = useGameStore.getState();
      if (
        finalState.phase === "selecting" &&
        finalState.player.selectedCard &&
        finalState.opponent.selectedCard
      ) {
        if (finalState.isOnline && finalState.roomId) {
          submitChoice(finalState.roomId, finalState.player.selectedCard);
        } else {
          // modo solo: resolve o turno
          finalState.resolveTurn();
        }
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ── handlers ─────────────────────────────────────────────────────────────────
  const handleSelect = (cardId: string) => {
    if (phase !== "selecting") return;
    selectCard(cardId as CardType);
  };

  const handleConfirm = () => {
    if (!player.selectedCard || phase !== "selecting") return;
    if (!isOnline) {
      // Modo solo: aguarda o bot escolher (se ainda estiver pensando)
      const store = useGameStore.getState();
      if (store.opponent.selectedCard) {
        // Bot já escolheu, pode resolver
        resolveTurn();
      } else {
        // Bot ainda está pensando, aguarda
        const maxWaitTime = 3000; // máximo 3 segundos
        let waited = 0;
        const checkInterval = setInterval(() => {
          const currentState = useGameStore.getState();
          if (currentState.opponent.selectedCard || waited >= maxWaitTime) {
            clearInterval(checkInterval);
            if (currentState.opponent.selectedCard) {
              currentState.resolveTurn();
            }
          }
          waited += 100;
        }, 100);
      }
    } else if (roomId) {
      submitChoice(roomId, player.selectedCard);
    }
  };

  const availableCards = getAvailableCards(
    mode,
    player.ammo,
    player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
    player.dodgeStreak ?? 0,
  );
  const allCards = CARDS_BY_MODE[mode];

  if (phase === "game_over" || phase === "round_over") return null;

  // ── timer visual helpers ──────────────────────────────────────────────────────
  const isTimerActive = phase === "selecting" && attackTimer > 0;
  const timerUrgent = timeLeft <= 3 && timeLeft > 0;
  const timerFraction = attackTimer > 0 ? timeLeft / attackTimer : 1;
  const timerColor =
    timerFraction > 0.5
      ? "#4ade80"
      : timerFraction > 0.25
        ? "#facc15"
        : "#ef4444";
  const circumference = 2 * Math.PI * 14; // r=14
  const dashOffset = circumference * (1 - timerFraction);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div
        className="bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-3 sm:pb-4 px-2 sm:px-3 pointer-events-auto"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-5xl mx-auto">
          {/* ── phase / timer indicator row (compact) ── */}
          {(phase !== "selecting" || isTimerActive) && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {phase !== "selecting" && (
                <span className="font-western text-xs sm:text-sm text-gold/80 tracking-widest animate-pulse">
                  {phase === "revealing"
                    ? "REVELANDO..."
                    : phase === "resolving"
                      ? "RESOLVENDO..."
                      : "AGUARDE..."}
                </span>
              )}

              {isTimerActive && (
                <div
                  className={`flex items-center gap-1.5 ${timerUrgent ? "animate-pulse" : ""}`}
                >
                  {/* Circular countdown (menor) */}
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    className="drop-shadow-lg"
                  >
                    {/* background ring */}
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="black"
                      fillOpacity="0.6"
                      stroke="#ffffff10"
                      strokeWidth="1.5"
                    />
                    {/* progress ring */}
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke={timerColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 14 14)"
                      style={{
                        transition:
                          "stroke-dashoffset 0.9s linear, stroke 0.3s",
                      }}
                    />
                    <text
                      x="14"
                      y="17"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={timerColor}
                      fontFamily="monospace"
                    >
                      {timeLeft}
                    </text>
                  </svg>
                  {timerUrgent && (
                    <span
                      className="font-western text-[10px] tracking-widest"
                      style={{ color: timerColor }}
                    >
                      RÁPIDO!
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── cards + confirm button layout (responsivo) ── */}
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            {/* ── cards row (ajustado para mobile) ── */}
            <div className="flex justify-center items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 overflow-visible w-full sm:flex-1">
              {allCards.map((cId) => {
                const details = CARD_DETAILS[cId];
                return (
                  <CardItem
                    key={cId}
                    id={cId}
                    label={details.label}
                    description={details.description}
                    ammoCost={details.cost}
                    isSelected={player.selectedCard === cId}
                    isSelectable={
                      phase === "selecting" && availableCards.includes(cId)
                    }
                    usesLeft={
                      cId === "double_shot"
                        ? (player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES)
                        : undefined
                    }
                    dodgeStreakCount={
                      cId === "dodge" ? (player.dodgeStreak ?? 0) : undefined
                    }
                    onClick={() => handleSelect(cId)}
                  />
                );
              })}
            </div>

            {/* ── confirm button CIRCULAR (à direita em desktop, abaixo em mobile) ── */}
            {phase === "selecting" && player.selectedCard && (
              <button
                onClick={handleConfirm}
                className="
                  shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18
                  bg-gradient-to-br from-green-500 via-green-600 to-green-700 
                  text-white font-bold rounded-full
                  border-3 border-gold/60 
                  shadow-[0_4px_16px_rgba(34,197,94,0.6),0_0_24px_rgba(34,197,94,0.4)]
                  hover:scale-110 active:scale-95 
                  transition-all duration-200
                  animate-pulse-glow
                  flex items-center justify-center
                "
                aria-label="Confirmar jogada"
              >
                {/* Ícone de check */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-7 h-7 sm:w-8 sm:h-8"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
