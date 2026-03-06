import type { CardType } from '../../types';

interface CardItemProps {
  id: CardType;
  label: string;
  description: string;
  ammoCost: number;
  isSelected?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
}

const CARD_IMAGES: Record<CardType, string> = {
  shot: '/assets/cards/card_shoot.webp',
  double_shot: '/assets/cards/card_double_shoot.webp',
  dodge: '/assets/cards/card_dodge.webp',
  reload: '/assets/cards/card_reload.webp',
  counter: '/assets/cards/card_counter.webp'
};

export function CardItem({ id, label, description, ammoCost, isSelected, isSelectable = true, onClick }: CardItemProps) {
  return (
    <button 
      onClick={isSelectable ? onClick : undefined}
      disabled={!isSelectable}
      className={`
        card-item relative shrink-0 w-[80px] h-[110px] sm:w-[90px] sm:h-[125px] md:w-[100px] md:h-[140px]
        flex flex-col items-center justify-end group
        ${isSelected ? 'selected scale-105 -translate-y-3 z-10' : 'hover:-translate-y-2'}
        ${!isSelectable ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
      `}
      style={{
        backgroundImage: "url('" + CARD_IMAGES[id] + "')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: '10px',
        border: isSelected ? '3px solid var(--color-gold)' : '2px solid var(--color-brown-dark)',
        boxShadow: isSelected 
          ? '0 8px 20px rgba(0,0,0,0.5), 0 0 15px rgba(255,215,0,0.6)' 
          : '0 4px 8px rgba(0,0,0,0.4)',
      }}
      title={description}
    >
      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent z-0 rounded-[8px]" />
      
      {/* Card info */}
      <div className="relative z-10 w-full p-1.5 text-center">
        <div className="font-western text-[10px] sm:text-xs text-sand-light tracking-wider leading-tight drop-shadow-md">{label}</div>
        <div className="font-stats text-[9px] sm:text-[10px] font-bold mt-0.5 px-1 py-0.5 rounded bg-black/40 text-sand-light/90">
          {ammoCost > 0 ? ammoCost + " BALA" + (ammoCost > 1 ? 'S' : '') : (id === 'reload' ? '+1 BALA' : 'GRÁTIS')}
        </div>
      </div>
    </button>
  );
}
