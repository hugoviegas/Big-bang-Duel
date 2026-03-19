import { describe, it, expect } from "vitest";
import {
  calculateLevelFromXP,
  getRewardForLevel,
  calculateXPToNextLevel,
  calculateProgression,
  clampTrophies,
} from "./progression";

/**
 * Tests for progression system: XP, levels, rewards, and trophy boundaries
 */

describe("progression - XP to Level conversion", () => {
  it("should start at level 1 with 0 XP", () => {
    const level = calculateLevelFromXP(0);
    expect(level).toBe(1);
  });

  it("should progress through levels at correct XP thresholds", () => {
    expect(calculateLevelFromXP(0)).toBe(1);
    expect(calculateLevelFromXP(99)).toBe(1);
    expect(calculateLevelFromXP(100)).toBe(2);
    expect(calculateLevelFromXP(299)).toBe(2);
    expect(calculateLevelFromXP(300)).toBe(3);
    // Assuming exponential or linear growth pattern
  });

  it("should handle very high XP values", () => {
    const highXP = 1000000;
    const level = calculateLevelFromXP(highXP);
    expect(level).toBeGreaterThan(0);
    expect(Number.isNaN(level)).toBe(false);
  });

  it("should be monotonic (higher XP = higher or equal level)", () => {
    const xpValues = [0, 50, 100, 200, 500, 1000, 5000];
    const levels = xpValues.map(calculateLevelFromXP);

    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });
});

describe("progression - Level rewards", () => {
  it("should return valid reward structure", () => {
    const reward = getRewardForLevel(1);

    expect(reward).toBeDefined();
    expect(reward.gold).toBeGreaterThanOrEqual(0);
    expect(reward.gems).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(reward.gold)).toBe(false);
    expect(Number.isNaN(reward.gems)).toBe(false);
  });

  it("should increase rewards for higher levels", () => {
    const reward1 = getRewardForLevel(1);
    const reward5 = getRewardForLevel(5);
    const reward10 = getRewardForLevel(10);

    // Higher level should typically get more reward
    expect(reward5.gold).toBeGreaterThanOrEqual(reward1.gold);
    expect(reward10.gold).toBeGreaterThanOrEqual(reward5.gold);
  });

  it("should handle level cap gracefully", () => {
    const maxLevel = 100;
    const reward = getRewardForLevel(maxLevel);

    expect(reward.gold).toBeGreaterThanOrEqual(0);
    expect(reward.gems).toBeGreaterThanOrEqual(0);
  });
});

describe("progression - XP to next level", () => {
  it("should return positive XP required", () => {
    const xpNeeded = calculateXPToNextLevel(1);
    expect(xpNeeded).toBeGreaterThan(0);
  });

  it("should increase for higher levels", () => {
    const xp1 = calculateXPToNextLevel(1);
    const xp5 = calculateXPToNextLevel(5);
    const xp10 = calculateXPToNextLevel(10);

    // Higher level should require more XP to next level
    expect(xp5).toBeGreaterThanOrEqual(xp1);
    expect(xp10).toBeGreaterThanOrEqual(xp5);
  });

  it("should handle max level gracefully", () => {
    const xpNeeded = calculateXPToNextLevel(99);
    expect(xpNeeded).toBeGreaterThanOrEqual(0);
  });
});

describe("progression - Full progression calculation", () => {
  it("should calculate progression from win correctly", () => {
    const progression = calculateProgression({
      result: "win",
      mode: "online",
      difficulty: "normal",
      currentXP: 0,
      currentLevel: 1,
      currentTrophies: 100,
      turnsPlayed: 5,
    });

    expect(progression.xpGained).toBeGreaterThan(0);
    expect(progression.trophiesGained).toBeGreaterThan(0);
    expect(progression.goldReward).toBeGreaterThanOrEqual(0);
  });

  it("should calculate progression from loss correctly", () => {
    const progression = calculateProgression({
      result: "loss",
      mode: "online",
      difficulty: "normal",
      currentXP: 100,
      currentLevel: 2,
      currentTrophies: 150,
      turnsPlayed: 8,
    });

    // Loss should still give some reward, but less than win
    expect(progression.xpGained).toBeGreaterThanOrEqual(0);
    expect(progression.trophiesGained).toBeGreaterThanOrEqual(-50); // May lose trophies
  });

  it("should calculate progression from draw correctly", () => {
    const progression = calculateProgression({
      result: "draw",
      mode: "solo",
      difficulty: "advanced",
      currentXP: 50,
      currentLevel: 1,
      currentTrophies: 120,
      turnsPlayed: 10,
    });

    expect(progression.xpGained).toBeGreaterThanOrEqual(0);
  });

  it("should give solo mode less trophy reward than online", () => {
    const soloProgression = calculateProgression({
      result: "win",
      mode: "solo",
      difficulty: "advanced",
      currentXP: 0,
      currentLevel: 1,
      currentTrophies: 100,
      turnsPlayed: 5,
    });

    const onlineProgression = calculateProgression({
      result: "win",
      mode: "online",
      difficulty: "advanced",
      currentXP: 0,
      currentLevel: 1,
      currentTrophies: 100,
      turnsPlayed: 5,
    });

    expect(onlineProgression.trophiesGained).toBeGreaterThanOrEqual(
      soloProgression.trophiesGained,
    );
  });

  it("should give difficulty bonus correctly", () => {
    const easyProgression = calculateProgression({
      result: "win",
      mode: "solo",
      difficulty: "beginner",
      currentXP: 0,
      currentLevel: 1,
      currentTrophies: 100,
      turnsPlayed: 5,
    });

    const hardProgression = calculateProgression({
      result: "win",
      mode: "solo",
      difficulty: "advanced",
      currentXP: 0,
      currentLevel: 1,
      currentTrophies: 100,
      turnsPlayed: 5,
    });

    // Advanced should reward more than beginner
    expect(hardProgression.xpGained).toBeGreaterThan(easyProgression.xpGained);
  });
});

describe("progression - Trophy clamping", () => {
  it("should clamp trophies to minimum 0", () => {
    const clamped = clampTrophies(-100);
    expect(clamped).toBe(0);
  });

  it("should not clamp positive values below cap", () => {
    const clamped = clampTrophies(500);
    expect(clamped).toBe(500);
  });

  it("should clamp trophies to maximum if exceeding cap", () => {
    const maxCap = 9999;
    const clamped = clampTrophies(maxCap + 1000);
    expect(clamped).toBeLessThanOrEqual(maxCap);
  });

  it("should preserve values in valid range", () => {
    const value = 1000;
    const clamped = clampTrophies(value);
    expect(clamped).toBe(value);
  });
});
