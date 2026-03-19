import { describe, it, expect } from "vitest";
import {
  evaluateAchievements,
  checkAchievementCondition,
  getAchievementById,
} from "./achievements";
import type { User, Achievement } from "../types";

/**
 * Tests for achievement unlock conditions and claim validation
 */

describe("achievements - Condition evaluation", () => {
  it("should evaluate 'first_win' condition correctly", () => {
    const userNoWin: Partial<User> = {
      statsByMode: {
        solo: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
      },
    };

    const userWithWin: Partial<User> = {
      statsByMode: {
        solo: { wins: 1, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: { wins: 1, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
      },
    };

    expect(checkAchievementCondition("first_win", userNoWin as User)).toBe(
      false,
    );
    expect(checkAchievementCondition("first_win", userWithWin as User)).toBe(
      true,
    );
  });

  it("should evaluate 'win_20_matches' condition correctly", () => {
    const user10Wins: Partial<User> = {
      statsByMode: {
        solo: { wins: 6, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        online: { wins: 4, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: {
          wins: 10,
          losses: 0,
          draws: 0,
          trophies: 0,
          xp: 0,
          level: 1,
        },
      },
    };

    const user20Wins: Partial<User> = {
      statsByMode: {
        solo: { wins: 12, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        online: { wins: 8, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: {
          wins: 20,
          losses: 0,
          draws: 0,
          trophies: 0,
          xp: 0,
          level: 1,
        },
      },
    };

    expect(
      checkAchievementCondition("win_20_matches", user10Wins as User),
    ).toBe(false);
    expect(
      checkAchievementCondition("win_20_matches", user20Wins as User),
    ).toBe(true);
  });

  it("should evaluate 'level_5' condition correctly", () => {
    const userLevel3: Partial<User> = {
      statsByMode: {
        solo: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 3 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 2 },
        overall: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 3 },
      },
    };

    const userLevel5: Partial<User> = {
      statsByMode: {
        solo: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 5 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 4 },
        overall: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 5 },
      },
    };

    expect(checkAchievementCondition("level_5", userLevel3 as User)).toBe(
      false,
    );
    expect(checkAchievementCondition("level_5", userLevel5 as User)).toBe(true);
  });

  it("should evaluate 'trophy_500' condition correctly", () => {
    const user100Trophy: Partial<User> = {
      statsByMode: {
        solo: { wins: 0, losses: 0, draws: 0, trophies: 100, xp: 0, level: 1 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: {
          wins: 0,
          losses: 0,
          draws: 0,
          trophies: 100,
          xp: 0,
          level: 1,
        },
      },
    };

    const user500Trophy: Partial<User> = {
      statsByMode: {
        solo: { wins: 0, losses: 0, draws: 0, trophies: 300, xp: 0, level: 1 },
        online: {
          wins: 0,
          losses: 0,
          draws: 0,
          trophies: 200,
          xp: 0,
          level: 1,
        },
        overall: {
          wins: 0,
          losses: 0,
          draws: 0,
          trophies: 500,
          xp: 0,
          level: 1,
        },
      },
    };

    expect(checkAchievementCondition("trophy_500", user100Trophy as User)).toBe(
      false,
    );
    expect(checkAchievementCondition("trophy_500", user500Trophy as User)).toBe(
      true,
    );
  });
});

describe("achievements - Achievement retrieval", () => {
  it("should retrieve known achievements", () => {
    const achievement = getAchievementById("first_win");

    expect(achievement).toBeDefined();
    expect(achievement?.id).toBe("first_win");
    expect(achievement?.name).toBeDefined();
    expect(achievement?.reward).toBeDefined();
  });

  it("should return undefined for unknown achievement", () => {
    const achievement = getAchievementById("nonexistent_achievement");
    expect(achievement).toBeUndefined();
  });

  it("should have valid reward structure", () => {
    const achievement = getAchievementById("first_win");

    expect(achievement?.reward).toBeDefined();
    expect(achievement?.reward?.gold).toBeGreaterThanOrEqual(0);
    expect(achievement?.reward?.gems).toBeGreaterThanOrEqual(0);
  });
});

describe("achievements - Evaluation from match result", () => {
  it("should evaluate all new achievements after a win", () => {
    const user: User = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Tester",
      playerCode: "TEST01",
      selectedCharacter: "pano",
      avatar: "",
      statsByMode: {
        solo: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
      },
      unlockedCharacters: ["pano"],
      gold: 0,
      gems: 0,
      achievements: [],
      claimedRewards: [],
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    // Simulate first win
    const unlocked = evaluateAchievements({
      ...user,
      statsByMode: {
        solo: { wins: 1, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: { wins: 1, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
      },
    });

    // Should unlock at least first_win
    expect(unlocked.length).toBeGreaterThan(0);
    expect(unlocked.some((a) => a.id === "first_win")).toBe(true);
  });

  it("should not double-unlock achievements", () => {
    const user: User = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Tester",
      playerCode: "TEST01",
      selectedCharacter: "pano",
      avatar: "",
      statsByMode: {
        solo: { wins: 5, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
        overall: { wins: 5, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
      },
      unlockedCharacters: ["pano"],
      gold: 0,
      gems: 0,
      achievements: [
        {
          id: "first_win",
          name: "First Victory",
          description: "Win your first match",
          unlockedAt: Date.now(),
          reward: { gold: 50, gems: 0 },
          category: "milestone",
          rarity: "common",
        },
      ],
      claimedRewards: [],
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    const unlocked = evaluateAchievements(user);

    // first_win already exists, so should NOT be in unlocked list again
    expect(unlocked.some((a) => a.id === "first_win")).toBe(false);
  });

  it("should evaluate multiple achievements at once", () => {
    const user: User = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Tester",
      playerCode: "TEST01",
      selectedCharacter: "pano",
      avatar: "",
      statsByMode: {
        solo: { wins: 25, losses: 0, draws: 0, trophies: 0, xp: 0, level: 10 },
        online: {
          wins: 0,
          losses: 0,
          draws: 0,
          trophies: 500,
          xp: 0,
          level: 1,
        },
        overall: {
          wins: 25,
          losses: 0,
          draws: 0,
          trophies: 500,
          xp: 0,
          level: 10,
        },
      },
      unlockedCharacters: ["pano"],
      gold: 0,
      gems: 0,
      achievements: [],
      claimedRewards: [],
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    const unlocked = evaluateAchievements(user);

    // Should unlock multiple: first_win, level_5, level_10, trophy_500, win_20_matches
    expect(unlocked.length).toBeGreaterThanOrEqual(2);
  });
});
