import { useEffect, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { BattleHeader } from "./BattleHeader";
import { BattleArena } from "./BattleArena";
import { CardHandEnhanced } from "./CardHandEnhanced";
import { QuickChat } from "./QuickChat";
import { GameOver } from "./GameOver";
import { GamePauseMenu } from "./GamePauseMenu";
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

  const [playerEmoji, setPlayerEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);

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

      {/* Result message box removed - now only showing in central modal via BattleArena */}

      {phase === "game_over" && <GameOver />}

      <GamePauseMenu
        isOpen={showPauseMenu}
        onClose={() => setShowPauseMenu(false)}
        onQuit={onQuit}
      />
    </div>
  );
}
