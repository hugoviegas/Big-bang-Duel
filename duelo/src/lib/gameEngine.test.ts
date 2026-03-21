import { describe, it, expect } from "vitest";
import { resolveCards, getAvailableCards } from "./gameEngine";
import type { CardType } from "../types";

describe("gameEngine - resolveCards 25 combinations in advanced mode", () => {
  const cards: CardType[] = [
    "shot",
    "double_shot",
    "dodge",
    "reload",
    "counter",
  ];

  // Matrix of expected player life lost for [playerCard][opponentCard]
  // 'shot', 'double_shot', 'dodge', 'reload', 'counter'
  const expectedPlayerLifeLost: Record<CardType, Record<CardType, number>> = {
    shot: { shot: 1, double_shot: 2, dodge: 0, reload: 0, counter: 1 },
    double_shot: { shot: 1, double_shot: 2, dodge: 0, reload: 0, counter: 1 },
    dodge: { shot: 0, double_shot: 1, dodge: 0, reload: 0, counter: 0 },
    reload: { shot: 1, double_shot: 2, dodge: 0, reload: 0, counter: 0 },
    counter: { shot: 0, double_shot: 0, dodge: 0, reload: 0, counter: 0 },
  };

  const expectedOpponentLifeLost: Record<CardType, Record<CardType, number>> = {
    shot: { shot: 1, double_shot: 1, dodge: 0, reload: 1, counter: 0 },
    double_shot: { shot: 2, double_shot: 2, dodge: 1, reload: 2, counter: 0 },
    dodge: { shot: 0, double_shot: 0, dodge: 0, reload: 0, counter: 0 },
    reload: { shot: 0, double_shot: 0, dodge: 0, reload: 0, counter: 0 },
    counter: { shot: 1, double_shot: 1, dodge: 0, reload: 0, counter: 0 },
  };

  it("should resolve all 25 combinations correctly concerning life lost", () => {
    for (const pCard of cards) {
      for (const oCard of cards) {
        // Assume player has 3 ammo and opponent has 3 so there are no cap constraints
        const pAmmo = 3;
        const oAmmo = 3;

        const result = resolveCards(pCard, oCard, pAmmo, oAmmo, "advanced", 1);

        expect(
          result.playerLifeLost,
          `P: ${pCard} vs O: ${oCard} (Player Life Lost)`,
        ).toBe(expectedPlayerLifeLost[pCard][oCard]);
        expect(
          result.opponentLifeLost,
          `P: ${pCard} vs O: ${oCard} (Opponent Life Lost)`,
        ).toBe(expectedOpponentLifeLost[pCard][oCard]);
      }
    }
  });

  it("should resolve reload ammo changes correctly considering interruptions", () => {
    // NOVA REGRA: Reload vs shot -> player +1 ammo (reload contabilizado mesmo interrompido), oAmmo -1
    // REGRA ANTIGA era: playerAmmoChange = 0 (reload ignorado ao ser atingido)
    const res1 = resolveCards("reload", "shot", 0, 1, "advanced", 1);
    expect(res1.playerAmmoChange).toBe(1);
    expect(res1.opponentAmmoChange).toBe(-1);

    // Reload vs dodge -> player +1 ammo, oAmmo 0
    const res2 = resolveCards("reload", "dodge", 0, 1, "advanced", 1);
    expect(res2.playerAmmoChange).toBe(1);
    expect(res2.opponentAmmoChange).toBe(0);

    // Reload vs counter -> player +1 ammo, oAmmo -1
    const res3 = resolveCards("reload", "counter", 0, 1, "advanced", 1);
    expect(res3.playerAmmoChange).toBe(1); // not interrupted!
    expect(res3.opponentAmmoChange).toBe(-1); // counter costs ammo even if wasted
  });

  it("should not allow ammo to exceed MAX_AMMO (3) when reloading", () => {
    const res = resolveCards("reload", "dodge", 3, 3, "advanced", 1);
    expect(res.playerAmmoChange).toBe(0); // already maxed!
  });

  it("should use class mastery chance (atirador) instead of fixed 20% in ability roll", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.1; // 10% roll

    // Level 1 atirador has 5% (0.05) chance: should NOT trigger
    const resultLvl1 = resolveCards(
      "shot",
      "reload",
      3,
      0,
      "advanced",
      1,
      "atirador",
      "sorrateiro",
      1,
      1,
    );
    expect(resultLvl1.playerAbilityTriggered).toBeUndefined();

    // Level 5 atirador has 25% (0.25) chance: should trigger at 0.1 roll
    const resultLvl5 = resolveCards(
      "shot",
      "reload",
      3,
      0,
      "advanced",
      1,
      "atirador",
      "sorrateiro",
      5,
      1,
    );
    expect(resultLvl5.playerAbilityTriggered).toBe("Tiro Crítico");

    Math.random = originalMathRandom;
  });

  it("should make Atirador critical shot hit through dodge for 1 damage", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // always trigger

    const result = resolveCards(
      "shot",
      "dodge",
      1,
      0,
      "advanced",
      1,
      "atirador",
      "sorrateiro",
      5,
      1,
    );

    expect(result.playerAbilityTriggered).toBe("Tiro Crítico");
    expect(result.opponentLifeLost).toBe(1);

    Math.random = originalMathRandom;
  });

  it("should make opponent Atirador critical shot hit through dodge for 1 damage", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // always trigger

    const result = resolveCards(
      "dodge",
      "shot",
      0,
      1,
      "advanced",
      1,
      "sorrateiro",
      "atirador",
      1,
      5,
    );

    expect(result.opponentAbilityTriggered).toBe("Tiro Crítico");
    expect(result.playerLifeLost).toBe(1);

    Math.random = originalMathRandom;
  });

  it("should trigger Curandeiro heal on any card when below max life", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // always trigger

    const result = resolveCards(
      "reload",
      "reload",
      0,
      0,
      "advanced",
      1,
      "suporte",
      "atirador",
      1,
      1,
      2,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
    );

    expect(result.playerAbilityTriggered).toBe("Cura");
    expect(result.playerShieldUsed).toBe(true);
    expect(result.playerLifeLost).toBe(-1);

    Math.random = originalMathRandom;
  });

  it("should not trigger Curandeiro heal when already at max life", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // would trigger if eligible

    const result = resolveCards(
      "reload",
      "reload",
      0,
      0,
      "advanced",
      1,
      "suporte",
      "atirador",
      1,
      1,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
      3,
    );

    expect(result.playerAbilityTriggered).toBeUndefined();
    expect(result.playerShieldUsed).toBe(false);
    expect(result.playerLifeLost).toBe(0);

    Math.random = originalMathRandom;
  });

  it("should not trigger Curandeiro heal when passive uses are exhausted", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // would trigger if eligible

    const result = resolveCards(
      "reload",
      "reload",
      0,
      0,
      "advanced",
      1,
      "suporte",
      "atirador",
      1,
      1,
      0,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
    );

    expect(result.playerAbilityTriggered).toBeUndefined();
    expect(result.playerShieldUsed).toBe(false);
    expect(result.playerLifeLost).toBe(0);

    Math.random = originalMathRandom;
  });

  it("should trigger Sanguinario stack recharge on any card when below 3 stacks", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // always trigger

    const result = resolveCards(
      "reload",
      "reload",
      0,
      0,
      "advanced",
      1,
      "sanguinario",
      "atirador",
      1,
      1,
      2,
      2,
      1,
      2,
      3,
      3,
      3,
      3,
    );

    expect(result.playerAbilityTriggered).toBe("Bala Fantasma");
    expect(result.playerShieldUsed).toBe(true);
    expect(result.playerDoubleShotReloaded).toBe(true);

    Math.random = originalMathRandom;
  });

  it("should not trigger Sanguinario recharge when already at 3 double-shot stacks", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // would trigger if eligible

    const result = resolveCards(
      "reload",
      "reload",
      0,
      0,
      "advanced",
      1,
      "sanguinario",
      "atirador",
      1,
      1,
      2,
      2,
      3,
      2,
      3,
      3,
      3,
      3,
    );

    expect(result.playerAbilityTriggered).toBeUndefined();
    expect(result.playerShieldUsed).toBe(false);
    expect(result.playerDoubleShotReloaded).toBe(false);

    Math.random = originalMathRandom;
  });

  it("should not trigger Sanguinario recharge when passive uses are exhausted", () => {
    const originalMathRandom = Math.random;
    Math.random = () => 0.0; // would trigger if eligible

    const result = resolveCards(
      "reload",
      "reload",
      0,
      0,
      "advanced",
      1,
      "sanguinario",
      "atirador",
      1,
      1,
      0,
      2,
      1,
      2,
      3,
      3,
      3,
      3,
    );

    expect(result.playerAbilityTriggered).toBeUndefined();
    expect(result.playerShieldUsed).toBe(false);
    expect(result.playerDoubleShotReloaded).toBe(false);

    Math.random = originalMathRandom;
  });
});

describe("gameEngine - dodge streak blocking", () => {
  it("should allow dodge when streak < 3", () => {
    const available0 = getAvailableCards("advanced", 2, 3, 0);
    expect(available0).toContain("dodge");

    const available1 = getAvailableCards("advanced", 2, 3, 1);
    expect(available1).toContain("dodge");

    const available2 = getAvailableCards("advanced", 2, 3, 2);
    expect(available2).toContain("dodge");
  });

  it("should block dodge when streak >= MAX_DODGE_STREAK (3)", () => {
    const available3 = getAvailableCards("advanced", 2, 3, 3);
    expect(available3).not.toContain("dodge");

    const available4 = getAvailableCards("advanced", 2, 3, 4);
    expect(available4).not.toContain("dodge");
  });

  it("should always allow reload regardless of dodge streak", () => {
    const available0 = getAvailableCards("advanced", 2, 3, 0);
    expect(available0).toContain("reload");

    const available3 = getAvailableCards("advanced", 2, 3, 3);
    expect(available3).toContain("reload");
  });
});
