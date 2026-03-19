import { expect } from "vitest";
import type { User, MatchSummary } from "../../types";

/**
 * Custom test matchers and assertions
 */

/**
 * Validates that a user object has required fields and valid types
 */
export const expectValidUser = (user: User) => {
  expect(user).toBeDefined();
  expect(user.uid).toBeDefined();
  expect(user.displayName).toBeDefined();
  expect(user.playerCode).toBeDefined();
  expect(user.statsByMode).toBeDefined();
  expect(user.statsByMode.overall).toBeDefined();
  expect(user.statsByMode.solo).toBeDefined();
  expect(user.statsByMode.online).toBeDefined();
  expect(user.unlockedCharacters).toEqual(expect.any(Array));
};

/**
 * Validates that stats are normalized (no NaN, negative, or invalid values)
 */
export const expectNormalizedStats = (stats: {
  wins: number;
  losses: number;
  draws: number;
  trophies: number;
  xp: number;
  level: number;
}) => {
  expect(Number.isNaN(stats.wins)).toBe(false);
  expect(Number.isNaN(stats.losses)).toBe(false);
  expect(Number.isNaN(stats.trophies)).toBe(false);
  expect(stats.trophies).toBeGreaterThanOrEqual(0);
  expect(stats.level).toBeGreaterThanOrEqual(1);
  expect(stats.xp).toBeGreaterThanOrEqual(0);
};

/**
 * Validates that match summary has valid data
 */
export const expectValidMatchSummary = (summary: MatchSummary) => {
  expect(summary.matchId).toBeDefined();
  expect(summary.uid).toBeDefined();
  expect(summary.result).toMatch(/^(win|loss|draw)$/);
  expect(summary.damageDealt).toBeGreaterThanOrEqual(0);
  expect(summary.damageTaken).toBeGreaterThanOrEqual(0);
  expect(summary.turnsPlayed).toBeGreaterThan(0);
  expect(summary.dodgeRate).toBeGreaterThanOrEqual(0);
  expect(summary.dodgeRate).toBeLessThanOrEqual(1);
};

/**
 * Validates that leaderboard entry is valid
 */
export const expectValidLeaderboardEntry = (entry: any) => {
  expect(entry.uid).toBeDefined();
  expect(entry.displayName).toBeDefined();
  expect(entry.level).toBeGreaterThanOrEqual(1);
  expect(entry.trophies).toBeGreaterThanOrEqual(0);
  expect(entry.winRate).toBeGreaterThanOrEqual(0);
  expect(entry.winRate).toBeLessThanOrEqual(1);
};

/**
 * Utility: parse and validate a player code
 */
export const expectValidPlayerCode = (code: string) => {
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
};

/**
 * Utility: check that a timestamp is recent (within last N ms)
 */
export const expectRecentTimestamp = (ts: number, withinMs: number = 5000) => {
  const age = Date.now() - ts;
  expect(age).toBeGreaterThanOrEqual(0);
  expect(age).toBeLessThanOrEqual(withinMs);
};
