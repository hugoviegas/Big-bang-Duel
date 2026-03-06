import type { CardType, GameMode, TurnResult, PlayerState } from '../types';

export const CARDS_BY_MODE: Record<GameMode, CardType[]> = {
  beginner: ['reload', 'shot', 'dodge'],
  normal:   ['reload', 'shot', 'dodge', 'double_shot'],
  advanced: ['reload', 'shot', 'dodge', 'counter', 'double_shot'],
};

export const LIFE_BY_MODE: Record<GameMode, number> = {
  beginner: 3,
  normal:   4,
  advanced: 4,
};

export const MAX_AMMO = 3;

export function getAvailableCards(mode: GameMode, ammo: number): CardType[] {
  return CARDS_BY_MODE[mode].filter(card => {
    if (card === 'shot') return ammo >= 1;
    if (card === 'double_shot') return ammo >= 2;
    if (card === 'counter') return ammo >= 1;
    return true; // dodge and reload always available
  });
}

export function checkWinner(player: PlayerState, opponent: PlayerState): string | null {
  if (player.life <= 0 && opponent.life <= 0) return 'draw';
  if (player.life <= 0) return opponent.id;
  if (opponent.life <= 0) return player.id;
  return null;
}

export function resolveCards(
  pCard: CardType,
  oCard: CardType,
  pAmmo: number,
  oAmmo: number,
  _mode: GameMode,
  turn: number
): TurnResult {
  let pLifeLost = 0;
  let oLifeLost = 0;
  let pAmmoChange = 0;
  let oAmmoChange = 0;
  let narrative = '';

  const cost = (card: CardType) => (card === 'shot' || card === 'counter' ? -1 : card === 'double_shot' ? -2 : 0);

  // Default cost reduction
  pAmmoChange += cost(pCard);
  oAmmoChange += cost(oCard);

  // Resolution Matrix
  if (pCard === 'shot' && oCard === 'shot') {
    pLifeLost = 1; oLifeLost = 1; narrative = 'Troca de Tiros! Ambos foram atingidos!';
  } else if (pCard === 'shot' && oCard === 'double_shot') {
    pLifeLost = 2; oLifeLost = 1; narrative = 'Você atirou, mas o oponente revidou com tiro duplo!';
  } else if (pCard === 'shot' && oCard === 'dodge') {
    narrative = 'Oponente desviou do seu tiro!';
  } else if (pCard === 'shot' && oCard === 'reload') {
    oLifeLost = 1; narrative = 'Você atirou em plena recarga! Oponente atingido!';
  } else if (pCard === 'shot' && oCard === 'counter') {
    pLifeLost = 1; narrative = 'CONTRA GOLPE! Oponente desviou e atirou de volta!';

  } else if (pCard === 'double_shot' && oCard === 'shot') {
    pLifeLost = 1; oLifeLost = 2; narrative = 'Tiro duplo! Oponente mal teve tempo de revidar!';
  } else if (pCard === 'double_shot' && oCard === 'double_shot') {
    pLifeLost = 2; oLifeLost = 2; narrative = 'Banho de Sangue! Ambos usaram tiro duplo!';
  } else if (pCard === 'double_shot' && oCard === 'dodge') {
    narrative = 'Inacreditável! Oponente desviou de ambos os tiros!';
  } else if (pCard === 'double_shot' && oCard === 'reload') {
    oLifeLost = 2; narrative = 'Tiro Duplo crítico durante a recarga do oponente!';
  } else if (pCard === 'double_shot' && oCard === 'counter') {
    pLifeLost = 1; narrative = 'Oponente defletiu e contra-atacou o Tiro Duplo!';

  } else if (pCard === 'dodge' && oCard === 'shot') {
    narrative = 'Belo desvio! A bala passou raspando!';
  } else if (pCard === 'dodge' && oCard === 'double_shot') {
    narrative = 'Matriz! Desviou do Tiro Duplo perfeitamente!';
  } else if (pCard === 'dodge' && oCard === 'dodge') {
    narrative = 'Ambos pularam pro mesmo lado. Que estranho...';
  } else if (pCard === 'dodge' && oCard === 'reload') {
    oAmmoChange += 1; narrative = 'Você desviou do vento, oponente recarregou!';
  } else if (pCard === 'dodge' && oCard === 'counter') {
    narrative = 'Oponente preparou um contra-golpe contra... nada.';

  } else if (pCard === 'reload' && oCard === 'shot') {
    pLifeLost = 1; narrative = 'Interrompido! Oponente atirou enquanto você recarregava!';
  } else if (pCard === 'reload' && oCard === 'double_shot') {
    pLifeLost = 2; narrative = 'Massacre! Tiro Duplo recebido na recarga!';
  } else if (pCard === 'reload' && oCard === 'dodge') {
    pAmmoChange += 1; narrative = 'Você recarregou tranquilamente enquanto ele pulava.';
  } else if (pCard === 'reload' && oCard === 'reload') {
    pAmmoChange += 1; oAmmoChange += 1; narrative = 'Momento de paz. Ambos recarregaram suas armas.';
  } else if (pCard === 'reload' && oCard === 'counter') {
    pAmmoChange += 1; narrative = 'Recarga limpa. O contra-golpe do oponente foi inútil.';

  } else if (pCard === 'counter' && oCard === 'shot') {
    oLifeLost = 1; narrative = 'CONTRA GOLPE! Você desviou e devolveu o tiro!';
  } else if (pCard === 'counter' && oCard === 'double_shot') {
    oLifeLost = 1; narrative = 'Mestre! Vocẽ bloqueou o Tiro Duplo e contra-atacou!';
  } else if (pCard === 'counter' && oCard === 'dodge') {
    narrative = 'Silêncio constrangedor. Você sacou mas ele rolou pra longe.';
  } else if (pCard === 'counter' && oCard === 'reload') {
    oAmmoChange += 1; narrative = 'Você aguardou um tiro que não veio. Ele recarregou.';
  } else if (pCard === 'counter' && oCard === 'counter') {
    narrative = 'Duelo mental. Ambos seguraram as armas esperando o outro atirar.';
  }

  // Reload action cap logic handled safely
  const actualPAmmoChange = pCard === 'reload' && oCard !== 'shot' && oCard !== 'double_shot' ? 
      (pAmmo < MAX_AMMO ? 1 : 0) : pAmmoChange;

  const actualOAmmoChange = oCard === 'reload' && pCard !== 'shot' && pCard !== 'double_shot' ? 
      (oAmmo < MAX_AMMO ? 1 : 0) : oAmmoChange;

  // Wait, if P reloads while being shot, pAmmoChange was 0, but if oCard = shot, the above evaluates to pAmmoChange (which is 0). It's correct.

  return {
    turn,
    playerCard: pCard,
    opponentCard: oCard,
    playerLifeLost: pLifeLost,
    opponentLifeLost: oLifeLost,
    playerAmmoChange: actualPAmmoChange,
    opponentAmmoChange: actualOAmmoChange,
    narrative
  };
}
