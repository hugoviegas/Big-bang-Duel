import { describe, it, expect } from 'vitest';
import { resolveCards } from './gameEngine';
import type { CardType } from '../types';

describe('gameEngine - resolveCards 25 combinations in advanced mode', () => {
  const cards: CardType[] = ['shot', 'double_shot', 'dodge', 'reload', 'counter'];
  
  // Matrix of expected player life lost for [playerCard][opponentCard]
  // 'shot', 'double_shot', 'dodge', 'reload', 'counter'
  const expectedPlayerLifeLost: Record<CardType, Record<CardType, number>> = {
    shot: { shot: 1, double_shot: 2, dodge: 0, reload: 0, counter: 1 },
    double_shot: { shot: 1, double_shot: 2, dodge: 0, reload: 0, counter: 1 },
    dodge: { shot: 0, double_shot: 0, dodge: 0, reload: 0, counter: 0 },
    reload: { shot: 1, double_shot: 2, dodge: 0, reload: 0, counter: 0 },
    counter: { shot: 0, double_shot: 0, dodge: 0, reload: 0, counter: 0 }
  };

  const expectedOpponentLifeLost: Record<CardType, Record<CardType, number>> = {
    shot: { shot: 1, double_shot: 1, dodge: 0, reload: 1, counter: 0 },
    double_shot: { shot: 2, double_shot: 2, dodge: 0, reload: 2, counter: 0 },
    dodge: { shot: 0, double_shot: 0, dodge: 0, reload: 0, counter: 0 },
    reload: { shot: 0, double_shot: 0, dodge: 0, reload: 0, counter: 0 },
    counter: { shot: 1, double_shot: 1, dodge: 0, reload: 0, counter: 0 }
  };


  it('should resolve all 25 combinations correctly concerning life lost', () => {
    for (const pCard of cards) {
      for (const oCard of cards) {
        // Assume player has 3 ammo and opponent has 3 so there are no cap constraints
        const pAmmo = 3;
        const oAmmo = 3;

        const result = resolveCards(pCard, oCard, pAmmo, oAmmo, 'advanced', 1);

        expect(result.playerLifeLost, `P: ${pCard} vs O: ${oCard} (Player Life Lost)`).toBe(expectedPlayerLifeLost[pCard][oCard]);
        expect(result.opponentLifeLost, `P: ${pCard} vs O: ${oCard} (Opponent Life Lost)`).toBe(expectedOpponentLifeLost[pCard][oCard]);
      }
    }
  });

  it('should resolve reload ammo changes correctly considering interruptions', () => {
    // NOVA REGRA: Reload vs shot -> player +1 ammo (reload contabilizado mesmo interrompido), oAmmo -1
    // REGRA ANTIGA era: playerAmmoChange = 0 (reload ignorado ao ser atingido)
    const res1 = resolveCards('reload', 'shot', 0, 1, 'advanced', 1);
    expect(res1.playerAmmoChange).toBe(1);
    expect(res1.opponentAmmoChange).toBe(-1);

    // Reload vs dodge -> player +1 ammo, oAmmo 0
    const res2 = resolveCards('reload', 'dodge', 0, 1, 'advanced', 1);
    expect(res2.playerAmmoChange).toBe(1);
    expect(res2.opponentAmmoChange).toBe(0);

    // Reload vs counter -> player +1 ammo, oAmmo -1
    const res3 = resolveCards('reload', 'counter', 0, 1, 'advanced', 1);
    expect(res3.playerAmmoChange).toBe(1); // not interrupted!
    expect(res3.opponentAmmoChange).toBe(-1); // counter costs ammo even if wasted
  });

  it('should not allow ammo to exceed MAX_AMMO (3) when reloading', () => {
    const res = resolveCards('reload', 'dodge', 3, 3, 'advanced', 1);
    expect(res.playerAmmoChange).toBe(0); // already maxed!
  });
});
