import { describe, it, expect } from "vitest";
import {
  calculateProgression,
  calculateMatchRewards,
  clampTrophies,
  LEVEL_CAP,
  getClassMasteryLevel,
  normalizeClassMastery,
  awardClassMasteryPoint,
  getClassAbilityChance,
  getClassMasteryUpgradeCost,
  getMostPlayedClass,
  resolveCharacterUnlockStatus,
} from "./progression";

/**
 * Tests for progression system: XP, levels, rewards, and trophy boundaries
 */

describe("progression - XP to Level conversion", () => {
  it("should start at level 1 with 0 XP", () => {
    const progression = calculateProgression(0);
    expect(progression.level).toBe(1);
  });

  it("should progress through levels at correct XP thresholds", () => {
    expect(calculateProgression(0).level).toBe(1);
    expect(calculateProgression(99).level).toBe(1);
    expect(calculateProgression(120).level).toBe(2);
    expect(calculateProgression(419).level).toBe(2);
    expect(calculateProgression(420).level).toBe(3);
  });

  it("should handle very high XP values", () => {
    const progression = calculateProgression(1000000);
    expect(progression.level).toBeGreaterThan(0);
    expect(progression.level).toBeLessThanOrEqual(LEVEL_CAP);
    expect(Number.isNaN(progression.level)).toBe(false);
  });

  it("should be monotonic (higher XP = higher or equal level)", () => {
    const xpValues = [0, 50, 120, 200, 500, 1000, 5000];
    const levels = xpValues.map((xp) => calculateProgression(xp).level);

    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });

  it("should track XP within current level", () => {
    const prog = calculateProgression(200);
    expect(prog.xpCurrentLevel).toBeGreaterThanOrEqual(0);
    expect(prog.xpTotal).toBe(200);
  });

  it("should respect level cap", () => {
    const prog = calculateProgression(30000000);
    expect(prog.level).toBeLessThanOrEqual(LEVEL_CAP);
    expect(prog.levelCap).toBe(LEVEL_CAP);
  });
});

describe("progression - Match rewards", () => {
  it("should return valid reward structure for win", () => {
    const reward = calculateMatchRewards("solo", "win");

    expect(reward).toBeDefined();
    expect(reward.xpGained).toBeGreaterThan(0);
    expect(reward.goldGained).toBeGreaterThan(0);
    expect(reward.mode).toBe("solo");
    expect(reward.result).toBe("win");
  });

  it("should return valid reward structure for loss", () => {
    const reward = calculateMatchRewards("solo", "loss");

    expect(reward.xpGained).toBeGreaterThan(0);
    expect(reward.goldGained).toBeGreaterThanOrEqual(0);
  });

  it("should return valid reward structure for draw", () => {
    const reward = calculateMatchRewards("solo", "draw");

    expect(reward.xpGained).toBeGreaterThan(0);
    expect(reward.goldGained).toBeGreaterThan(0);
  });

  it("should give more rewards in online mode", () => {
    const soloWin = calculateMatchRewards("solo", "win", () => 0.5);
    const onlineWin = calculateMatchRewards("online", "win", () => 0.5);

    expect(onlineWin.xpGained).toBeGreaterThan(soloWin.xpGained);
  });

  it("should award trophies only in online mode for wins", () => {
    const soloReward = calculateMatchRewards("solo", "win");
    const onlineReward = calculateMatchRewards("online", "win");

    expect(soloReward.trophyDelta).toBe(0);
    expect(onlineReward.trophyDelta).toBeGreaterThan(0);
  });

  it("should allow trophy loss in online mode for losses", () => {
    const reward = calculateMatchRewards("online", "loss");

    expect(reward.trophyDelta).toBeLessThan(0);
  });
});

describe("progression - Trophy clamping", () => {
  it("should clamp negative values to 0", () => {
    expect(clampTrophies(-5)).toBe(0);
    expect(clampTrophies(-1000)).toBe(0);
  });

  it("should allow positive values", () => {
    expect(clampTrophies(100)).toBe(100);
    expect(clampTrophies(5000)).toBe(5000);
  });

  it("should clamp floats to integers", () => {
    expect(clampTrophies(99.9)).toBe(99);
    expect(clampTrophies(100.5)).toBe(100);
  });
});

