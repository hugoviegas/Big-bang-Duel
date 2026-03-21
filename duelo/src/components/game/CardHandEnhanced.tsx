import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onValue, ref } from "firebase/database";
import { useGameStore } from "../../store/gameStore";
import { CardItem } from "./CardItem";
import {
  CARDS_BY_MODE,
  getAvailableCards,
  MAX_DOUBLE_SHOT_USES,
} from "../../lib/gameEngine";
import { useFirebaseRoom } from "../../hooks/useFirebase";
import { rtdb } from "../../lib/firebase";
import type { CardType } from "../../types";
import {
  UI_PREFS_UPDATED_EVENT,
  getUIPreferences,
  setHideInfoTexts,
  setUseConfirmButton,
} from "./uiPreferences";

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
      "Dispara 2 balas. Causa 2 de dano. Desvio nao bloqueia totalmente (1 de dano passa).",
    cost: 2,
  },
  dodge: {
    label: "Desvio",
    description:
      "Desvia de tiros. Contra Tiro Duplo voce ainda recebe 1 de dano.",
    cost: 0,
  },
  reload: {
    label: "Recarga",
    description: "Recarrega +1 bala. Vulneravel durante a acao.",
    cost: 0,
  },
  counter: {
    label: "Contra-golpe",
    description: "Desvia e contra-ataca. Gasta 1 bala e funciona contra tiros.",
    cost: 1,
  },
};

interface CardHandEnhancedProps {
  onPause: () => void;
}

const CARD_IMAGES: Record<CardType, string> = {
  shot: "/assets/cards/card_shoot.webp",
  double_shot: "/assets/cards/card_double_shoot.webp",
  dodge: "/assets/cards/card_dodge.webp",
  reload: "/assets/cards/card_reload.webp",
  counter: "/assets/cards/card_counter.webp",
};

