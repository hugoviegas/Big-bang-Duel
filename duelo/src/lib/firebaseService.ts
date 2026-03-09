/**
 * Firebase service layer – handles all Firestore/RTDB operations
 * for profiles, leaderboard, friends, and stats.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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
import { db, rtdb } from "./firebase";
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
} from "../types";
import {
  calculateProgression,
  calculateMatchRewards,
  normalizeCurrencies,
  normalizeRanked,
  normalizeUnlocks,
  getLevelUpRewards,
  applyLevelRewards,
  clampTrophies,
  getCharacterShopRequirement,
  type MatchRewardSummary,
} from "./progression";

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
  try {
    const normalized = profileWithNormalizedStats(profile);
    await setDoc(doc(db, "players", profile.uid), {
      ...normalized,
      createdAt: profile.createdAt || Date.now(),
      lastSeen: Date.now(),
    });
    await upsertLeaderboardEntry(normalized);
    // Populate cache immediately so the next read is instant
    cacheSet(`profile:${profile.uid}`, normalized, 5 * 60_000);
    console.log("\u2713 Player profile created:", profile.uid);
  } catch (error) {
    console.warn(
      "\u26a0\ufe0f Could not create player profile (Firestore unavailable):",
      error,
    );
  }
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
  await updateDoc(doc(db, "players", uid), { ...data, lastSeen: Date.now() });
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

export interface MatchResultUpdate {
  result: MatchResult;
  mode: MatchMode;
  rewards: MatchRewardSummary;
  progression: ProgressionState;
  currencies: Currencies;
  ranked: RankedStats;
  unlocks: Unlocks;
  levelRewards: Array<{
    level: number;
    gold: number;
    unlockedCharacterId?: string;
  }>;
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

  return {
    ...profile,
    statsByMode,
    progression,
    currencies,
    ranked,
    unlocks,
    wins: statsByMode.overall.wins,
    losses: statsByMode.overall.losses,
    draws: statsByMode.overall.draws,
    totalGames: statsByMode.overall.totalGames,
    winRate: statsByMode.overall.winRate,
  };
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

/** Records a match result: increments wins/losses/draws + totalGames, recalculates winRate. */
export async function recordMatchResult(
  uid: string,
  result: MatchResult,
  mode: MatchMode = "solo",
  rewardOverride?: MatchRewardSummary,
): Promise<MatchResultUpdate | null> {
  const playerRef = doc(db, "players", uid);
  const snap = await getDoc(playerRef);
  if (!snap.exists()) return null;

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

  await updateDoc(playerRef, {
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
    lastSeen: Date.now(),
  });

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
    unlocks: afterLevelRewards.unlocks,
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
    unlocks: afterLevelRewards.unlocks,
    levelRewards,
  };
}

export interface ShopPurchaseResult {
  ok: boolean;
  message: string;
  currencies: Currencies;
  unlocks: Unlocks;
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

  const requiredLevel = getCharacterShopRequirement(characterId);
  if (progression.level < requiredLevel) {
    return {
      ok: false,
      message: `Esse personagem requer nível ${requiredLevel}.`,
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

/** Sets the user's online status in RTDB and Firestore. */
export function setOnlinePresence(uid: string, status: OnlineStatus): void {
  try {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    set(presenceRef, { status, lastSeen: Date.now() }).catch((err) => {
      console.warn(
        "⚠️ Could not set presence in RTDB (permission/network):",
        err,
      );
    });
  } catch (error) {
    console.warn("⚠️ Could not set presence in RTDB (sync error):", error);
  }
  // Also update Firestore async
  updateDoc(doc(db, "players", uid), {
    onlineStatus: status,
    lastSeen: Date.now(),
  }).catch((err) => {
    console.warn("⚠️ Could not update presence in Firestore:", err);
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
