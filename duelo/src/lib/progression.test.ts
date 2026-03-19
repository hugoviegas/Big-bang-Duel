import { describe, it, expect } from "vitest";
import {
  calculateProgression,
  calculateMatchRewards,
  clampTrophies,
  LEVEL_CAP,
  LEVEL_XP_THRESHOLDS,
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
