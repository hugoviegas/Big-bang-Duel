import { describe, it, expect } from "vitest";
import {
  getAchievementDef,
  ACHIEVEMENTS,
  hasCompletedAllAchievements,
  evaluateAchievements,
} from "./achievements";
import type { AchievementProgress, MatchSummary, PlayerProfile } from "../types";

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

function createBaseProfile(
  overrides: Partial<PlayerProfile> = {},
): PlayerProfile {
  return {
    uid: "test-uid",
    displayName: "Test User",
    playerCode: "#A1B2C3D4",
    avatar: "marshal",
    wins: 0,
    losses: 0,
    draws: 0,
    totalGames: 0,
    winRate: 0,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    onlineStatus: "offline",
    statsByMode: {
      solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
      online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
      overall: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
    },
    progression: {
      level: 1,
      levelCap: 50,
      xpTotal: 0,
      xpCurrentLevel: 0,
      xpForCurrentLevel: 100,
      xpForNextLevel: 150,
      xpToNextLevel: 150,
    },
    ranked: { trophies: 0, trophyPeak: 0 },
    achievements: {},
    characterStats: {
      marshal: {
        partidas: 0,
        vitorias: 0,
        derrotas: 0,
        tirosDisparados: 0,
        recargas: 0,
        desvios: 0,
        contraGolpes: 0,
        tirosDuplos: 0,
      },
    },
    winStreak: 0,
    opponentsFaced: [],
    onlinePlayersDefeated: [],
    perfectWins: 0,
    highLifeWins: 0,
    ...overrides,
  };
}

function createBaseMatch(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: "match-test",
    uid: "test-uid",
    opponentUid: "opponent-1",
    characterId: "marshal",
    opponentCharacterId: "skull",
    mode: "online",
    result: "win",
    turns: 10,
    shots: 5,
    doubleShots: 0,
    dodges: 0,
    reloads: 0,
    counters: 0,
    successfulDodges: 0,
    successfulCounters: 0,
    damageTaken: 1,
    damageDealt: 3,
    remainingLife: 2,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("achievements - first tier unlock for each achievement", () => {
  const scenarios: Record<
    string,
    {
      profile?: Partial<PlayerProfile>;
      match?: Partial<MatchSummary>;
    }
  > = {
    level: {
      profile: {
        progression: {
          level: 2,
          levelCap: 50,
          xpTotal: 200,
          xpCurrentLevel: 0,
          xpForCurrentLevel: 100,
          xpForNextLevel: 150,
          xpToNextLevel: 150,
        },
      },
    },
    discovery: {
      profile: { opponentsFaced: ["marshal", "skull", "norris"] },
    },
    single_dodges: { match: { successfulDodges: 3 } },
    perfect_win: { profile: { perfectWins: 1 } },
    total_dodges: {
      profile: {
        characterStats: {
          marshal: {
            partidas: 0,
            vitorias: 0,
            derrotas: 0,
            tirosDisparados: 0,
            recargas: 0,
            desvios: 5,
            contraGolpes: 0,
            tirosDuplos: 0,
          },
        },
      },
    },
    total_counters: {
      profile: {
        characterStats: {
          marshal: {
            partidas: 0,
            vitorias: 0,
            derrotas: 0,
            tirosDisparados: 0,
            recargas: 0,
            desvios: 0,
            contraGolpes: 5,
            tirosDuplos: 0,
          },
        },
      },
    },
    total_wins: {
      profile: {
        statsByMode: {
          solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          overall: { wins: 3, losses: 0, draws: 0, totalGames: 3, winRate: 100 },
        },
      },
    },
    total_matches: {
      profile: {
        statsByMode: {
          solo: { wins: 2, losses: 2, draws: 1, totalGames: 5, winRate: 40 },
          online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          overall: { wins: 2, losses: 2, draws: 1, totalGames: 5, winRate: 40 },
        },
      },
    },
    total_shots: {
      profile: {
        characterStats: {
          marshal: {
            partidas: 0,
            vitorias: 0,
            derrotas: 0,
            tirosDisparados: 20,
            recargas: 0,
            desvios: 0,
            contraGolpes: 0,
            tirosDuplos: 0,
          },
        },
      },
    },
    total_reloads: {
      profile: {
        characterStats: {
          marshal: {
            partidas: 0,
            vitorias: 0,
            derrotas: 0,
            tirosDisparados: 0,
            recargas: 15,
            desvios: 0,
            contraGolpes: 0,
            tirosDuplos: 0,
          },
        },
      },
    },
    total_double_shots: {
      profile: {
        characterStats: {
          marshal: {
            partidas: 0,
            vitorias: 0,
            derrotas: 0,
            tirosDisparados: 0,
            recargas: 0,
            desvios: 0,
            contraGolpes: 0,
            tirosDuplos: 6,
          },
        },
      },
    },
    win_streak: { profile: { winStreak: 2 } },
    online_matches: {
      profile: {
        statsByMode: {
          solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          online: { wins: 2, losses: 1, draws: 0, totalGames: 3, winRate: 66.7 },
          overall: { wins: 2, losses: 1, draws: 0, totalGames: 3, winRate: 66.7 },
        },
      },
    },
    trophies: { profile: { ranked: { trophies: 50, trophyPeak: 50 } } },
    character_mastery: {
      profile: {
        characterStats: {
          marshal: {
            partidas: 5,
            vitorias: 0,
            derrotas: 0,
            tirosDisparados: 0,
            recargas: 0,
            desvios: 0,
            contraGolpes: 0,
            tirosDuplos: 0,
          },
        },
      },
    },
    high_life_wins: { profile: { highLifeWins: 3 } },
    online_rivals: {
      profile: { onlinePlayersDefeated: ["uid-op-1", "uid-op-2"] },
    },
  };

  for (const def of ACHIEVEMENTS) {
    it(`should unlock tier 1 for ${def.id}`, () => {
      const scenario = scenarios[def.id];
      expect(scenario).toBeDefined();

      const profile = createBaseProfile(scenario?.profile);
      const match = createBaseMatch(scenario?.match);

      const result = evaluateAchievements(profile, match);
      expect(result.updatedProgress[def.id].level).toBeGreaterThanOrEqual(1);
    });
  }
});

describe("achievements - online_rivals uniqueness", () => {
  it("counts only unique opponent UIDs", () => {
    const duplicateProfile = createBaseProfile({
      onlinePlayersDefeated: ["enemy-a", "enemy-a"],
    });
    const duplicateResult = evaluateAchievements(duplicateProfile, createBaseMatch());
    expect(duplicateResult.updatedProgress.online_rivals.level).toBe(0);

    const uniqueProfile = createBaseProfile({
      onlinePlayersDefeated: ["enemy-a", "enemy-b"],
    });
    const uniqueResult = evaluateAchievements(uniqueProfile, createBaseMatch());
    expect(uniqueResult.updatedProgress.online_rivals.level).toBeGreaterThanOrEqual(1);
  });
});