export function CardHandEnhanced({ onPause }: CardHandEnhancedProps) {
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

  const [timeLeft, setTimeLeft] = useState<number>(attackTimer);
  const [draggedCardId, setDraggedCardId] = useState<CardType | null>(null);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const [prefs, setPrefs] = useState(getUIPreferences);
  const [onlineTurnStartedAt, setOnlineTurnStartedAt] = useState<number | null>(
    null,
  );
  const [onlineNow, setOnlineNow] = useState<number>(Date.now());

  const autoFiredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const touchDragStateRef = useRef<{
    cardId: CardType | null;
    startX: number;
    startY: number;
    dragging: boolean;
  }>({
    cardId: null,
    startX: 0,
    startY: 0,
    dragging: false,
  });
  const lastTapRef = useRef<{ cardId: CardType; at: number } | null>(null);

  useEffect(() => {
    const syncPrefs = () => setPrefs(getUIPreferences());
    window.addEventListener(UI_PREFS_UPDATED_EVENT, syncPrefs);
    return () => window.removeEventListener(UI_PREFS_UPDATED_EVENT, syncPrefs);
  }, []);

  // Register touch listeners with passive: false to allow preventDefault
  useEffect(() => {
    const handleTouchMoveNonPassive = (e: TouchEvent) => {
      const state = touchDragStateRef.current;
      if (!state.cardId || !state.dragging) return;
      try {
        e.preventDefault();
      } catch (err) {
        // Ignore passive event listener errors
      }
    };

    const handleTouchEndNonPassive = (e: TouchEvent) => {
      const state = touchDragStateRef.current;
      if (!state.dragging) return;
      try {
        e.preventDefault();
      } catch (err) {
        // Ignore passive event listener errors
      }
    };

    document.addEventListener("touchmove", handleTouchMoveNonPassive, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEndNonPassive, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchmove", handleTouchMoveNonPassive);
      document.removeEventListener("touchend", handleTouchEndNonPassive);
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !roomId) {
      setOnlineTurnStartedAt(null);
      return;
    }

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const room = snapshot.val() as { turnStartedAt?: number | null };
      setOnlineTurnStartedAt(
        typeof room.turnStartedAt === "number" ? room.turnStartedAt : null,
      );
    });

    return () => unsubscribe();
  }, [isOnline, roomId]);

  useEffect(() => {
    if (!isOnline || phase !== "selecting") return;
    const id = setInterval(() => setOnlineNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [isOnline, phase]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (phase !== "selecting" || attackTimer <= 0) {
      requestAnimationFrame(() => setTimeLeft(attackTimer));
      autoFiredRef.current = false;
      return;
    }

    requestAnimationFrame(() => setTimeLeft(attackTimer));
    autoFiredRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, turn, attackTimer]);

  const syncedOnlineTimeLeft =
    isOnline &&
    phase === "selecting" &&
    attackTimer > 0 &&
    onlineTurnStartedAt !== null
      ? Math.max(
          0,
          Math.ceil(attackTimer - (onlineNow - onlineTurnStartedAt) / 1000),
        )
      : null;

  const effectiveTimeLeft = syncedOnlineTimeLeft ?? timeLeft;

  useEffect(() => {
    if (
      effectiveTimeLeft !== 0 ||
      phase !== "selecting" ||
      autoFiredRef.current
    ) {
      return;
    }

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
      available[Math.floor(Math.random() * Math.max(available.length, 1))] ??
      "reload";

    if (!store.player.selectedCard) {
      store.selectCard(chosen);
    }

    setTimeout(() => {
      const finalState = useGameStore.getState();
      if (finalState.phase !== "selecting") return;
      if (!finalState.player.selectedCard) return;

      if (finalState.isOnline && finalState.roomId) {
        submitChoice(finalState.roomId, finalState.player.selectedCard);
      } else {
        if (!finalState.opponent.selectedCard) return;
        finalState.resolveTurn();
      }
    }, 260);
  }, [effectiveTimeLeft, phase, submitChoice]);

  const tryResolve = (delayMs = 100) => {
    setTimeout(() => {
      const store = useGameStore.getState();
      if (store.phase !== "selecting") return;
      if (!store.player.selectedCard) return;

      if (store.isOnline && store.roomId) {
        submitChoice(store.roomId, store.player.selectedCard);
      } else {
        if (!store.opponent.selectedCard) return;
        store.resolveTurn();
      }
    }, delayMs);
  };

  const handleSelect = (cardId: CardType) => {
    if (phase !== "selecting") return;
    selectCard(cardId);
  };

  const handleDoubleClick = (cardId: CardType) => {
    if (phase !== "selecting") return;
    selectCard(cardId);
    tryResolve(60);
  };

  const handleDragStart = (e: React.DragEvent, cardId: CardType) => {
    if (phase !== "selecting") return;
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cardId);

    // Use a custom drag preview so the selected card is never visually clipped.
    const preview = document.createElement("img");
    preview.src = CARD_IMAGES[cardId];
    preview.style.width = "100px";
    preview.style.height = "140px";
    preview.style.pointerEvents = "none";
    preview.style.position = "fixed";
    preview.style.top = "-9999px";
    preview.style.left = "-9999px";
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 50, 70);
    setTimeout(() => preview.remove(), 0);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setIsDropZoneActive(false);
  };

  const handleDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData("text/plain");
    const cardId = raw as CardType;

    if (!CARD_DETAILS[cardId]) {
      setDraggedCardId(null);
      setIsDropZoneActive(false);
      return;
    }

    setDraggedCardId(null);
    setIsDropZoneActive(false);

    if (phase !== "selecting") return;
    selectCard(cardId);
    tryResolve(150);
  };

  const handleTouchStart = (e: React.TouchEvent, cardId: CardType) => {
    if (phase !== "selecting") return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchDragStateRef.current = {
      cardId,
      startX: touch.clientX,
      startY: touch.clientY,
      dragging: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const state = touchDragStateRef.current;
    if (!state.cardId || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const dist = Math.hypot(dx, dy);

    if (!state.dragging && dist > 14) {
      state.dragging = true;
      setDraggedCardId(state.cardId);
    }

    if (!state.dragging) return;

    const zone = dropZoneRef.current?.getBoundingClientRect();
    const inside =
      !!zone &&
      touch.clientX >= zone.left &&
      touch.clientX <= zone.right &&
      touch.clientY >= zone.top &&
      touch.clientY <= zone.bottom;

    setIsDropZoneActive(inside);
  };

  const handleTouchEnd = (cardId: CardType) => {
    const state = touchDragStateRef.current;

    if (state.dragging) {
      if (isDropZoneActive && phase === "selecting") {
        selectCard(cardId);
        tryResolve(120);
      }
      setDraggedCardId(null);
      setIsDropZoneActive(false);
      touchDragStateRef.current = {
        cardId: null,
        startX: 0,
        startY: 0,
        dragging: false,
      };
      return;
    }

    const now = Date.now();
    const prev = lastTapRef.current;
    if (prev && prev.cardId === cardId && now - prev.at < 320) {
      handleDoubleClick(cardId);
      lastTapRef.current = null;
    } else {
      handleSelect(cardId);
      lastTapRef.current = { cardId, at: now };
    }

    touchDragStateRef.current = {
      cardId: null,
      startX: 0,
      startY: 0,
      dragging: false,
    };
  };

  const allCards = CARDS_BY_MODE[mode];
  const availableCards = getAvailableCards(
    mode,
    player.ammo,
    player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
    player.dodgeStreak ?? 0,
  );

  const confirmButtonEnabled =
    prefs.useConfirmButton &&
    phase === "selecting" &&
    player.selectedCard !== null;

  const timerRatio =
    attackTimer > 0
      ? Math.max(0, Math.min(effectiveTimeLeft / attackTimer, 1))
      : 1;
  const timerPercent = Math.round(timerRatio * 100);
  const timerClass =
    timerRatio <= 0.3
      ? "bg-gradient-to-r from-red-700 to-red-500"
      : timerRatio <= 0.6
        ? "bg-gradient-to-r from-orange-600 to-yellow-500"
        : "bg-gradient-to-r from-emerald-600 to-green-500";
  const timerTextClass =
    timerRatio <= 0.3
      ? "text-red-400"
      : timerRatio <= 0.6
        ? "text-yellow-400"
        : "text-emerald-400";

  const handleConfirm = () => {
    if (!prefs.useConfirmButton) return;
    if (!player.selectedCard || phase !== "selecting") return;

    if (!isOnline) {
      const store = useGameStore.getState();
      if (store.opponent.selectedCard) {
        resolveTurn();
        return;
      }

      const maxWaitTime = 2500;
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
      return;
    }

    if (roomId) {
      submitChoice(roomId, player.selectedCard);
    }
  };

  const shouldShowInfoPanel = !prefs.hideInfoTexts && !!player.selectedCard;
  const selectedCard = player.selectedCard;

  const toggleInfoAndConfirm = () => {
    const showingInfos = !prefs.hideInfoTexts;
    const nextHideInfos = showingInfos;
    const nextUseConfirm = !nextHideInfos;
    setHideInfoTexts(nextHideInfos);
    setUseConfirmButton(nextUseConfirm);
    setPrefs((prev) => ({
      ...prev,
      hideInfoTexts: nextHideInfos,
      useConfirmButton: nextUseConfirm,
    }));
  };

  return (
    <>
      <div
        ref={dropZoneRef}
        onDragOver={(e) => {
          if (!draggedCardId) return;
          e.preventDefault();
          setIsDropZoneActive(true);
        }}
        onDrop={handleDropZoneDrop}
        onDragLeave={() => setIsDropZoneActive(false)}
        className={`fixed top-[68px] md:top-[78px] left-0 right-0 bottom-[148px] md:bottom-[172px] z-[35] ${draggedCardId ? "pointer-events-auto" : "pointer-events-none"}`}
      />

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent pt-5 md:pt-6 pb-4 md:pb-5 px-3 md:px-4 overflow-visible">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex-1 max-w-xs">
              <div className="relative h-2 bg-black/60 rounded-full overflow-hidden border border-gold/20">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: `${timerPercent}%` }}
                  transition={{ duration: 0.2 }}
                  className={`h-full transition-all ${timerClass}`}
                />
              </div>
            </div>
            <div className="text-center min-w-[52px]">
              <span
                className={`text-xl md:text-2xl font-western drop-shadow-lg ${timerTextClass}`}
              >
                {effectiveTimeLeft}
              </span>
            </div>
          </div>

          <div
            className={`mb-3 rounded-xl border-2 border-dashed px-3 py-2 text-center transition-all ${
              draggedCardId || isDropZoneActive
                ? "border-gold/70 bg-gold/10"
                : "border-transparent bg-transparent"
            }`}
          >
            <span className="font-stats text-gold/90 text-xs md:text-sm uppercase tracking-widest">
              {draggedCardId || isDropZoneActive
                ? "Solte a carta aqui para confirmar"
                : ""}
            </span>
          </div>

          <AnimatePresence>
            {shouldShowInfoPanel && selectedCard && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-2 flex flex-col md:flex-row items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/35 backdrop-blur-md"
              >
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-western text-gold mb-0.5 text-sm md:text-base">
                    {CARD_DETAILS[selectedCard].label}
                  </h3>
                  <p className="font-stats text-sand/75 text-[11px] md:text-sm">
                    {CARD_DETAILS[selectedCard].description}
                  </p>
                </div>

                {prefs.useConfirmButton && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleConfirm}
                    disabled={!confirmButtonEnabled}
                    className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg font-western text-sm md:text-base uppercase tracking-wider transition-all whitespace-nowrap ${
                      confirmButtonEnabled
                        ? "bg-gold text-black hover:bg-yellow-300"
                        : "bg-sand/20 text-sand/50 cursor-not-allowed"
                    }`}
                  >
                    Confirmar
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!prefs.hideInfoTexts && (
            <div className="text-center mb-2">
              <p className="font-stats text-sand/45 text-[10px] md:text-xs uppercase tracking-wider">
                Dicas: clique, duplo clique para jogar, ou arraste e solte
              </p>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1 md:gap-2 place-items-center overflow-visible pb-1 pt-2">
            {allCards.map((cId) => {
              const details = CARD_DETAILS[cId];
              const isAvailable = availableCards.includes(cId);
              const isSelected = player.selectedCard === cId;

              return (
                <div
                  key={cId}
                  onDragStart={(e) => handleDragStart(e, cId)}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={() => handleDoubleClick(cId)}
                  onTouchStart={(e) => handleTouchStart(e, cId)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(cId)}
                  draggable={isAvailable && phase === "selecting"}
                  className="cursor-grab active:cursor-grabbing touch-none"
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardItem
                      id={cId}
                      label={details.label}
                      description={details.description}
                      ammoCost={details.cost}
                      isSelected={isSelected}
                      isSelectable={isAvailable && phase === "selecting"}
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
                  </motion.div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              onClick={onPause}
              className="px-3 py-1 rounded-md border border-gold/35 bg-black/40 text-gold/90 font-stats text-[10px] md:text-xs uppercase tracking-widest"
            >
              Pausar
            </button>

            <button
              onClick={toggleInfoAndConfirm}
              className="px-3 py-1 rounded-md border border-gold/35 bg-black/40 text-gold/90 font-stats text-[10px] md:text-xs uppercase tracking-widest"
            >
              {prefs.hideInfoTexts ? "Mostrar infos" : "Ocultar infos"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
