import type {
  MatchMode,
  Currencies,
  ProgressionState,
  RankedStats,
  Unlocks,
} from "../types";

export type MatchResult = "win" | "loss" | "draw";

export const LEVEL_CAP = 10;
export const LEVEL_XP_THRESHOLDS: number[] = [0, 120, 420, 1000, 2100, 4000, 7000, 11500, 18500, 30000];

export interface MatchRewardSummary {
  xpGained: number;
  goldGained: number;
  rubyGained: number;
  trophyDelta: number;
  mode: MatchMode;
  result: MatchResult;
}

export interface LevelReward {
  level: number;
  gold: number;
  ruby?: number;
  unlockedCharacterId?: string;
}

const SOLO_XP_RANGES: Record<MatchResult, readonly [number, number]> = {
  win: [90, 120],
  loss: [28, 40],
  draw: [45, 60],
};

const SOLO_GOLD_RANGES: Record<MatchResult, readonly [number, number]> = {
  win: [35, 55],
  loss: [12, 20],
  draw: [18, 30],
};

const TROPHY_RANGES: Record<Exclude<MatchResult, "draw">, readonly [number, number]> = {
  win: [27, 33],
  loss: [-13, -7],
};

const ONLINE_BONUS_MULTIPLIER = 1.1;

const LEVEL_REWARDS: Record<number, Omit<LevelReward, "level">> = {
  2: { gold: 120 },
  3: { gold: 200, unlockedCharacterId: "the_cowboy" },
  4: { gold: 320 },
  5: { gold: 450, ruby: 5, unlockedCharacterId: "detective_hopps" },
  6: { gold: 620 },
  7: { gold: 820, unlockedCharacterId: "stormtrooper" },
  8: { gold: 1100, ruby: 8 },
  9: { gold: 1450 },
  10: { gold: 2000, ruby: 12, unlockedCharacterId: "pe_de_pano" },
};

const SHOP_LEVEL_BUCKETS = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function deterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getCharacterShopRequirement(characterId: string): number {
  if (DEFAULT_UNLOCKS.charactersUnlocked.includes(characterId)) {
    return 1;
  }
  const hash = deterministicHash(`bbd-shop-${characterId}`);
  return SHOP_LEVEL_BUCKETS[hash % SHOP_LEVEL_BUCKETS.length];
}

export function getUnlockLevelForCharacter(characterId: string): number | null {
  for (const [level, config] of Object.entries(LEVEL_REWARDS)) {
    if (config.unlockedCharacterId === characterId) {
      return Number(level);
    }
  }
  return null;
}

export const DEFAULT_CURRENCIES: Currencies = {
  gold: 0,
  ruby: 0,
};

export const DEFAULT_RANKED: RankedStats = {
  trophies: 0,
  trophyPeak: 0,
};

export const DEFAULT_UNLOCKS: Unlocks = {
  charactersUnlocked: ["marshal", "skull", "la_dama"],
  cosmeticsUnlocked: [],
  claimedLevelRewards: [1],
};

function randomInt(min: number, max: number, random = Math.random): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function getRangeValue(
  range: readonly [number, number],
  mode: MatchMode,
  random = Math.random,
): number {
  const base = randomInt(range[0], range[1], random);
  return mode === "online" ? Math.round(base * ONLINE_BONUS_MULTIPLIER) : base;
}

function safeThreshold(index: number): number {
  if (index < 0) return 0;
  if (index >= LEVEL_XP_THRESHOLDS.length) {
    return LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
  }
  return LEVEL_XP_THRESHOLDS[index];
}

