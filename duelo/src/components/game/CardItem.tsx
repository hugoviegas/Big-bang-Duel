import type { CardType } from '../../types';

interface CardItemProps {
  id: CardType;
  label: string;
  ammoCost: number;
  isSelected?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
}

export function CardItem({ id, label, ammoCost, isSelected, isSelectable = true, onClick }: CardItemProps) {
  const getCardImage = (cardId: CardType) => {
    const fileMap: Record<CardType, string> = {
      shot: 'card_shoot.png',
      double_shot: 'card_double_shoot.png',
      dodge: 'card_dodge.png',
      reload: 'card_reload.png',
      counter: 'card_counter.png'
    };
    return `/assets/cards/${fileMap[cardId]}`;
  };

  return (
    <button 
      onClick={isSelectable ? onClick : undefined}
      disabled={!isSelectable}
      className={`
        card-item relative shrink-0 w-28 h-40 transition-all duration-300 pointer-events-auto
        flex flex-col items-center justify-end p-2 overflow-hidden bg-parchment
        ${isSelected ? 'selected scale-110 z-10 -translate-y-4' : 'hover:-translate-y-2'}
        ${!isSelectable ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
      `}
      style={{
        backgroundImage: "url('" + getCardImage(id) + "')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        boxShadow: isSelected ? '0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(212,168,85,0.8)' : '0 4px 6px rgba(0,0,0,0.3)',
        borderRadius: '12px',
        border: isSelected ? '3px solid var(--color-gold)' : '3px solid var(--color-brown-dark)'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0" />
      <div className="relative z-10 w-full text-center">
        <div className="font-western tracking-wider text-sand-light uppercase text-sm drop-shadow-md mb-1">{label}</div>
        <div className="font-stats text-xs font-bold text-red-west w-full bg-parchment/90 rounded border border-brown-dark shadow">
          {ammoCost > 0 ? "CUSTO: " + ammoCost + " B." : (id === 'reload' ? '+1 BALA' : 'GRÁTIS')}
        </div>
      </div>
    </button>
  );
}
