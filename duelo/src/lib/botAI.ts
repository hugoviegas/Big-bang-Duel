import type { PlayerState, CardType, GameMode } from '../types';
import { getAvailableCards } from './gameEngine';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export function botChooseCard(
  botState: PlayerState,
  playerHistory: CardType[],
  mode: GameMode,
  difficulty: BotDifficulty
): CardType {
  const available = getAvailableCards(mode, botState.ammo);

  if (difficulty === 'easy' || available.length === 1) {
    return available[Math.floor(Math.random() * available.length)];
  }

  const rand = Math.random() * 100;

  if (difficulty === 'medium') {
    if (botState.ammo === 0) {
      if (rand < 80) return 'reload';
      return 'dodge';
    } else if (botState.ammo === 1) {
      if (rand < 40 && available.includes('shot')) return 'shot';
      if (rand < 70) return 'dodge';
      return 'reload';
    } else if (botState.ammo === 2) {
      if (rand < 35 && available.includes('shot')) return 'shot';
      if (rand < 60 && available.includes('double_shot')) return 'double_shot';
      if (rand < 80) return 'dodge';
      return 'reload';
    } else {
      if (rand < 30 && available.includes('shot')) return 'shot';
      if (rand < 70 && available.includes('double_shot')) return 'double_shot';
      if (rand < 85) return 'dodge';
      return 'reload';
    }
  }

  // Hard Logic
  const lastPlayerCard = playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  if (botState.ammo === 0) {
    if (lastPlayerCard === 'reload' || lastPlayerCard === 'counter') {
      return 'reload';
    }
    return rand < 50 ? 'reload' : 'dodge';
  }

  if (lastPlayerCard === 'shot' || lastPlayerCard === 'double_shot') {
    if (available.includes('counter') && rand < 60) return 'counter';
    if (rand < 40) return 'dodge';
    return available.includes('double_shot') ? 'double_shot' : 'shot';
  }

  if (lastPlayerCard === 'counter' || lastPlayerCard === 'dodge') {
    return 'reload'; 
  }

  if (lastPlayerCard === 'reload') {
    if (available.includes('double_shot') && rand < 70) return 'double_shot';
    if (available.includes('shot')) return 'shot';
    return 'reload';
  }

  return available[Math.floor(Math.random() * available.length)];
}
