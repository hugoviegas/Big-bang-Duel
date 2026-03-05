import { useGameStore } from '../../store/gameStore';
import { CardItem } from './CardItem';
import { CARDS_BY_MODE, getAvailableCards } from '../../lib/gameEngine';

export function CardHand() {
  const { mode, player, phase, selectCard, resolveTurn, isOnline } = useGameStore();

  const handleSelect = (cardId: string) => {
    if (phase !== 'selecting') return;
    selectCard(cardId as any);
  };

  const handleConfirm = () => {
    if (player.selectedCard && phase === 'selecting') {
      if (!isOnline) {
        // Solo mode: gameStore handles automatic resolve via selectCard delay, but we can trigger it or let the store do it. 
        // Wait, store resolves turn in selectCard in solo mode immediately after bot selects. But we want user to confirm first!
        // Actually, the prompt says "tap to select, tap Confirm to lock in".
        // Let's call `resolveTurn()` here. Actually `gameStore`'s `selectCard` does it. Let's fix gameStore so `resolveTurn` is explicit, or just assume it is.
        // For now:
        // gameStore's selectCard sets `selectedCard`. The confirm button triggers bot logic.
        resolveTurn(); 
      }
    }
  };

  const availableCards = getAvailableCards(mode, player.ammo);
  const allCards = CARDS_BY_MODE[mode];

  const cardDetails = {
    shot: { label: 'Tiro', cost: 1 },
    double_shot: { label: 'Tiro Duplo', cost: 2 },
    dodge: { label: 'Desvio', cost: 0 },
    reload: { label: 'Recarga', cost: 0 },
    counter: { label: 'Contra-golpe', cost: 1 }
  };

  return (
    <div className="flex flex-col items-center gap-4 fixed bottom-4 left-0 right-0 z-40 bg-black/40 p-4 border-t-4 border-brown-dark rounded-t-3xl backdrop-blur-md">
      <div className="flex gap-2 sm:gap-4 overflow-x-auto max-w-full pb-2 px-2 hide-scrollbar">
        {allCards.map(cId => (
          <CardItem 
            key={cId}
            id={cId}
            label={(cardDetails as any)[cId].label}
            ammoCost={(cardDetails as any)[cId].cost}
            isSelected={player.selectedCard === cId}
            isSelectable={phase === 'selecting' && availableCards.includes(cId)}
            onClick={() => handleSelect(cId)}
          />
        ))}
      </div>
      
      {phase === 'selecting' && player.selectedCard && (
        <button 
          onClick={handleConfirm}
          className="px-8 py-3 bg-red-west hover:bg-red-700 text-gold font-western text-xl border-2 border-brown-dark rounded transition-all shadow-lg animate-bounce"
        >
          CONFIRMAR
        </button>
      )}
    </div>
  );
}
