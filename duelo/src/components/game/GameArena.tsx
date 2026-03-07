import { useEffect, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { Character } from "./Character";
import { CardHand } from "./CardHand";
import { TurnResultOverlay } from "./TurnResult";
import { GameOver } from "./GameOver";
import { GamePauseMenu } from "./GamePauseMenu";
import { useNavigate, useParams } from "react-router-dom";
import { useMatchSync } from "../../hooks/useFirebase";
import { WoodenBattleHeader } from "./WoodenBattleHeader";

export function GameArena() {
  const {
    player,
    opponent,
    phase,
    lastResult,
    isOnline,
    roomStatus,
    bestOf3,
    playerStars,
    opponentStars,
    currentRound,
    roundWinnerId,
  } = useGameStore();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();

  const [copied, setCopied] = useState(false);
  const [showJoinMessage, setShowJoinMessage] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // Track previous room status to detect entry
  useEffect(() => {
    if (roomStatus === "in_progress" && opponent.displayName !== "El Diablo") {
      // Just joined
      setShowJoinMessage(true);
      const t = setTimeout(() => setShowJoinMessage(false), 3000);
      return () => clearTimeout(t);
    }
  }, [roomStatus, opponent.displayName]);

  // Sync with Firebase if online
  useMatchSync(roomId || null);

  const copyRoomCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareRoomLink = async () => {
    if (roomId) {
      const shareUrl = `${window.location.origin}/#/game/${roomId}`;
      const shareData = {
        title: "Big Bang Duel",
        text: `Venha me enfrentar no Big Bang Duel! Sala: ${roomId}`,
        url: shareUrl,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          console.log("Share failed:", err);
        }
      } else {
        // Fallback to copy link
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        alert("Link da sala copiado!");
      }
    }
  };

  // Sync and expose joinRoom
  const { joinRoom } = useMatchSync(roomId || null);

  useEffect(() => {
    const checkAndJoin = async () => {
      const state = useGameStore.getState();

      // If we have a roomId but the game isn't initialized or we're not the host
      if (roomId && state.phase === "idle") {
        // Try to join as guest or verify if we are already in
        const success = await joinRoom(roomId);
        if (success) {
          state.initializeGame("normal", true, false, roomId);
        }
      }
    };

    checkAndJoin();
  }, [roomId, joinRoom]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isOnline) return;
      if (phase === "game_over" || phase === "round_over") return;
      setShowPauseMenu(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOnline, phase]);

  const isShaking =
    phase === "animating" &&
    lastResult &&
    (lastResult.playerLifeLost > 0 || lastResult.opponentLifeLost > 0);

  return (
    <div
      className={`relative w-full min-h-[100svh] bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center overflow-hidden ${isShaking ? "screen-shake" : ""}`}
    >
      {/* Atmosphere overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

      {/* Dust particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="dust-particle absolute rounded-full bg-sand/40 pointer-events-none z-0"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${10 + Math.random() * 80}%`,
            bottom: `${Math.random() * 20}%`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      {/* Main Layout */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col min-h-[100svh]">
        <WoodenBattleHeader
          player={player}
          opponent={opponent}
          bestOf3={bestOf3}
          playerStars={playerStars}
          opponentStars={opponentStars}
          currentRound={currentRound}
          onPause={() => {
            if (!isOnline) {
              setShowPauseMenu(true);
            } else {
              useGameStore.getState().quitGame();
              navigate("/menu");
            }
          }}
        />

        {/* ===== ARENA — CHARACTERS ===== */}
        <div className="flex-1 flex items-end justify-between px-8 md:px-16 pb-75 sm:pb-56 md:pb-60 relative mt-2">
          <Character player={player} />
          <Character player={opponent} isRight />
        </div>
      </div>

      {/* ===== CARD HAND (Fixed Bottom) ===== */}
      {!(isOnline && roomStatus === "waiting") && <CardHand />}

      {/* ===== OVERLAYS ===== */}
      {showJoinMessage && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 animate-fade-up bg-black/80 backdrop-blur-sm border-2 border-gold px-8 py-3 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] pointer-events-none">
          <span className="font-western text-gold text-xl md:text-2xl text-glow-gold">
            {opponent.displayName.toUpperCase()} ENTROU NA SALA!
          </span>
        </div>
      )}

      {(phase === "resolving" || phase === "animating") && lastResult && (
        <TurnResultOverlay result={lastResult} />
      )}
      {phase === "game_over" && <GameOver />}

      {/* ROUND OVER interstitial (best-of-3) */}
      {phase === "round_over" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none">
          <div className="flex flex-col items-center gap-4 animate-fade-up">
            {roundWinnerId === player.id ? (
              <>
                <span className="font-western text-5xl text-green-400 text-glow-gold">
                  ROUND VENCIDO!
                </span>
                <span className="font-stats text-sand/70 uppercase tracking-widest text-sm">
                  Próximo round em breve...
                </span>
              </>
            ) : roundWinnerId === opponent.id ? (
              <>
                <span className="font-western text-5xl text-red-400">
                  ROUND PERDIDO!
                </span>
                <span className="font-stats text-sand/70 uppercase tracking-widest text-sm">
                  Próximo round em breve...
                </span>
              </>
            ) : (
              <>
                <span className="font-western text-5xl text-gold">EMPATE!</span>
                <span className="font-stats text-sand/70 uppercase tracking-widest text-sm">
                  Próximo round em breve...
                </span>
              </>
            )}
            {/* Stars recap */}
            <div className="flex items-center gap-6 mt-2">
              <div className="flex flex-col items-center gap-1">
                <span className="font-stats text-[10px] text-sand/50 uppercase">
                  {player.displayName}
                </span>
                <div className="flex gap-1">
                  {[0, 1].map((i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      className={`w-6 h-6 ${i < playerStars ? "text-gold" : "text-sand/20"}`}
                    >
                      <path
                        fill="currentColor"
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      />
                    </svg>
                  ))}
                </div>
              </div>
              <span className="font-western text-gold/50 text-xl">VS</span>
              <div className="flex flex-col items-center gap-1">
                <span className="font-stats text-[10px] text-sand/50 uppercase">
                  {opponent.displayName}
                </span>
                <div className="flex gap-1">
                  {[0, 1].map((i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      className={`w-6 h-6 ${i < opponentStars ? "text-red-400" : "text-sand/20"}`}
                    >
                      <path
                        fill="currentColor"
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WAITING OVERLAY */}
      {isOnline && roomStatus === "waiting" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 text-center">
          <div className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-8" />
          <h2 className="font-western text-2xl md:text-5xl text-gold mb-4 text-glow-gold">
            AGUARDANDO FORASTEIRO
          </h2>
          <p className="font-stats text-sand/70 mb-6 text-sm md:text-lg">
            Envie o código da sala para seu adversário:
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 bg-black/60 px-6 py-4 md:px-8 md:py-6 rounded-2xl border-2 border-gold/40 shadow-[0_0_30px_rgba(212,175,55,0.15)] mb-8">
            <span className="font-western text-3xl md:text-5xl text-sand tracking-[0.3em]">
              {roomId}
            </span>
            <div className="flex gap-2">
              <button
                onClick={copyRoomCode}
                title="Copiar Código"
                className={`p-3 md:p-4 rounded-xl ${copied ? "bg-green-600/30 text-green-400 border border-green-500/50" : "bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20"} transition-all`}
              >
                <svg
                  className="w-6 h-6 md:w-8 md:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
              </button>
              <button
                onClick={shareRoomLink}
                title="Compartilhar Link"
                className="p-3 md:p-4 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600/30 transition-all"
              >
                <svg
                  className="w-6 h-6 md:w-8 md:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              useGameStore.getState().quitGame();
              navigate("/online");
            }}
            className="font-western text-sm md:text-base text-red-west hover:text-red-400 transition-colors uppercase tracking-widest border border-red-west/30 px-6 py-2 rounded-lg hover:bg-red-west/10"
          >
            DESISTIR E VOLTAR
          </button>
        </div>
      )}

      {/* Pause Menu (Solo mode only) */}
      <GamePauseMenu
        isOpen={showPauseMenu}
        onClose={() => setShowPauseMenu(false)}
        onQuit={() => {
          useGameStore.getState().quitGame();
          navigate("/menu");
        }}
      />
    </div>
  );
}
