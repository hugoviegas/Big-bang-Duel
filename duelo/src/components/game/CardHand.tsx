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

import { useFirebaseRoom } from '../../hooks/useFirebase';

export function CardHand() {
  const { mode, player, phase, selectCard, resolveTurn, isOnline, roomId } = useGameStore();
  const { submitChoice } = useFirebaseRoom();

  const handleSelect = (cardId: string) => {
    if (phase !== 'selecting') return;
    selectCard(cardId as CardType);
  };

  const handleConfirm = () => {
    if (player.selectedCard && phase === 'selecting') {
      if (!isOnline) {
        resolveTurn();
      } else if (roomId) {
        submitChoice(roomId, player.selectedCard);
      }
    }
  };

  const availableCards = getAvailableCards(mode, player.ammo);
  const allCards = CARDS_BY_MODE[mode];

  // Don't show during non-interactive phases
  if (phase === 'game_over') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* Glassmorphism container */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-6 px-3 pointer-events-auto">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          {/* Phase indicator */}
          {phase !== 'selecting' && (
            <div className="text-center mb-4">
              <span className="font-western text-sm text-gold/80 tracking-widest animate-pulse">
                {phase === 'revealing' ? 'REVELANDO CARTAS...' : phase === 'resolving' ? 'RESOLVENDO...' : 'AGUARDE...'}
              </span>
            </div>
          )}
          
          {/* Cards row */}
          <div className="flex justify-center items-center gap-2 sm:gap-6 md:gap-8 overflow-visible pb-2 w-full">
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
            <div className="flex justify-center mt-6 w-full">
              <button 
                onClick={handleConfirm}
                className="w-full max-w-xs py-3 bg-gradient-to-r from-red-600 to-red-900 text-gold font-western text-xl tracking-widest border-2 border-gold/40 rounded-xl shadow-2xl animate-pulse-glow hover:scale-105 active:scale-95 transition-all"
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
