import { describe, it, expect } from "vitest";
import {
  getAchievementDef,
  ACHIEVEMENTS,
  hasCompletedAllAchievements,
} from "./achievements";
import type { AchievementProgress } from "../types";

/**
 * Tests for achievement system: definitions, evaluation
 */

describe("achievements - Achievement definitions", () => {
  it("should have ACHIEVEMENTS array defined", () => {
    expect(ACHIEVEMENTS).toBeDefined();
    expect(Array.isArray(ACHIEVEMENTS)).toBe(true);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  it("should retrieve achievement by ID", () => {
    const levelAchievement = getAchievementDef("level");
    expect(levelAchievement).toBeDefined();
    expect(levelAchievement?.id).toBe("level");
    expect(levelAchievement?.name).toBeDefined();
  });

  it("should return undefined for unknown achievement ID", () => {
    const unknown = getAchievementDef("non_existent_achievement");
    expect(unknown).toBeUndefined();
  });

  it("should have tiers with valid structure", () => {
    const achievement = getAchievementDef("level");
    expect(achievement?.tiers).toBeDefined();
    expect(Array.isArray(achievement?.tiers)).toBe(true);
    expect(achievement?.tiers?.length).toBe(5);

    achievement?.tiers?.forEach((tier) => {
      expect(tier.threshold).toBeGreaterThan(0);
      expect(tier.reward).toBeDefined();
      expect(tier.reward.gold).toBeGreaterThanOrEqual(0);
      expect(tier.label).toBeDefined();
      expect(tier.description).toBeDefined();
    });
  });

  it("should have group property", () => {
    const achievement = getAchievementDef("level");
    expect(achievement?.group).toBeDefined();
    expect([
      "level",
      "discovery",
      "single_match",
      "cumulative",
      "career",
      "online",
    ]).toContain(achievement?.group);
  });
});

describe("achievements - All achievements defined", () => {
  it("should have basic achievement types", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);

    // Check for some expected achievements
    expect(ids.length).toBeGreaterThan(5);
  });

  it("should not have duplicate achievement IDs", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("each achievement should have required fields", () => {
    ACHIEVEMENTS.forEach((achievement) => {
      expect(achievement.id).toBeDefined();
      expect(achievement.name).toBeDefined();
      expect(achievement.icon).toBeDefined();
      expect(achievement.group).toBeDefined();
      expect(achievement.tiers).toBeDefined();
      expect(Array.isArray(achievement.tiers)).toBe(true);
    });
  });
});

describe("achievements - Tier thresholds are progressive", () => {
  it("should have escalating thresholds within a tier", () => {
    ACHIEVEMENTS.forEach((achievement) => {
      const thresholds = achievement.tiers.map((t) => t.threshold);

      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
      }
    });
  });
});

describe("achievements - completion helper", () => {
  it("should return false when progress is empty", () => {
    expect(hasCompletedAllAchievements(undefined)).toBe(false);
  });

  it("should return true when all achievements are maxed", () => {
    const raw: Record<string, AchievementProgress> = {};
    for (const def of ACHIEVEMENTS) {
      raw[def.id] = {
        id: def.id,
        level: def.tiers.length,
        progress: def.tiers[def.tiers.length - 1].threshold,
        claimedLevel: def.tiers.length,
      };
    }

    expect(hasCompletedAllAchievements(raw)).toBe(true);
  });
});