export function calculateProgression(xpTotal: number): ProgressionState {
  const safeXp = Math.max(0, Math.floor(xpTotal));
  let level = 1;
  for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i += 1) {
    if (safeXp >= LEVEL_XP_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const cappedLevel = Math.min(level, LEVEL_CAP);
  const currentLevelMin = safeThreshold(cappedLevel - 1);
  const nextLevelMin = safeThreshold(cappedLevel);
  const xpInLevel = Math.max(0, safeXp - currentLevelMin);
  const xpToNext = cappedLevel >= LEVEL_CAP ? 0 : Math.max(0, nextLevelMin - safeXp);

  return {
    level: cappedLevel,
    levelCap: LEVEL_CAP,
    xpTotal: safeXp,
    xpCurrentLevel: xpInLevel,
    xpForCurrentLevel: currentLevelMin,
    xpForNextLevel: nextLevelMin,
    xpToNextLevel: xpToNext,
  };
}

export function calculateMatchRewards(
  mode: MatchMode,
  result: MatchResult,
  random = Math.random,
): MatchRewardSummary {
  const xpGained = getRangeValue(SOLO_XP_RANGES[result], mode, random);
  const goldGained = getRangeValue(SOLO_GOLD_RANGES[result], mode, random);

  let trophyDelta = 0;
  if (mode === "online" && result !== "draw") {
    trophyDelta = randomInt(
      TROPHY_RANGES[result][0],
      TROPHY_RANGES[result][1],
      random,
    );
  }

  // Ruby is intentionally scarce: occasional drop on victories only.
  let rubyGained = 0;
  if (result === "win") {
    const chance = mode === "online" ? 0.1 : 0.03;
    rubyGained = random() < chance ? 1 : 0;
  }

  return {
    xpGained,
    goldGained,
    rubyGained,
    trophyDelta,
    mode,
    result,
  };
}

export function clampTrophies(value: number): number {
  return Math.max(0, Math.floor(value));
}

export function normalizeUnlocks(unlocks?: Partial<Unlocks>): Unlocks {
  const normalized: Unlocks = {
    charactersUnlocked: Array.from(
      new Set([...(unlocks?.charactersUnlocked ?? DEFAULT_UNLOCKS.charactersUnlocked)]),
    ),
    cosmeticsUnlocked: Array.from(new Set([...(unlocks?.cosmeticsUnlocked ?? [])])),
    claimedLevelRewards: Array.from(
      new Set([...(unlocks?.claimedLevelRewards ?? DEFAULT_UNLOCKS.claimedLevelRewards)]),
    ).sort((a, b) => a - b),
  };
  return normalized;
}

export function normalizeCurrencies(currencies?: Partial<Currencies>): Currencies {
  return {
    gold: Math.max(0, Math.floor(currencies?.gold ?? DEFAULT_CURRENCIES.gold)),
    ruby: Math.max(0, Math.floor(currencies?.ruby ?? DEFAULT_CURRENCIES.ruby)),
  };
}

export function normalizeRanked(ranked?: Partial<RankedStats>): RankedStats {
  const trophies = clampTrophies(ranked?.trophies ?? DEFAULT_RANKED.trophies);
  const trophyPeak = Math.max(
    trophies,
    clampTrophies(ranked?.trophyPeak ?? DEFAULT_RANKED.trophyPeak),
  );
  return { trophies, trophyPeak };
}

export function getLevelUpRewards(
  previousLevel: number,
  nextLevel: number,
  unlocks: Unlocks,
): LevelReward[] {
  const rewards: LevelReward[] = [];
  for (let level = previousLevel + 1; level <= nextLevel; level += 1) {
    const config = LEVEL_REWARDS[level];
    if (!config) continue;
    if (unlocks.claimedLevelRewards.includes(level)) continue;
    rewards.push({ level, ...config });
  }
  return rewards;
}

export function applyLevelRewards(
  unlocks: Unlocks,
  currencies: Currencies,
  rewards: LevelReward[],
): { unlocks: Unlocks; currencies: Currencies } {
  const nextUnlocks = normalizeUnlocks(unlocks);
  const nextCurrencies = normalizeCurrencies(currencies);

  for (const reward of rewards) {
    nextCurrencies.gold += reward.gold;
    nextCurrencies.ruby += reward.ruby ?? 0;
    if (reward.unlockedCharacterId) {
      nextUnlocks.charactersUnlocked = Array.from(
        new Set([...nextUnlocks.charactersUnlocked, reward.unlockedCharacterId]),
      );
    }
    nextUnlocks.claimedLevelRewards = Array.from(
      new Set([...nextUnlocks.claimedLevelRewards, reward.level]),
    ).sort((a, b) => a - b);
  }

  return { unlocks: nextUnlocks, currencies: nextCurrencies };
}