describe("progression - Class mastery", () => {
  it("should map mastery points to cumulative levels", () => {
    expect(getClassMasteryLevel(0)).toBe(1);
    expect(getClassMasteryLevel(5)).toBe(2);
    expect(getClassMasteryLevel(20)).toBe(3);
    expect(getClassMasteryLevel(50)).toBe(4);
    expect(getClassMasteryLevel(100)).toBe(5);
    expect(getClassMasteryLevel(999)).toBe(5);
  });

  it("should award mastery points to the played class", () => {
    let mastery = normalizeClassMastery(undefined);
    mastery = awardClassMasteryPoint(mastery, "atirador", 5);
    expect(mastery.atirador.points).toBe(5);
    // Level must not auto-increase; only paid upgrade changes level.
    expect(mastery.atirador.level).toBe(1);
    expect(mastery.suporte.points).toBe(0);
    expect(mastery.suporte.level).toBe(1);
  });

  it("should scale class chance by mastery level", () => {
    expect(getClassAbilityChance("atirador", 1)).toBeLessThan(
      getClassAbilityChance("atirador", 5),
    );
  });

  it("should match exact per-class mastery percentages", () => {
    expect(getClassAbilityChance("estrategista", 1)).toBe(0.04);
    expect(getClassAbilityChance("estrategista", 5)).toBe(0.2);

    expect(getClassAbilityChance("atirador", 1)).toBe(0.05);
    expect(getClassAbilityChance("atirador", 5)).toBe(0.25);

    expect(getClassAbilityChance("sorrateiro", 1)).toBe(0.03);
    expect(getClassAbilityChance("sorrateiro", 5)).toBe(0.15);

    // Ricochete table defines the base chance (vs shot); engine doubles it vs double_shot.
    expect(getClassAbilityChance("ricochete", 1)).toBe(0.06);
    expect(getClassAbilityChance("ricochete", 5)).toBe(0.3);

    expect(getClassAbilityChance("suporte", 1)).toBe(0.03);
    expect(getClassAbilityChance("suporte", 5)).toBe(0.15);

    expect(getClassAbilityChance("sanguinario", 1)).toBe(0.08);
    expect(getClassAbilityChance("sanguinario", 5)).toBe(0.4);
  });
});

describe("progression - Character unlock rules", () => {
  it("should gate level-based characters correctly", () => {
    const statusLocked = resolveCharacterUnlockStatus("the_razor", 9, false);
    const statusUnlocked = resolveCharacterUnlockStatus("the_razor", 10, false);

    expect(statusLocked.unlockedByRule).toBe(false);
    expect(statusUnlocked.unlockedByRule).toBe(true);
    expect(statusUnlocked.purchasable).toBe(true);
  });

  it("should make The Toon non-purchasable and achievement-gated", () => {
    const blocked = resolveCharacterUnlockStatus("the_toon", 10, false);
    const unlocked = resolveCharacterUnlockStatus("the_toon", 10, true);

    expect(blocked.purchasable).toBe(false);
    expect(blocked.unlockedByRule).toBe(false);
    expect(unlocked.unlockedByRule).toBe(true);
  });
});

describe("progression - Mastery upgrade cost", () => {
  it("should return configured gold costs for level upgrades", () => {
    expect(getClassMasteryUpgradeCost(2)).toBe(100);
    expect(getClassMasteryUpgradeCost(3)).toBe(300);
    expect(getClassMasteryUpgradeCost(4)).toBe(800);
    expect(getClassMasteryUpgradeCost(5)).toBe(1500);
  });

  it("should return null for invalid next levels", () => {
    expect(getClassMasteryUpgradeCost(1)).toBeNull();
    expect(getClassMasteryUpgradeCost(6)).toBeNull();
  });
});

describe("progression - Most played class", () => {
  it("should pick class with highest mastery points", () => {
    const favorite = getMostPlayedClass({
      atirador: { points: 10, level: 2 },
      estrategista: { points: 35, level: 3 },
      sorrateiro: { points: 0, level: 1 },
      ricochete: { points: 0, level: 1 },
      sanguinario: { points: 0, level: 1 },
      suporte: { points: 0, level: 1 },
    });

    expect(favorite).toBe("estrategista");
  });

  it("should use tie-breaker class when points are tied", () => {
    const favorite = getMostPlayedClass(
      {
        atirador: { points: 10, level: 2 },
        estrategista: { points: 10, level: 2 },
        sorrateiro: { points: 0, level: 1 },
        ricochete: { points: 0, level: 1 },
        sanguinario: { points: 0, level: 1 },
        suporte: { points: 0, level: 1 },
      },
      "estrategista",
    );

    expect(favorite).toBe("estrategista");
  });
});
