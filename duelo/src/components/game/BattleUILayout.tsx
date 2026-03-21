import { useEffect, useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { BattleHeader } from "./BattleHeader";
import { BattleArena } from "./BattleArena";
import { CardHandEnhanced } from "./CardHandEnhanced";
import { QuickChat } from "./QuickChat";
import { GameOver } from "./GameOver";
import { GamePauseMenu } from "./GamePauseMenu";
import { AnimatePresence, motion } from "framer-motion";
import { useFirebaseRoom } from "../../hooks/useFirebase";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../../lib/firebase";

interface BattleUILayoutProps {
  isOnline: boolean;
  roomStatus?: string;
  onPause: () => void;
  onQuit: () => void;
  showPauseMenu: boolean;
  setShowPauseMenu: (value: boolean) => void;
}

export function BattleUILayout({
  isOnline,
  roomStatus,
  onPause,
  onQuit,
  showPauseMenu,
  setShowPauseMenu,
}: BattleUILayoutProps) {
  const {
    player,
    opponent,
    turn,
    phase,
    lastResult,
    bestOf3,
    playerStars,
    opponentStars,
    currentRound,
    hideOpponentAmmo,
    roomId,
    isHost,
  } = useGameStore();
  const { submitEmoji } = useFirebaseRoom();

  const [lastResultMessage, setLastResultMessage] = useState<string>("");
  const [resultSubline, setResultSubline] = useState<string>("");
  const [playerEmoji, setPlayerEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timeout to avoid multiple timeouts stacking
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }

    if ((phase === "animating" || phase === "resolving") && lastResult) {
      let message = "";
      let subline = "";

      if (
        lastResult.playerCard === "dodge" &&
        lastResult.opponentCard === "shot"
      ) {
        message = "DESVIOU! ✨";
        subline = "Boa leitura de jogada";
      } else if (
        lastResult.opponentCard === "dodge" &&
        lastResult.playerCard === "shot"
      ) {
        message = "Bloqueado! 🛡️";
        subline = "Oponente neutralizou seu ataque";
      } else if (
        lastResult.playerLifeLost > 0 &&
        lastResult.opponentLifeLost > 0
      ) {
        message = "CHOQUE! ⚡";
        subline = "Ambos sofreram dano";
      } else if (lastResult.opponentLifeLost > 0) {
        message = "ACERTO! 💥";
        subline = `Inimigo -${lastResult.opponentLifeLost} HP`;
      } else if (lastResult.playerLifeLost > 0) {
        message = "LEVOU DANO! 🔥";
        subline = `Voce -${lastResult.playerLifeLost} HP`;
      } else {
        message = "EMPATE! 🤝";
        subline = "Sem dano neste turno";
      }

      setLastResultMessage(message);
      setResultSubline(subline);

      resultTimeoutRef.current = setTimeout(() => {
        setLastResultMessage("");
        setResultSubline("");
        resultTimeoutRef.current = null;
      }, 3000);
    }

    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
      }
    };
  }, [phase, lastResult]);

  // Additional safety: clear result messages when leaving animating/resolving phase
  useEffect(() => {
    if (phase !== "animating" && phase !== "resolving") {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
      }
      setLastResultMessage("");
      setResultSubline("");
    }
  }, [phase]);

  useEffect(() => {
    if (!isOnline || !roomId) {
      setPlayerEmoji(null);
      setOpponentEmoji(null);
      return;
    }

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const unsub = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const roomData = snapshot.val() as {
        hostEmojiEvent?: { emoji: string; sentAt: number; nonce: string };
        guestEmojiEvent?: { emoji: string; sentAt: number; nonce: string };
      };

      const now = Date.now();
      const myRole = isHost
        ? roomData.hostEmojiEvent
        : roomData.guestEmojiEvent;
      const enemyRole = isHost
        ? roomData.guestEmojiEvent
        : roomData.hostEmojiEvent;

      setPlayerEmoji(
        myRole && now - myRole.sentAt <= 3000 ? myRole.emoji : null,
      );
      setOpponentEmoji(
        enemyRole && now - enemyRole.sentAt <= 3000 ? enemyRole.emoji : null,
      );
    });

    return () => {
      unsub();
    };
  }, [isOnline, roomId, isHost]);

  const handleSendEmoji = async (emoji: string) => {
    if (!isOnline || !roomId) return false;
    return submitEmoji(roomId, emoji);
  };

  return (
    <div className="relative w-full h-[100svh] overflow-hidden flex flex-col">
      <BattleHeader
        player={player}
        opponent={opponent}
        turn={turn}
        bestOf3={bestOf3}
        playerStars={playerStars}
        opponentStars={opponentStars}
        currentRound={currentRound}
        hideOpponentAmmo={hideOpponentAmmo}
      />

      <BattleArena
        player={player}
        opponent={opponent}
        phase={phase}
        turnResult={lastResult}
        playerEmoji={playerEmoji}
        opponentEmoji={opponentEmoji}
      />

      {!(isOnline && roomStatus === "waiting") && (
        <CardHandEnhanced onPause={onPause} />
      )}

      {isOnline && roomStatus !== "waiting" && (
        <QuickChat onSendMessage={handleSendEmoji} />
      )}

      <AnimatePresence>
        {lastResultMessage && (
          <motion.div
            key={lastResultMessage}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="absolute left-1/2 -translate-x-1/2 top-[145px] md:top-[155px] z-[35] pointer-events-none"
          >
            <div className="min-w-[220px] md:min-w-[280px] px-4 py-3 rounded-xl border border-gold/45 bg-gradient-to-b from-[#2b1906]/95 to-[#1b1106]/95 shadow-[0_10px_25px_rgba(0,0,0,0.45)] backdrop-blur-sm text-center">
              <div className="font-western text-lg md:text-2xl text-gold tracking-wide leading-tight">
                {lastResultMessage}
              </div>
              <div className="font-stats text-[11px] md:text-xs text-sand/75 mt-1 uppercase tracking-widest">
                {resultSubline}
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-black/45 overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-gold to-yellow-300"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "game_over" && <GameOver />}

      <GamePauseMenu
        isOpen={showPauseMenu}
        onClose={() => setShowPauseMenu(false)}
        onQuit={onQuit}
      />
    </div>
  );
}
