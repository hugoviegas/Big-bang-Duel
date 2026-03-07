import { getCharacter } from "../../lib/characters";
import type { PlayerState } from "../../types";

interface StatusBarProps {
  player: PlayerState;
  isRight?: boolean;
  hideAmmo?: boolean; // hide ammo display for this player
}

export function StatusBar({ player, isRight = false, hideAmmo = false }: StatusBarProps) {
  const alignClass = isRight ? "items-end text-right" : "items-start text-left";
  const flexDir = isRight ? "flex-row-reverse" : "flex-row";
  const charDef = getCharacter(player.avatar);
  const thumbSrc = charDef.image;
  // Crop to face: use object-cover + object-position to focus on the head area
  const cropPosition = `center ${charDef.avatarCropY}`;

  return (
    <div className={`flex ${flexDir} items-center gap-2 md:gap-3`}>
      {/* Avatar thumbnail — cropped to face area */}
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-3 border-gold bg-black/50 overflow-hidden flex-shrink-0 shadow-lg">
        <img
          src={thumbSrc}
          alt=""
          className="w-full h-full object-cover"
          style={{
            objectPosition: cropPosition,
            // Não espelhar imagem mesmo quando está na direita
            // antes: transform: isRight ? "scaleX(-1)" : undefined,
          }}
        />
      </div>

      <div
        className={`flex flex-col ${alignClass} bg-black/50 backdrop-blur-sm px-3 py-2 rounded-xl border border-sand/20`}
      >
        <h2 className="font-western text-sm md:text-base text-gold mb-1 tracking-wider leading-none">
          {player.displayName}
        </h2>

        {/* Life hearts */}
        <div className={`flex gap-1 mb-1 ${isRight ? "flex-row-reverse" : ""}`}>
          {Array.from({ length: player.maxLife }).map((_, i) => (
            <svg
              key={`life-${i}`}
              viewBox="0 0 24 24"
              className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${i < player.life ? "drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" : "opacity-30"}`}
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

        {/* Ammo bullets - hidden if hideAmmo is true */}
        {!hideAmmo && (
          <div className={`flex gap-1 ${isRight ? "flex-row-reverse" : ""}`}>
            {Array.from({ length: player.maxAmmo }).map((_, i) => (
            <svg
              key={`ammo-${i}`}
              viewBox="0 0 10 24"
              className={`w-3 h-6 md:w-3.5 md:h-7 transition-all duration-300 ${i < player.ammo ? "drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]" : "opacity-30"}`}
            >
              {/* Bullet shape */}
              <rect
                x="1"
                y="10"
                width="8"
                height="14"
                rx="1"
                fill={i < player.ammo ? "#B45309" : "#374151"}
                stroke={i < player.ammo ? "#78350F" : "#1F2937"}
                strokeWidth="0.5"
              />
              <ellipse
                cx="5"
                cy="10"
                rx="4"
                ry="3"
                fill={i < player.ammo ? "#FBBF24" : "#4B5563"}
                stroke={i < player.ammo ? "#D97706" : "#374151"}
                strokeWidth="0.5"
              />
              <ellipse
                cx="5"
                cy="8"
                rx="3"
                ry="4"
                fill={i < player.ammo ? "#FDE68A" : "#6B7280"}
              />
            </svg>
          ))}
        </div>
        )}
        
        {/* Hidden ammo indicator */}
        {hideAmmo && (
          <div className="text-xs text-sand/60 font-stats tracking-wide">🔒 Munição Oculta</div>
        )}
      </div>
    </div>
  );
}
