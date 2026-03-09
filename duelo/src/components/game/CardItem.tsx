import type { CardType } from "../../types";

interface CardItemProps {
  id: CardType;
  label: string;
  description: string;
  ammoCost: number;
  isSelected?: boolean;
  isSelectable?: boolean;
  usesLeft?: number; // for double_shot: remaining uses this round
  dodgeStreakCount?: number; // for dodge: current streak count (0-3)
  onClick?: () => void;
}

const CARD_IMAGES: Record<CardType, string> = {
  shot: "/assets/cards/card_shoot.webp",
  double_shot: "/assets/cards/card_double_shoot.webp",
  dodge: "/assets/cards/card_dodge.webp",
  reload: "/assets/cards/card_reload.webp",
  counter: "/assets/cards/card_counter.webp",
};

export function CardItem({
  id,
  label,
  description,
  ammoCost,
  isSelected,
  isSelectable = true,
  usesLeft,
  dodgeStreakCount,
  onClick,
}: CardItemProps) {
  return (
    <button
      onClick={isSelectable ? onClick : undefined}
      disabled={!isSelectable}
      className={`
        card-item relative shrink-0 
        w-[60px] h-[85px] xs:w-[68px] xs:h-[95px] sm:w-[80px] sm:h-[110px] md:w-[90px] md:h-[125px] lg:w-[100px] lg:h-[140px]
        flex flex-col items-center justify-end group
        transition-all duration-200
        ${isSelected ? "selected scale-110 -translate-y-2 sm:-translate-y-3 z-10" : "hover:-translate-y-1 sm:hover:-translate-y-2"}
        ${!isSelectable ? "opacity-40 cursor-not-allowed grayscale" : "cursor-pointer"}
      `}
      style={{
        backgroundImage: "url('" + CARD_IMAGES[id] + "')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        borderRadius: "8px",
        border: isSelected
          ? "2.5px solid var(--color-gold)"
          : "1.5px solid var(--color-brown-dark)",
        boxShadow: isSelected
          ? "0 6px 18px rgba(0,0,0,0.5), 0 0 12px rgba(255,215,0,0.6)"
          : "0 3px 6px rgba(0,0,0,0.4)",
      }}
      title={description}
    >
      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent z-0 rounded-[7px]" />

      {/* Dodge streak badge */}
      {id === "dodge" &&
        dodgeStreakCount !== undefined &&
        dodgeStreakCount > 0 && (
          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 z-20 flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-black/50 ${i < dodgeStreakCount ? "bg-blue-400" : "bg-gray-600 opacity-40"}`}
              />
            ))}
          </div>
        )}

      {/* Uses remaining badge for double_shot */}
      {id === "double_shot" && usesLeft !== undefined && isSelectable && (
        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-20 flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-black/50 ${i < usesLeft ? "bg-yellow-400" : "bg-gray-600 opacity-40"}`}
            />
          ))}
        </div>
      )}

      {/* Card info */}
      <div className="relative z-10 w-full p-1 sm:p-1.5 text-center">
        <div className="font-western text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs text-sand-light tracking-wide leading-tight drop-shadow-md">
          {label}
        </div>
        <div className="font-stats text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] font-bold mt-0.5 px-0.5 sm:px-1 py-0.5 rounded bg-black/40 text-sand-light/90">
          {ammoCost > 0
            ? ammoCost + " BALA" + (ammoCost > 1 ? "S" : "")
            : id === "reload"
              ? "+1 BALA"
              : "GRÁTIS"}
        </div>
      </div>
    </button>
  );
}
