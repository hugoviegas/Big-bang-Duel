/**
 * Firebase service layer – handles all Firestore/RTDB operations
 * for profiles, leaderboard, friends, and stats.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, onValue, off, set } from "firebase/database";
import { auth, db, rtdb } from "./firebase";
import type {
  PlayerProfile,
  LeaderboardEntry,
  FriendRequest,
  Friend,
  OnlineStatus,
  PlayerCode,
  StatsByMode,
  ModeStats,
  MatchMode,
  ProgressionState,
  Currencies,
  RankedStats,
  Unlocks,
  TurnResult,
  CharacterStats,
  MatchSummary,
  ClassMasteryProgress,
  CharacterClass,
} from "../types";
import {
  evaluateAchievements,
  hasCompletedAllAchievements,
  type EvaluationResult,
} from "./achievements";
import {
  calculateProgression,
  calculateMatchRewards,
  normalizeCurrencies,
  normalizeRanked,
  normalizeUnlocks,
  normalizeClassMastery,
  getClassMasteryUpgradeCost,
  getMostPlayedClass,
  getLevelUpRewards,
  applyLevelRewards,
  clampTrophies,
  resolveCharacterUnlockStatus,
  awardClassMasteryPoint,
  type MatchRewardSummary,
} from "./progression";
import { getCharacterClass } from "./characters";

// ─── In-Memory TTL Cache ────────────────────────────────────────────────────
// Prevents redundant Firestore reads within a single session.
// Firestore offline persistence (IndexedDB) handles cross-session caching;
// this layer avoids even the IndexedDB round-trip for hot-path reads.

const _cache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheGet<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown, ttlMs: number): void {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Remove keys with `undefined` values from a shallow object to make it Firestore-safe. */
function stripUndefinedShallow<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as Array<keyof T>) {
    const v = obj[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function invalidateCache(key: string): void {
  _cache.delete(key);
}

// ─── Player Code Generation ──────────────────────────────────────────────────

/** Generates a random 8-char hex string with uppercase letters and digits. */
function generateRandomHex(): string {
  const chars = "0123456789ABCDEF";
  let result = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    result += chars[array[i] % 16];
  }
  return result;
}

/** Generates a unique player code (#XXXXXXXX). */
export async function generateUniquePlayerCode(): Promise<PlayerCode> {
  const code = `#${generateRandomHex()}`;
  return code;
}

// ─── Profile CRUD ────────────────────────────────────────────────────────────

/** Creates or overwrites a player profile in Firestore. */
export async function createPlayerProfile(
  profile: PlayerProfile,
): Promise<void> {
  const normalized = profileWithNormalizedStats(profile);
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (true) {
    try {
      attempt++;
      // Strip undefined values (Firestore rejects `undefined` fields)
      const payload = stripUndefinedShallow({
        ...normalized,
        createdAt: profile.createdAt || Date.now(),
        lastSeen: Date.now(),
      });
      await setDoc(
        doc(db, "players", profile.uid),
        payload as Record<string, unknown>,
      );
      await upsertLeaderboardEntry(normalized);
      // Populate cache immediately so the next read is instant
      cacheSet(`profile:${profile.uid}`, normalized, 5 * 60_000);
      console.log("\u2713 Player profile created:", profile.uid);
      return;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `\u26a0\ufe0f createPlayerProfile attempt ${attempt} failed: ${errMsg}`,
      );
      // Retry on transient errors
      if (attempt >= MAX_RETRIES) {
        console.error(
          `\u26a0\ufe0f createPlayerProfile: giving up after ${attempt} attempts`,
          error,
        );
        throw error;
      }
      // small backoff
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

async function ensurePlayerProfileForMatch(uid: string): Promise<void> {
  const existing = await getDoc(doc(db, "players", uid));
  if (existing.exists()) return;

  const authUser = auth.currentUser;
  const fallbackProfile: PlayerProfile = {
    uid,
    displayName: authUser?.displayName?.trim() || "Pistoleiro",
    playerCode: await generateUniquePlayerCode(),
    avatar: "marshal",
    wins: 0,
    losses: 0,
    draws: 0,
    totalGames: 0,
    winRate: 0,
    statsByMode: {
      solo: createEmptyModeStats(),
      online: createEmptyModeStats(),
      overall: createEmptyModeStats(),
    },
    progression: calculateProgression(0),
    currencies: normalizeCurrencies(undefined),
    ranked: normalizeRanked(undefined),
    unlocks: normalizeUnlocks(undefined),
    classMastery: normalizeClassMastery(undefined),
    characterStats: {},
    achievements: {},
    // omit favoriteCharacter when unknown to avoid Firestore `undefined` errors
    winStreak: 0,
    perfectWins: 0,
    highLifeWins: 0,
    opponentsFaced: [],
    onlinePlayersDefeated: [],
    createdAt: Date.now(),
    lastSeen: Date.now(),
    onlineStatus: "online",
  };

  await createPlayerProfile(fallbackProfile);
}

/** Fetches a player profile by UID. Returns null if not found. */
export async function getPlayerProfile(
  uid: string,
): Promise<PlayerProfile | null> {
  const key = `profile:${uid}`;
  const cached = cacheGet<PlayerProfile>(key);
  if (cached) return cached;

  const snap = await getDoc(doc(db, "players", uid));
  const result = snap.exists()
    ? profileWithNormalizedStats(snap.data() as PlayerProfile)
    : null;
  if (result) {
    cacheSet(key, result, 5 * 60_000); // cache for 5 minutes
    // Bootstrap leaderboard doc for legacy users that only have players/{uid}.
    upsertLeaderboardEntry(result).catch(() => {});
  }
  return result;
}

/** Partial update of a player profile. */
export async function updatePlayerProfile(
  uid: string,
  data: Partial<PlayerProfile>,
): Promise<void> {
  // Strip undefined fields from the partial update to avoid Firestore errors
  const payload = stripUndefinedShallow({ ...data, lastSeen: Date.now() });
  await updateDoc(doc(db, "players", uid), payload as Record<string, unknown>);
  invalidateCache(`profile:${uid}`);
  const latest = await getPlayerProfile(uid);
  if (latest) {
    await upsertLeaderboardEntry(latest);
  }
}

/** Look up a player by their unique code (#XXXXXXXX). */
export async function findPlayerByCode(
  code: string,
): Promise<PlayerProfile | null> {
  const snap = await getDocs(
    query(collection(db, "players"), where("playerCode", "==", code), limit(1)),
  );
  if (snap.empty) return null;
  return snap.docs[0].data() as PlayerProfile;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export type MatchResult = "win" | "loss" | "draw";

/** Context passed from GameOver so recordMatchResult can build MatchSummary & update achievements. */
export interface MatchContext {
  history: TurnResult[];
  playerCharacterId: string;
  opponentCharacterId: string;
  opponentUid?: string;
  remainingLife: number;
}

export interface MatchResultUpdate {
  result: MatchResult;
  mode: MatchMode;
  rewards: MatchRewardSummary;
  progression: ProgressionState;
  currencies: Currencies;
  ranked: RankedStats;
  unlocks: Unlocks;
  classMastery: ClassMasteryProgress;
  levelRewards: Array<{
    level: number;
    gold: number;
    unlockedCharacterId?: string;
  }>;
  achievementEval?: EvaluationResult;
}

function createEmptyModeStats(): ModeStats {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    totalGames: 0,
    winRate: 0,
  };
}

function recalcWinRate(stats: ModeStats): ModeStats {
  const winRate =
    stats.totalGames > 0
      ? Math.round((stats.wins / stats.totalGames) * 1000) / 10
      : 0;
  return { ...stats, winRate };
}

function normalizeStatsByMode(profile: PlayerProfile): StatsByMode {
  const legacyOverall: ModeStats = {
    wins: profile.wins ?? 0,
    losses: profile.losses ?? 0,
    draws: profile.draws ?? 0,
    totalGames: profile.totalGames ?? 0,
    winRate: profile.winRate ?? 0,
  };

  const fromDoc = profile.statsByMode;
  const solo = recalcWinRate({
    ...createEmptyModeStats(),
    ...(fromDoc?.solo ?? {}),
  });
  const online = recalcWinRate({
    ...createEmptyModeStats(),
    ...(fromDoc?.online ?? {}),
  });

  const hasSplitData =
    solo.totalGames > 0 || online.totalGames > 0 || !!fromDoc?.overall;
  const overall = hasSplitData
    ? recalcWinRate({
        wins: solo.wins + online.wins,
        losses: solo.losses + online.losses,
        draws: solo.draws + online.draws,
        totalGames: solo.totalGames + online.totalGames,
        winRate: 0,
      })
    : recalcWinRate(legacyOverall);

  return { solo, online, overall };
}

function profileWithNormalizedStats(profile: PlayerProfile): PlayerProfile {
  const statsByMode = normalizeStatsByMode(profile);
  const progression = calculateProgression(profile.progression?.xpTotal ?? 0);
  const currencies = normalizeCurrencies(profile.currencies);
  const ranked = normalizeRanked(profile.ranked);
  const unlocks = normalizeUnlocks(profile.unlocks);
  const classMastery = normalizeClassMastery(profile.classMastery);
  const favoriteClass =
    profile.favoriteClass ??
    getMostPlayedClass(classMastery, getCharacterClass(profile.avatar));

  return {
    ...profile,
    statsByMode,
    progression,
    currencies,
    ranked,
    unlocks,
    classMastery,
    wins: statsByMode.overall.wins,
    losses: statsByMode.overall.losses,
    draws: statsByMode.overall.draws,
    totalGames: statsByMode.overall.totalGames,
    winRate: statsByMode.overall.winRate,
    // Ensure characterStats exists (initialize empty if not present)
    characterStats: profile.characterStats ?? {},
    // Ensure achievements exists
    achievements: profile.achievements ?? {},
    // Ensure favoriteCharacter is present
    favoriteCharacter: profile.favoriteCharacter ?? undefined,
    favoriteClass,
    // Ensure other stat fields are present
    winStreak: profile.winStreak ?? 0,
    perfectWins: profile.perfectWins ?? 0,
    highLifeWins: profile.highLifeWins ?? 0,
    opponentsFaced: profile.opponentsFaced ?? [],
    onlinePlayersDefeated: profile.onlinePlayersDefeated ?? [],
  };
}

// ─── Private Solo Match Snapshot (users/{uid}) ─────────────────────────────

export async function savePrivateSoloMatch(
  uid: string,
  snapshot: Record<string, unknown>,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      activeSoloMatch: snapshot,
      activeSoloMatchUpdatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function getPrivateSoloMatch(
  uid: string,
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return (data.activeSoloMatch as Record<string, unknown> | undefined) ?? null;
}

export async function clearPrivateSoloMatch(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    activeSoloMatch: deleteField(),
    activeSoloMatchUpdatedAt: deleteField(),
  });
}

async function upsertLeaderboardEntry(profile: PlayerProfile): Promise<void> {
  const p = profileWithNormalizedStats(profile);
  await setDoc(
    doc(db, "leaderboard", p.uid),
    {
      uid: p.uid,
      displayName: p.displayName,
      playerCode: p.playerCode,
      avatar: p.avatar,
      ...(p.avatarPicture !== undefined && { avatarPicture: p.avatarPicture }),
      statsByMode: p.statsByMode,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      totalGames: p.totalGames,
      winRate: p.winRate,
      trophies: p.ranked?.trophies ?? 0,
      lastSeen: Date.now(),
    },
    { merge: true },
  );
}

/** Records a match result: increments wins/losses/draws + totalGames, recalculates winRate,
 *  updates characterStats and evaluates achievements. */
export async function recordMatchResult(
  uid: string,
  result: MatchResult,
  mode: MatchMode = "solo",
  rewardOverride?: MatchRewardSummary,
  matchCtx?: MatchContext,
): Promise<MatchResultUpdate | null> {
  const playerRef = doc(db, "players", uid);
  let snap = await getDoc(playerRef);
  if (!snap.exists()) {
    await ensurePlayerProfileForMatch(uid);
    snap = await getDoc(playerRef);
    if (!snap.exists()) {
      throw new Error(
        `Profile for uid ${uid} was not found and could not be created.`,
      );
    }
  }

  const data = profileWithNormalizedStats(snap.data() as PlayerProfile);
  const modeStats = data.statsByMode![mode];
  const nextModeStats = recalcWinRate({
    wins: modeStats.wins + (result === "win" ? 1 : 0),
    losses: modeStats.losses + (result === "loss" ? 1 : 0),
    draws: modeStats.draws + (result === "draw" ? 1 : 0),
    totalGames: modeStats.totalGames + 1,
    winRate: 0,
  });

  const nextSolo = mode === "solo" ? nextModeStats : data.statsByMode!.solo;
  const nextOnline =
    mode === "online" ? nextModeStats : data.statsByMode!.online;
  const nextOverall = recalcWinRate({
    wins: nextSolo.wins + nextOnline.wins,
    losses: nextSolo.losses + nextOnline.losses,
    draws: nextSolo.draws + nextOnline.draws,
    totalGames: nextSolo.totalGames + nextOnline.totalGames,
    winRate: 0,
  });

  const statsByMode: StatsByMode = {
    solo: nextSolo,
    online: nextOnline,
    overall: nextOverall,
  };

  const currentProgression = calculateProgression(
    data.progression?.xpTotal ?? 0,
  );
  const rewards = rewardOverride ?? calculateMatchRewards(mode, result);

  const nextProgression = calculateProgression(
    (data.progression?.xpTotal ?? 0) + rewards.xpGained,
  );

  const baseCurrencies = normalizeCurrencies(data.currencies);
  baseCurrencies.gold += rewards.goldGained;
  baseCurrencies.ruby += rewards.rubyGained;

  const baseUnlocks = normalizeUnlocks(data.unlocks);
  const levelRewards = getLevelUpRewards(
    currentProgression.level,
    nextProgression.level,
    baseUnlocks,
  );
  const afterLevelRewards = applyLevelRewards(
    baseUnlocks,
    baseCurrencies,
    levelRewards,
  );

  const baseRanked = normalizeRanked(data.ranked);
  const nextTrophies =
    mode === "online"
      ? clampTrophies(baseRanked.trophies + rewards.trophyDelta)
      : baseRanked.trophies;
  const ranked: RankedStats = {
    trophies: nextTrophies,
    trophyPeak: Math.max(baseRanked.trophyPeak, nextTrophies),
  };

  // ── Character stats & achievements (only when match context provided) ──
  let matchSummary: MatchSummary | undefined;
  let achievementEval: EvaluationResult | undefined;
  let classMastery = normalizeClassMastery(data.classMastery);
  const updatedCharacterStats = { ...(data.characterStats ?? {}) };

  // Award mastery point for the character's class after each match
  if (matchCtx) {
    const charClass = getCharacterClass(matchCtx.playerCharacterId);
    classMastery = awardClassMasteryPoint(classMastery, charClass, 1);
  }
  let winStreak = data.winStreak ?? 0;
  const opponentsFaced = [...(data.opponentsFaced ?? [])];
  const onlinePlayersDefeated = [...(data.onlinePlayersDefeated ?? [])];
  let perfectWins = data.perfectWins ?? 0;
  let highLifeWins = data.highLifeWins ?? 0;
  let favoriteCharacter = data.favoriteCharacter;
  let favoriteClass =
    data.favoriteClass ??
    getMostPlayedClass(classMastery, getCharacterClass(data.avatar));

  if (matchCtx) {
    const h = matchCtx.history;
    const shots = h.filter((t) => t.playerCard === "shot").length;
    const doubleShots = h.filter((t) => t.playerCard === "double_shot").length;
    const dodges = h.filter((t) => t.playerCard === "dodge").length;
    const reloads = h.filter((t) => t.playerCard === "reload").length;
    const counters = h.filter((t) => t.playerCard === "counter").length;
    const successfulDodges = h.filter(
      (t) =>
        t.playerCard === "dodge" &&
        (t.opponentCard === "shot" || t.opponentCard === "double_shot"),
    ).length;
    const successfulCounters = h.filter(
      (t) =>
        t.playerCard === "counter" &&
        (t.opponentCard === "shot" || t.opponentCard === "double_shot"),
    ).length;
    const damageTaken = h.reduce((s, t) => s + t.playerLifeLost, 0);
    const damageDealt = h.reduce((s, t) => s + t.opponentLifeLost, 0);

    matchSummary = {
      matchId: `${uid}_${Date.now()}`,
      uid,
      opponentUid: matchCtx.opponentUid,
      characterId: matchCtx.playerCharacterId,
      opponentCharacterId: matchCtx.opponentCharacterId,
      mode,
      result,
      turns: h.length,
      shots,
      doubleShots,
      dodges,
      reloads,
      counters,
      successfulDodges,
      successfulCounters,
      damageTaken,
      damageDealt,
      remainingLife: matchCtx.remainingLife,
      timestamp: Date.now(),
    };

    // Update per-character stats
    const charId = matchCtx.playerCharacterId;
    const prev: CharacterStats = updatedCharacterStats[charId] ?? {
      partidas: 0,
      vitorias: 0,
      derrotas: 0,
      tirosDisparados: 0,
      recargas: 0,
      desvios: 0,
      contraGolpes: 0,
      tirosDuplos: 0,
    };
    updatedCharacterStats[charId] = {
      partidas: prev.partidas + 1,
      vitorias: prev.vitorias + (result === "win" ? 1 : 0),
      derrotas: prev.derrotas + (result === "loss" ? 1 : 0),
      tirosDisparados: prev.tirosDisparados + shots,
      recargas: prev.recargas + reloads,
      desvios: prev.desvios + successfulDodges,
      contraGolpes: prev.contraGolpes + successfulCounters,
      tirosDuplos: (prev.tirosDuplos ?? 0) + doubleShots,
    };

    // Win streak
    if (result === "win") {
      winStreak += 1;
    } else {
      winStreak = 0;
    }

    // Opponents faced (character discovery)
    if (!opponentsFaced.includes(matchCtx.opponentCharacterId)) {
      opponentsFaced.push(matchCtx.opponentCharacterId);
    }

    // Online players defeated (unique)
    if (
      mode === "online" &&
      result === "win" &&
      matchCtx.opponentUid &&
      !onlinePlayersDefeated.includes(matchCtx.opponentUid)
    ) {
      onlinePlayersDefeated.push(matchCtx.opponentUid);
    }

    // Perfect wins (no damage taken)
    if (result === "win" && damageTaken === 0) {
      perfectWins += 1;
    }

    // High life wins (2+ remaining life)
    if (result === "win" && matchCtx.remainingLife >= 2) {
      highLifeWins += 1;
    }

    // Favorite character = one with most matches
    let maxMatches = 0;
    for (const [cid, cs] of Object.entries(updatedCharacterStats)) {
      if (cs.partidas > maxMatches) {
        maxMatches = cs.partidas;
        favoriteCharacter = cid;
      }
    }
    favoriteClass = getMostPlayedClass(
      classMastery,
      getCharacterClass(data.avatar),
    );

    // Evaluate achievements
    const profileForEval: PlayerProfile = {
      ...data,
      statsByMode,
      progression: nextProgression,
      currencies: afterLevelRewards.currencies,
      ranked,
      unlocks: afterLevelRewards.unlocks,
      classMastery,
      characterStats: updatedCharacterStats,
      winStreak,
      opponentsFaced,
      onlinePlayersDefeated,
      perfectWins,
      highLifeWins,
    };
    achievementEval = evaluateAchievements(profileForEval, matchSummary);
  }

  const updatePayload: Record<string, unknown> = {
    wins: nextOverall.wins,
    losses: nextOverall.losses,
    draws: nextOverall.draws,
    totalGames: nextOverall.totalGames,
    winRate: nextOverall.winRate,
    statsByMode,
    progression: nextProgression,
    currencies: afterLevelRewards.currencies,
    ranked,
    unlocks: afterLevelRewards.unlocks,
    classMastery,
    lastSeen: Date.now(),
  };

  if (matchCtx) {
    updatePayload.characterStats = updatedCharacterStats;
    updatePayload.winStreak = winStreak;
    updatePayload.opponentsFaced = opponentsFaced;
    updatePayload.onlinePlayersDefeated = onlinePlayersDefeated;
    updatePayload.perfectWins = perfectWins;
    updatePayload.highLifeWins = highLifeWins;
    if (favoriteCharacter !== undefined) {
      updatePayload.favoriteCharacter = favoriteCharacter;
    }
    updatePayload.favoriteClass = favoriteClass;
    if (achievementEval) {
      updatePayload.achievements = achievementEval.updatedProgress;
    }
  }

  const finalUnlocks = hasCompletedAllAchievements(
    achievementEval?.updatedProgress ?? data.achievements,
  )
    ? normalizeUnlocks({
        ...afterLevelRewards.unlocks,
        charactersUnlocked: [
          ...afterLevelRewards.unlocks.charactersUnlocked,
          "the_toon",
        ],
      })
    : afterLevelRewards.unlocks;

  updatePayload.unlocks = finalUnlocks;

  await updateDoc(playerRef, updatePayload);

  // Save to match history if there was a match context
  if (matchCtx && matchSummary) {
    try {
      await saveMatchToHistory(uid, matchSummary);
    } catch (error) {
      console.error(
        "[recordMatchResult] Error saving to match history:",
        error,
      );
      // Don't throw - match recording should succeed even if history save fails
    }
  }

  await upsertLeaderboardEntry({
    ...data,
    statsByMode,
    wins: nextOverall.wins,
    losses: nextOverall.losses,
    draws: nextOverall.draws,
    totalGames: nextOverall.totalGames,
    winRate: nextOverall.winRate,
    progression: nextProgression,
    currencies: afterLevelRewards.currencies,
    ranked,
    unlocks: finalUnlocks,
    classMastery,
  });

  // Invalidate so the next leaderboard/profile read picks up fresh stats
  invalidateCache(`profile:${uid}`);
  invalidateCache(`leaderboard:overall:50`);
  invalidateCache(`leaderboard:solo:50`);
  invalidateCache(`leaderboard:online:50`);

  return {
    result,
    mode,
    rewards,
    progression: nextProgression,
    currencies: afterLevelRewards.currencies,
    ranked,
    unlocks: finalUnlocks,
    classMastery,
    levelRewards,
    achievementEval,
  };
}

export interface ShopPurchaseResult {
  ok: boolean;
  message: string;
  currencies: Currencies;
  unlocks: Unlocks;
}

// ─── Achievement Claim ──────────────────────────────────────────────────────

export async function claimAchievementReward(
  uid: string,
  achievementId: string,
  tierIndex: number,
): Promise<{
  ok: boolean;
  message: string;
  reward?: { gold: number; ruby: number };
}> {
  const { computeClaimReward, normalizeAchievements: normAch } =
    await import("./achievements");
  const playerRef = doc(db, "players", uid);
  const snap = await getDoc(playerRef);
  if (!snap.exists()) return { ok: false, message: "Perfil não encontrado." };

  const profile = snap.data() as PlayerProfile;
  const allProgress = normAch(profile.achievements);
  const progress = allProgress[achievementId];
  if (!progress) return { ok: false, message: "Conquista não encontrada." };

  const currencies = normalizeCurrencies(profile.currencies);
  const claimResult = computeClaimReward(
    achievementId,
    tierIndex,
    progress,
    currencies,
  );
  if (
    !claimResult.ok ||
    !claimResult.updatedProgress ||
    !claimResult.updatedCurrencies
  ) {
    return { ok: false, message: claimResult.message };
  }

  allProgress[achievementId] = claimResult.updatedProgress;
  await updateDoc(playerRef, {
    achievements: allProgress,
    currencies: claimResult.updatedCurrencies,
  });

  invalidateCache(`profile:${uid}`);

  return { ok: true, message: claimResult.message, reward: claimResult.reward };
}

/**
 * Retroactively evaluate achievements based on current profile progress.
 * Call this once per session when the user enters the achievements page
 * to ensure all unlocked achievements are visible even for existing users.
 */
export async function syncAchievementsRetroactively(
  uid: string,
): Promise<{ updated: boolean; count: number }> {
  const { retroactivelyEvaluateAchievements, normalizeAchievements: normAch } =
    await import("./achievements");
  const playerRef = doc(db, "players", uid);
  const snap = await getDoc(playerRef);
  if (!snap.exists()) {
    return { updated: false, count: 0 };
  }

  const profile = snap.data() as PlayerProfile;
  const currentProgress = normAch(profile.achievements);
  const newProgress = retroactivelyEvaluateAchievements(profile);

  // Count changes
  let changedCount = 0;
  for (const [id, newProg] of Object.entries(newProgress)) {
    const oldProg = currentProgress[id];
    if (newProg.level > oldProg.level) {
      changedCount++;
    }
  }

  const unlocks = normalizeUnlocks(profile.unlocks);
  const shouldUnlockToon =
    hasCompletedAllAchievements(newProgress) &&
    !unlocks.charactersUnlocked.includes("the_toon");

  if (changedCount > 0 || shouldUnlockToon) {
    await updateDoc(playerRef, {
      achievements: newProgress,
      ...(shouldUnlockToon
        ? {
            unlocks: normalizeUnlocks({
              ...unlocks,
              charactersUnlocked: [...unlocks.charactersUnlocked, "the_toon"],
            }),
          }
        : {}),
    });
    invalidateCache(`profile:${uid}`);
  }

  return { updated: changedCount > 0, count: changedCount };
}

const CHARACTER_PRICE_GOLD = 1000;

export async function buyCharacterInShop(
  uid: string,
  characterId: string,
): Promise<ShopPurchaseResult> {
  const playerRef = doc(db, "players", uid);
  const snap = await getDoc(playerRef);
  if (!snap.exists()) {
    return {
      ok: false,
      message: "Perfil não encontrado.",
      currencies: normalizeCurrencies(undefined),
      unlocks: normalizeUnlocks(undefined),
    };
  }

  const profile = profileWithNormalizedStats(snap.data() as PlayerProfile);
  const progression = calculateProgression(profile.progression?.xpTotal ?? 0);
  const currencies = normalizeCurrencies(profile.currencies);
  const unlocks = normalizeUnlocks(profile.unlocks);

  if (unlocks.charactersUnlocked.includes(characterId)) {
    return {
      ok: false,
      message: "Você já possui esse personagem.",
      currencies,
      unlocks,
    };
  }

  const unlockStatus = resolveCharacterUnlockStatus(
    characterId,
    progression.level,
    hasCompletedAllAchievements(profile.achievements),
  );
  if (!unlockStatus.purchasable) {
    return {
      ok: false,
      message: unlockStatus.reason,
      currencies,
      unlocks,
    };
  }

  if (!unlockStatus.unlockedByRule) {
    return {
      ok: false,
      message: unlockStatus.reason,
      currencies,
      unlocks,
    };
  }

  if (currencies.gold < CHARACTER_PRICE_GOLD) {
    return {
      ok: false,
      message: "Gold insuficiente para comprar.",
      currencies,
      unlocks,
    };
  }

  const nextCurrencies = {
    ...currencies,
    gold: currencies.gold - CHARACTER_PRICE_GOLD,
  };
  const nextUnlocks = normalizeUnlocks({
    ...unlocks,
    charactersUnlocked: [...unlocks.charactersUnlocked, characterId],
  });

  await updateDoc(playerRef, {
    currencies: nextCurrencies,
    unlocks: nextUnlocks,
    lastSeen: Date.now(),
  });

  await upsertLeaderboardEntry({
    ...profile,
    currencies: nextCurrencies,
    unlocks: nextUnlocks,
  });

  invalidateCache(`profile:${uid}`);

  return {
    ok: true,
    message: "Compra realizada com sucesso.",
    currencies: nextCurrencies,
    unlocks: nextUnlocks,
  };
}

export interface BuyClassMasteryResult {
  ok: boolean;
  message: string;
  classMastery?: ClassMasteryProgress;
  currencies?: Currencies;
}

export async function buyClassMasteryLevel(
  uid: string,
  characterClass: CharacterClass,
): Promise<BuyClassMasteryResult> {
  const profile = await getPlayerProfile(uid);
  if (!profile) {
    return { ok: false, message: "Perfil não encontrado." };
  }

  const currentMastery = normalizeClassMastery(profile.classMastery);
  const currentClassState = currentMastery[characterClass];
  const nextLevel = currentClassState.level + 1;
  const upgradeCost = getClassMasteryUpgradeCost(nextLevel);

  if (upgradeCost === null) {
    return { ok: false, message: "Classe já está no nível máximo." };
  }

  const currentCurrencies = normalizeCurrencies(profile.currencies);
  if (currentCurrencies.gold < upgradeCost) {
    return {
      ok: false,
      message: `Gold insuficiente. Necessário: ${upgradeCost.toLocaleString("pt-BR")}.`,
    };
  }

  // Preserve the player's existing mastery points when upgrading — do not reset to the new level's minimum.
  const nextClassMastery: ClassMasteryProgress = {
    ...currentMastery,
    [characterClass]: {
      points: currentClassState.points,
      level: nextLevel,
    },
  };

  const nextCurrencies: Currencies = {
    ...currentCurrencies,
    gold: Math.max(0, currentCurrencies.gold - upgradeCost),
  };

  const favoriteClass = getMostPlayedClass(
    nextClassMastery,
    getCharacterClass(profile.avatar),
  );

  await updateDoc(doc(db, "players", uid), {
    classMastery: nextClassMastery,
    currencies: nextCurrencies,
    favoriteClass,
    lastSeen: Date.now(),
  });

  invalidateCache(`profile:${uid}`);

  return {
    ok: true,
    message: `Maestria de ${characterClass} evoluiu para Nv ${nextLevel}.`,
    classMastery: nextClassMastery,
    currencies: nextCurrencies,
  };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/** Fetches the global leaderboard — top N players sorted by wins desc. */
export async function fetchLeaderboard(
  topN = 50,
  mode: "overall" | MatchMode = "overall",
  sortBy: "wins" | "trophies" = "wins",
): Promise<LeaderboardEntry[]> {
  const key = `leaderboard:${mode}:${topN}:${sortBy}`;
  const cached = cacheGet<LeaderboardEntry[]>(key);
  if (cached) return cached;

  const winsPath =
    mode === "overall"
      ? "statsByMode.overall.wins"
      : `statsByMode.${mode}.wins`;
  const orderPath = sortBy === "trophies" ? "trophies" : winsPath;

  // Preferred source: dedicated leaderboard collection.
  const leaderboardQuery = query(
    collection(db, "leaderboard"),
    orderBy(orderPath, "desc"),
    limit(topN),
  );
  const leaderboardSnap = await getDocs(leaderboardQuery);

  const fromLeaderboard = leaderboardSnap.docs
    .reduce<LeaderboardEntry[]>((acc, d) => {
      const raw = d.data();
      const p = profileWithNormalizedStats(raw as PlayerProfile);
      const stats =
        mode === "overall" ? p.statsByMode?.overall : p.statsByMode?.[mode];
      if (!stats || (stats.totalGames ?? 0) <= 0) return acc;
      acc.push({
        uid: p.uid,
        displayName: p.displayName,
        playerCode: p.playerCode,
        avatar: p.avatar,
        avatarPicture:
          (raw.avatarPicture as string | undefined) ?? p.avatarPicture,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.winRate,
        totalGames: stats.totalGames,
        trophies:
          typeof raw.trophies === "number"
            ? raw.trophies
            : (p.ranked?.trophies ?? 0),
        rank: 0,
      });
      return acc;
    }, [])
    .sort((a, b) => {
      if (sortBy === "trophies") return (b.trophies ?? 0) - (a.trophies ?? 0);
      return b.wins - a.wins;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  if (fromLeaderboard.length > 0) {
    cacheSet(key, fromLeaderboard, 2 * 60_000);
    return fromLeaderboard;
  }

  // Fallback source: players collection (legacy data).
  const playersQuery = query(
    collection(db, "players"),
    orderBy(sortBy === "trophies" ? "ranked.trophies" : "wins", "desc"),
    limit(topN),
  );
  const playersSnap = await getDocs(playersQuery);
  const fromPlayers = playersSnap.docs
    .map((d) => profileWithNormalizedStats(d.data() as PlayerProfile))
    .filter((p) => {
      const stats =
        mode === "overall" ? p.statsByMode?.overall : p.statsByMode?.[mode];
      return (stats?.totalGames ?? 0) > 0;
    })
    .map((p) => {
      const stats =
        mode === "overall" ? p.statsByMode!.overall : p.statsByMode![mode];
      return {
        uid: p.uid,
        displayName: p.displayName,
        playerCode: p.playerCode,
        avatar: p.avatar,
        avatarPicture: p.avatarPicture,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.winRate,
        totalGames: stats.totalGames,
        trophies: p.ranked?.trophies ?? 0,
        rank: 0,
      } satisfies LeaderboardEntry;
    })
    .sort((a, b) => {
      if (sortBy === "trophies") return (b.trophies ?? 0) - (a.trophies ?? 0);
      return b.wins - a.wins;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  cacheSet(key, fromPlayers, 2 * 60_000);
  return fromPlayers;
}

// ─── Presence (RTDB) ─────────────────────────────────────────────────────────

/** Sets the user's online status in RTDB and Firestore with retry logic. */
export function setOnlinePresence(uid: string, status: OnlineStatus): void {
  if (!uid) {
    console.warn("⚠️ setOnlinePresence: uid is empty");
    return;
  }

  try {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    set(presenceRef, { status, lastSeen: Date.now() })
      .then(() => {
        console.log(`✅ Presence set for ${uid}: ${status}`);
      })
      .catch((err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `❌ Could not set presence in RTDB for ${uid}: ${errorMsg}`,
        );
        // Log the specific error code for debugging
        if (err instanceof Object && "code" in err) {
          console.error(`Error code: ${(err as Record<string, unknown>).code}`);
        }
      });
  } catch (error) {
    console.error("⚠️ Could not set presence in RTDB (sync error):", error);
  }

  // Also update Firestore async
  updateDoc(doc(db, "players", uid), {
    onlineStatus: status,
    lastSeen: Date.now(),
  }).catch((err: unknown) => {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ Could not update presence in Firestore: ${errorMsg}`);
  });
}

/** Subscribes to a user's online status in RTDB. Returns unsubscribe fn. */
export function subscribeToPresence(
  uid: string,
  callback: (status: OnlineStatus) => void,
): () => void {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  onValue(presenceRef, (snap) => {
    const data = snap.val();
    callback(data?.status ?? "offline");
  });
  return () => off(presenceRef);
}

// ─── Friends System ──────────────────────────────────────────────────────────

/** Send a friend request from one player to another. */
export async function sendFriendRequest(
  fromProfile: PlayerProfile,
  toUid: string,
): Promise<void> {
  // Check if a request already exists in either direction
  const existing = await getDocs(
    query(
      collection(db, "friendRequests"),
      where("fromUid", "==", fromProfile.uid),
      where("toUid", "==", toUid),
      where("status", "==", "pending"),
    ),
  );
  if (!existing.empty) return; // Already sent

  const requestRef = doc(collection(db, "friendRequests"));
  const request: FriendRequest = {
    id: requestRef.id,
    fromUid: fromProfile.uid,
    fromDisplayName: fromProfile.displayName,
    fromAvatar: fromProfile.avatar,
    fromPlayerCode: fromProfile.playerCode,
    toUid,
    status: "pending",
    createdAt: Date.now(),
  };
  await setDoc(requestRef, request);
}

/** Accept a friend request — creates mutual friend entries atomically. */
export async function acceptFriendRequest(
  requestId: string,
  currentProfile: PlayerProfile,
): Promise<void> {
  console.log("[acceptFriendRequest] Starting...", {
    requestId,
    currentUid: currentProfile.uid,
  });

  try {
    const reqRef = doc(db, "friendRequests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) {
      console.log("[acceptFriendRequest] Request doc does not exist");
      return;
    }
    const request = reqSnap.data() as FriendRequest;
    console.log("[acceptFriendRequest] Request data fetched:", {
      fromUid: request.fromUid,
      toUid: request.toUid,
      status: request.status,
    });

    // Only the receiver can accept, and only while it's pending.
    if (request.toUid !== currentProfile.uid) {
      const err = `Only the request receiver can accept this friend request. Expected toUid=${currentProfile.uid}, got=${request.toUid}`;
      console.error("[acceptFriendRequest]", err);
      throw new Error(err);
    }
    if (request.status !== "pending") {
      console.log(
        "[acceptFriendRequest] Request is not pending, status=",
        request.status,
      );
      return;
    }

    // Get sender profile (create a minimal profile for legacy users if missing)
    console.log(
      "[acceptFriendRequest] Fetching sender profile...",
      request.fromUid,
    );
    let senderProfile = await getPlayerProfile(request.fromUid);
    if (!senderProfile) {
      console.log(
        "[acceptFriendRequest] Sender profile missing, creating minimal profile...",
      );
      // Build a minimal profile from the friend request metadata and create it.
      const minimalProfile: PlayerProfile = {
        uid: request.fromUid,
        displayName: request.fromDisplayName || "Player",
        playerCode:
          request.fromPlayerCode || (await generateUniquePlayerCode()),
        avatar: request.fromAvatar || "marshal",
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        winRate: 0,
        statsByMode: {
          solo: createEmptyModeStats(),
          online: createEmptyModeStats(),
          overall: createEmptyModeStats(),
        },
        // Initialize stats fields with empty/default values
        characterStats: {},
        achievements: {},
        favoriteCharacter: undefined,
        winStreak: 0,
        perfectWins: 0,
        highLifeWins: 0,
        opponentsFaced: [],
        onlinePlayersDefeated: [],
        createdAt: Date.now(),
        lastSeen: Date.now(),
        onlineStatus: "offline",
      };
      await createPlayerProfile(minimalProfile);
      // Re-fetch; if still missing, abort
      senderProfile = await getPlayerProfile(request.fromUid);
      if (!senderProfile) {
        console.log(
          "[acceptFriendRequest] Failed to create sender profile, aborting",
        );
        return;
      }
    }
    console.log(
      "[acceptFriendRequest] Sender profile ready:",
      senderProfile.uid,
    );

    // Build mutual friend documents
    const friendForCurrent: Friend = {
      uid: senderProfile.uid,
      displayName: senderProfile.displayName,
      playerCode: senderProfile.playerCode,
      avatar: senderProfile.avatar,
      onlineStatus: senderProfile.onlineStatus ?? "offline",
      lastSeen: senderProfile.lastSeen ?? Date.now(),
      addedAt: Date.now(),
      friendRequestId: requestId,
    };

    const friendForSender: Friend = {
      uid: currentProfile.uid,
      displayName: currentProfile.displayName,
      playerCode: currentProfile.playerCode,
      avatar: currentProfile.avatar,
      onlineStatus: currentProfile.onlineStatus ?? "offline",
      lastSeen: currentProfile.lastSeen ?? Date.now(),
      addedAt: Date.now(),
      friendRequestId: requestId,
    };
    console.log("[acceptFriendRequest] Friend documents prepared");

    // Mark request as accepted FIRST (outside batch) so that security rules can validate it
    // when they check `get(friendRequests/{id}).data.status == 'accepted'`
    console.log(
      "[acceptFriendRequest] Updating friendRequest status to accepted...",
    );
    await updateDoc(reqRef, { status: "accepted" });
    console.log("[acceptFriendRequest] FriendRequest status updated ✓");

    // Use writeBatch to atomically create both friend docs
    const batch = writeBatch(db);
    console.log("[acceptFriendRequest] WriteBatch created");

    // Add friend to accepter's collection
    const accepterFriendPath = `players/${currentProfile.uid}/friends/${senderProfile.uid}`;
    batch.set(
      doc(db, "players", currentProfile.uid, "friends", senderProfile.uid),
      friendForCurrent,
    );
    console.log("[acceptFriendRequest] Batch: set " + accepterFriendPath);

    // Add friend to sender's collection (accepter writes into sender's subcollection)
    // The security rule will validate the friendRequestId points to an accepted request
    const senderFriendPath = `players/${senderProfile.uid}/friends/${currentProfile.uid}`;
    batch.set(
      doc(db, "players", senderProfile.uid, "friends", currentProfile.uid),
      friendForSender,
    );
    console.log("[acceptFriendRequest] Batch: set " + senderFriendPath);

    // Commit all writes atomically
    console.log("[acceptFriendRequest] Committing batch...");
    await batch.commit();
    console.log(
      "✓ [acceptFriendRequest] SUCCESS: Friend request accepted:",
      currentProfile.uid,
      "↔",
      senderProfile.uid,
    );
  } catch (error) {
    console.error("[acceptFriendRequest] FAILED:", error);
    throw error;
  }
}

/** Reject a friend request. */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "friendRequests", requestId), { status: "rejected" });
}

/** Get pending friend requests received by a user. */
export async function getPendingRequests(
  uid: string,
): Promise<FriendRequest[]> {
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FriendRequest);
}

/** Get the player's friends list. */
export async function getFriendsList(uid: string): Promise<Friend[]> {
  const snap = await getDocs(collection(db, "players", uid, "friends"));
  return snap.docs.map((d) => d.data() as Friend);
}

/** Remove a friend (both directions). */
export async function removeFriend(
  myUid: string,
  friendUid: string,
): Promise<void> {
  await deleteDoc(doc(db, "players", myUid, "friends", friendUid));
  await deleteDoc(doc(db, "players", friendUid, "friends", myUid));
}

/** Subscribe to a user's friends list with real-time updates. Returns unsubscribe fn. */
export function subscribeToFriends(
  uid: string,
  callback: (friends: Friend[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, "players", uid, "friends"), (snap) => {
    callback(snap.docs.map((d) => d.data() as Friend));
  });
}

/** Subscribe to a player's profile document with real-time updates. Returns unsubscribe fn. */
export function subscribeToPlayerProfile(
  uid: string,
  callback: (profile: PlayerProfile | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "players", uid), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(profileWithNormalizedStats(snap.data() as PlayerProfile));
  });
}

// ─── Migration Helpers ──────────────────────────────────────────────────────

/**
 * Migrates all existing players to have characterStats and other fields.
 * Runs automatically on first login to ensure legacy accounts have stats initialized.
 * Safe to run multiple times - only updates profiles missing these fields.
 */
export async function migrateCharacterStatsForAllPlayers(): Promise<{
  migratedCount: number;
  totalScanned: number;
}> {
  try {
    const snap = await getDocs(collection(db, "players"));
    let migratedCount = 0;
    const totalScanned = snap.docs.length;

    if (totalScanned === 0) {
      console.log("[Migration] No players found");
      return { migratedCount: 0, totalScanned: 0 };
    }

    console.log(
      `[Migration] Scanning ${totalScanned} players for characterStats...`,
    );

    for (const doc of snap.docs) {
      const profileData = doc.data() as PlayerProfile;
      const needsMigration =
        !profileData.characterStats ||
        !profileData.achievements ||
        profileData.winStreak === undefined;

      if (needsMigration) {
        const migrationPayload: Record<string, unknown> = {
          characterStats: profileData.characterStats ?? {},
          achievements: profileData.achievements ?? {},
          winStreak: profileData.winStreak ?? 0,
          perfectWins: profileData.perfectWins ?? 0,
          highLifeWins: profileData.highLifeWins ?? 0,
          opponentsFaced: profileData.opponentsFaced ?? [],
          onlinePlayersDefeated: profileData.onlinePlayersDefeated ?? [],
        };
        if (profileData.favoriteCharacter !== undefined) {
          migrationPayload.favoriteCharacter = profileData.favoriteCharacter;
        }
        if (profileData.favoriteClass !== undefined) {
          migrationPayload.favoriteClass = profileData.favoriteClass;
        }
        await updateDoc(doc.ref, migrationPayload);
        migratedCount++;

        // Log every 10 migrations to avoid spam
        if (migratedCount % 10 === 0) {
          console.log(`[Migration] Migrated ${migratedCount}/${totalScanned}`);
        }
      }
    }

    console.log(
      `[Migration] ✅ Complete: ${migratedCount} profiles migrated, ${totalScanned} scanned`,
    );
    invalidateCache("players:all");
    return { migratedCount, totalScanned };
  } catch (error) {
    console.error("[Migration] ❌ Failed:", error);
    return { migratedCount: 0, totalScanned: 0 };
  }
}

/**
 * Check if a single player needs migration.
 * Used to ensure profile has all required fields.
 */
export async function ensurePlayerHasStats(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "players", uid));
    if (!snap.exists()) return false;

    const profileData = snap.data() as PlayerProfile;
    const needsMigration =
      !profileData.characterStats ||
      !profileData.achievements ||
      profileData.winStreak === undefined;

    if (needsMigration) {
      const migrationPayload: Record<string, unknown> = {
        characterStats: profileData.characterStats ?? {},
        achievements: profileData.achievements ?? {},
        winStreak: profileData.winStreak ?? 0,
        perfectWins: profileData.perfectWins ?? 0,
        highLifeWins: profileData.highLifeWins ?? 0,
        opponentsFaced: profileData.opponentsFaced ?? [],
        onlinePlayersDefeated: profileData.onlinePlayersDefeated ?? [],
      };
      if (profileData.favoriteCharacter !== undefined) {
        migrationPayload.favoriteCharacter = profileData.favoriteCharacter;
      }
      if (profileData.favoriteClass !== undefined) {
        migrationPayload.favoriteClass = profileData.favoriteClass;
      }
      await updateDoc(snap.ref, migrationPayload);
      console.log(`[Migration] ✅ Migrated ${uid}`);
      invalidateCache(`profile:${uid}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[Migration] ❌ Failed for ${uid}:`, error);
    return false;
  }
}

/** Subscribe to pending friend requests for a user. Returns unsubscribe fn. */
export function subscribeToPendingRequests(
  uid: string,
  callback: (requests: FriendRequest[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as FriendRequest));
  });
}

// ─── Match History Persistence ─────────────────────────────────────────────

/**
 * Saves a match summary to the player's match history.
 * Automatically maintains only the 10 most recent matches.
 * Called after every match completion in recordMatchResult().
 *
 * @param uid - Player's UID
 * @param matchSummary - Completed match statistics and results
 * @returns The saved match ID for reference
 */
export async function saveMatchToHistory(
  uid: string,
  matchSummary: MatchSummary,
): Promise<string> {
  try {
    const matchDocRef = doc(
      db,
      "players",
      uid,
      "matchHistory",
      matchSummary.matchId,
    );

    await setDoc(matchDocRef, {
      ...matchSummary,
      savedAt: Date.now(),
    });

    console.log(
      `[Match History] Saved match ${matchSummary.matchId} for ${uid}`,
    );

    // Clean up old matches (keep only 10 most recent)
    await cleanupOldMatches(uid);

    return matchSummary.matchId;
  } catch (error) {
    console.error("[Match History] Error saving match:", error);
    throw error;
  }
}

/**
 * Removes old matches, keeping only the 10 most recent ones.
 * Called automatically after each match save.
 *
 * @param uid - Player's UID
 */
export async function cleanupOldMatches(uid: string): Promise<void> {
  try {
    // Query all matches ordered by timestamp descending
    const q = query(
      collection(db, "players", uid, "matchHistory"),
      orderBy("timestamp", "desc"),
    );

    const snap = await getDocs(q);
    const allMatches = snap.docs;

    // If we have more than 10, delete the older ones
    if (allMatches.length > 10) {
      const matchesToDelete = allMatches.slice(10); // Keep first 10, delete the rest

      console.log(
        `[Match History] Cleaning up ${matchesToDelete.length} old matches for ${uid}`,
      );

      for (const docToDelete of matchesToDelete) {
        await deleteDoc(docToDelete.ref);
      }
    }
  } catch (error) {
    console.error("[Match History] Error cleaning up old matches:", error);
    // Don't throw - this is a background operation and shouldn't block match recording
  }
}

/**
 * Retrieves a player's match history, limited to the most recent matches.
 * Ordered by timestamp (newest first).
 *
 * @param uid - Player's UID
 * @param limitCount - Max number of matches to return (default: 10)
 * @returns Array of match summaries ordered by recency
 */
export async function getPlayerMatchHistory(
  uid: string,
  limitCount: number = 10,
): Promise<MatchSummary[]> {
  try {
    const q = query(
      collection(db, "players", uid, "matchHistory"),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MatchSummary);
  } catch (error) {
    console.error("[Match History] Error fetching match history:", error);
    return [];
  }
}

/**
 * Subscribe to a player's match history with real-time updates.
 * Automatically maintains max 10 most recent matches.
 *
 * @param uid - Player's UID
 * @param callback - Called whenever match history changes
 * @param limitCount - Max matches to track (default: 10)
 * @returns Unsubscribe function
 */
export function subscribeToMatchHistory(
  uid: string,
  callback: (matches: MatchSummary[]) => void,
  limitCount: number = 10,
): Unsubscribe {
  const q = query(
    collection(db, "players", uid, "matchHistory"),
    orderBy("timestamp", "desc"),
    limit(limitCount),
  );

  return onSnapshot(q, (snap) => {
    const matches = snap.docs.map((d) => d.data() as MatchSummary);
    callback(matches);
  });
}
