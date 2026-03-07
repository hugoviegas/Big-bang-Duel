import { getCharacter } from "../../lib/characters";
import type { PlayerState } from "../../types";

interface WoodenBattleHeaderProps {
  player: PlayerState;
  opponent: PlayerState;
  bestOf3: boolean;
  playerStars: number;
  opponentStars: number;
  currentRound: number;
  onPause: () => void;
}

function Star({ active, danger = false }: { active: boolean; danger?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`battle-top-star${active ? " is-active" : ""}${danger ? " is-danger" : ""}`}
    >
      <path
        fill="currentColor"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    </svg>
  );
}

function PlayerPanel({ player, isRight = false }: { player: PlayerState; isRight?: boolean }) {
  const charDef = getCharacter(player.avatar);
  const cropPos = `center ${charDef.avatarCropY}`;

  return (
    <div className={`battle-player-panel${isRight ? " is-right" : ""}`}>
      <div className="battle-player-avatar">
        <img
          src={charDef.image}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: cropPos }}
        />
      </div>
      <div className="battle-player-info">
        <span className="battle-player-name">{player.displayName}</span>
        <div className={`battle-player-hearts${isRight ? " is-right" : ""}`}>
          {Array.from({ length: player.maxLife }).map((_, i) => (
            <svg
              key={`life-${i}`}
              viewBox="0 0 24 24"
              className={`battle-heart${i < player.life ? " is-active" : ""}`}
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={i < player.life ? "#EF4444" : "#374151"}
                stroke={i < player.life ? "#B91C1C" : "#1F2937"}
                strokeWidth="1"
              />
            </svg>
          ))}
        </div>
        <div className={`battle-player-bullets${isRight ? " is-right" : ""}`}>
          {Array.from({ length: player.maxAmmo }).map((_, i) => (
            <svg
              key={`ammo-${i}`}
              viewBox="0 0 10 24"
              className={`battle-bullet${i < player.ammo ? " is-active" : ""}`}
            >
              <rect x="1" y="10" width="8" height="14" rx="1"
                fill={i < player.ammo ? "#B45309" : "#374151"}
                stroke={i < player.ammo ? "#78350F" : "#1F2937"}
                strokeWidth="0.5"
              />
              <ellipse cx="5" cy="10" rx="4" ry="3"
                fill={i < player.ammo ? "#FBBF24" : "#4B5563"}
                stroke={i < player.ammo ? "#D97706" : "#374151"}
                strokeWidth="0.5"
              />
              <ellipse cx="5" cy="8" rx="3" ry="4"
                fill={i < player.ammo ? "#FDE68A" : "#6B7280"}
              />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WoodenBattleHeader({
  player,
  opponent,
  bestOf3,
  playerStars,
  opponentStars,
  currentRound,
  onPause,
}: WoodenBattleHeaderProps) {
  return (
    <section className="battle-top-wrap">
      <div className="battle-top-nine">
        <div className="battle-nine-tl" />
        <div className="battle-nine-top" />
        <div className="battle-nine-tr" />

        <div className="battle-nine-left" />

        <div className="battle-nine-center">
          <div className="battle-top-content">
            {/* Pause / menu button — top-right corner */}
            <button
              type="button"
              className="battle-top-pause-btn"
              onClick={onPause}
              aria-label="Menu / Pausar"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>

            {/* 3-column: player LEFT ── center info ── player RIGHT */}
            <div className="battle-top-row">
              <PlayerPanel player={player} />

              <div className="battle-top-center-col">
                <img
                  src="/assets/ui/logo_bbd.webp"
                  alt="BBD"
                  className="battle-top-logo"
                />
                {bestOf3 ? (
                  <div className="battle-top-stars-row">
                    <div className="battle-top-stars">
                      {[0, 1].map((i) => (
                        <Star key={`p-${i}`} active={i < playerStars} />
                      ))}
                    </div>
                    <span className="battle-top-round-label">R{currentRound}</span>
                    <div className="battle-top-stars">
                      {[0, 1].map((i) => (
                        <Star key={`o-${i}`} active={i < opponentStars} danger />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="battle-top-vs">VS</span>
                )}
              </div>

              <PlayerPanel player={opponent} isRight />
            </div>
          </div>
        </div>

        <div className="battle-nine-right" />

        <div className="battle-nine-bl" />
        <div className="battle-nine-bottom" />
        <div className="battle-nine-br" />
      </div>
    </section>
  );
}
