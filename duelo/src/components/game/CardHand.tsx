import { useGameStore } from '../../store/gameStore';
import { CardItem } from './CardItem';
import { CARDS_BY_MODE, getAvailableCards } from '../../lib/gameEngine';
import type { CardType } from '../../types';

const CARD_DETAILS: Record<CardType, { label: string; description: string; cost: number }> = {
  shot: { label: 'Tiro', description: 'Dispara 1 bala no oponente. Causa 1 de dano.', cost: 1 },
  double_shot: { label: 'Tiro Duplo', description: 'Dispara 2 balas. Causa 2 de dano, mas gasta 2 balas.', cost: 2 },
  dodge: { label: 'Desvio', description: 'Desvia de qualquer tiro. Não gasta munição.', cost: 0 },
  reload: { label: 'Recarga', description: 'Recarrega +1 bala. Vulnerável a tiros.', cost: 0 },
  counter: { label: 'Contra-golpe', description: 'Desvia e contra-ataca. Gasta 1 bala. Só funciona contra tiros.', cost: 1 }
};

export function CardHand() {
  const { mode, player, phase, selectCard, resolveTurn, isOnline } = useGameStore();

  const handleSelect = (cardId: string) => {
    if (phase !== 'selecting') return;
    selectCard(cardId as CardType);
  };

  const handleConfirm = () => {
    if (player.selectedCard && phase === 'selecting') {
      if (!isOnline) {
        resolveTurn();
      }
    }
  };

  const availableCards = getAvailableCards(mode, player.ammo);
  const allCards = CARDS_BY_MODE[mode];

  // Don't show during non-interactive phases
  if (phase === 'game_over') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Glassmorphism container */}
      <div className="bg-black/60 backdrop-blur-md border-t-2 border-gold/20 px-3 py-3 md:py-4">
        <div className="max-w-3xl mx-auto">
          {/* Phase indicator */}
          {phase !== 'selecting' && (
            <div className="text-center mb-2">
              <span className="font-western text-sm text-gold/80 tracking-widest animate-pulse">
                {phase === 'revealing' ? 'REVELANDO CARTAS...' : phase === 'resolving' ? 'RESOLVENDO...' : 'AGUARDE...'}
              </span>
            </div>
          )}
          
          {/* Cards row */}
          <div className="flex justify-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar pb-1">
            {allCards.map(cId => {
              const details = CARD_DETAILS[cId];
              return (
                <CardItem 
                  key={cId}
                  id={cId}
                  label={details.label}
                  description={details.description}
                  ammoCost={details.cost}
                  isSelected={player.selectedCard === cId}
                  isSelectable={phase === 'selecting' && availableCards.includes(cId)}
                  onClick={() => handleSelect(cId)}
                />
              );
            })}
          </div>

          {/* Confirm button */}
          {phase === 'selecting' && player.selectedCard && (
            <div className="flex justify-center mt-3">
              <button 
                onClick={handleConfirm}
                className="px-10 py-2.5 bg-gradient-to-r from-red-700 to-red-900 text-gold font-western text-lg tracking-widest border-2 border-gold/50 rounded-lg shadow-lg animate-pulse-glow hover:scale-105 active:scale-100 transition-transform"
              >
                CONFIRMAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
