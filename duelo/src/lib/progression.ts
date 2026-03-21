import type {
  MatchMode,
  Currencies,
  ProgressionState,
  RankedStats,
  Unlocks,
  CharacterClass,
  ClassMasteryProgress,
} from "../types";

export type MatchResult = "win" | "loss" | "draw";

export const LEVEL_CAP = 10;
export const LEVEL_XP_THRESHOLDS: number[] = [
  0, 120, 420, 1000, 2100, 4000, 7000, 11500, 18500, 30000,
];
export const CLASS_MASTERY_LEVEL_CAP = 5;
export const CLASS_MASTERY_THRESHOLDS: number[] = [0, 5, 20, 50, 100];
export const CLASS_MASTERY_UPGRADE_COSTS: Record<2 | 3 | 4 | 5, number> = {
  2: 100,
  3: 300,
  4: 800,
  5: 1500,
};

export type CharacterUnlockRule =
  | { type: "available" }
  | { type: "coins" }
  | { type: "level"; level: number }
  | { type: "achievement_full_completion" };

export interface CharacterUnlockStatus {
  rule: CharacterUnlockRule;
  purchasable: boolean;
  requiredLevel: number | null;
  requiresAchievementsCompletion: boolean;
  unlockedByRule: boolean;
  reason: string;
}

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

const TROPHY_RANGES: Record<
  Exclude<MatchResult, "draw">,
  readonly [number, number]
> = {
  win: [27, 33],
  loss: [-13, -7],
};

const ONLINE_BONUS_MULTIPLIER = 1.1;

const LEVEL_REWARDS: Record<number, Omit<LevelReward, "level">> = {
  2: { gold: 120 },
  3: { gold: 200 },
  4: { gold: 320 },
  5: { gold: 450, ruby: 5 },
  6: { gold: 620 },
  7: { gold: 820 },
  8: { gold: 1100, ruby: 8 },
  9: { gold: 1450 },
  10: { gold: 2000, ruby: 12 },
};

const CLASS_MASTERY_ABILITY_CHANCE: Record<CharacterClass, readonly number[]> =
  {
    estrategista: [0.04, 0.08, 0.12, 0.16, 0.2],
    atirador: [0.05, 0.1, 0.15, 0.2, 0.25],
    sorrateiro: [0.03, 0.06, 0.09, 0.12, 0.15],
    ricochete: [0.06, 0.12, 0.18, 0.24, 0.3],
    suporte: [0.03, 0.06, 0.09, 0.12, 0.15],
    sanguinario: [0.03, 0.06, 0.09, 0.12, 0.15],
  };

const CHARACTER_UNLOCK_RULES: Record<string, CharacterUnlockRule> = {
  marshal: { type: "available" },
  skull: { type: "available" },
  la_dama: { type: "available" },
  pe_de_pano: { type: "level", level: 3 },
  the_cowboy: { type: "coins" },
  o_galo: { type: "level", level: 3 },
  ben: { type: "level", level: 3 },
  o_panda: { type: "coins" },
  mokey_king: { type: "level", level: 4 },
  tigress_blaze: { type: "level", level: 4 },
  tai_lung: { type: "level", level: 4 },
  stormtrooper: { type: "coins" },
  the_scrapper: { type: "level", level: 5 },
  the_mandalorian: { type: "level", level: 5 },
  the_jedi: { type: "level", level: 5 },
  detective_hopps: { type: "level", level: 6 },
  the_toon: { type: "achievement_full_completion" },
  the_sheriff: { type: "coins" },
  serpent_queen: { type: "level", level: 6 },
  the_rango: { type: "level", level: 6 },
  alucard: { type: "level", level: 7 },
  the_outlaw: { type: "level", level: 7 },
  the_witcher: { type: "coins" },
  spider_noir: { type: "level", level: 8 },
  la_belle: { type: "level", level: 8 },
  o_genio: { type: "level", level: 9 },
  cooper: { type: "level", level: 9 },
  the_razor: { type: "level", level: 10 },
  norris: { type: "level", level: 10 },
};

export const DEFAULT_CLASS_MASTERY: ClassMasteryProgress = {
  atirador: { points: 0, level: 1 },
  estrategista: { points: 0, level: 1 },
  sorrateiro: { points: 0, level: 1 },
  ricochete: { points: 0, level: 1 },
  sanguinario: { points: 0, level: 1 },
  suporte: { points: 0, level: 1 },
};

export function getCharacterUnlockRule(
  characterId: string,
): CharacterUnlockRule {
  return CHARACTER_UNLOCK_RULES[characterId] ?? { type: "coins" };
}

export function getCharacterShopRequirement(characterId: string): number {
  const rule = getCharacterUnlockRule(characterId);
  if (rule.type === "level") {
    return rule.level;
  }
  return 1;
}

export function resolveCharacterUnlockStatus(
  characterId: string,
  currentLevel: number,
  hasCompletedAllAchievements: boolean,
): CharacterUnlockStatus {
  const rule = getCharacterUnlockRule(characterId);

  if (rule.type === "achievement_full_completion") {
    return {
      rule,
      purchasable: false,
      requiredLevel: null,
      requiresAchievementsCompletion: true,
      unlockedByRule: hasCompletedAllAchievements,
      reason: hasCompletedAllAchievements
        ? "Desbloqueado por 100% das conquistas"
        : "Requer 100% de todas as conquistas",
    };
  }

  if (rule.type === "level") {
    const unlockedByRule = currentLevel >= rule.level;
    return {
      rule,
      purchasable: true,
      requiredLevel: rule.level,
      requiresAchievementsCompletion: false,
      unlockedByRule,
      reason: unlockedByRule
        ? `Nível ${rule.level} atingido`
        : `Requer nível ${rule.level}`,
    };
  }

  return {
    rule,
    purchasable: true,
    requiredLevel: 1,
    requiresAchievementsCompletion: false,
    unlockedByRule: true,
    reason: "Disponível na loja",
  };
}

export function getUnlockLevelForCharacter(characterId: string): number | null {
  const rule = getCharacterUnlockRule(characterId);
  if (rule.type === "level") {
    return rule.level;
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

function clampMasteryLevel(level: number): number {
  return Math.max(1, Math.min(CLASS_MASTERY_LEVEL_CAP, Math.floor(level)));
}

export function getClassMasteryLevel(points: number): number {
  const safePoints = Math.max(0, Math.floor(points));
  let level = 1;
  for (let i = 0; i < CLASS_MASTERY_THRESHOLDS.length; i += 1) {
    if (safePoints >= CLASS_MASTERY_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return clampMasteryLevel(level);
}

export function normalizeClassMastery(
  mastery?: Partial<ClassMasteryProgress>,
): ClassMasteryProgress {
  return {
    atirador: {
      points: Math.max(0, Math.floor(mastery?.atirador?.points ?? 0)),
      // Preserve explicit level stored in profile. Do NOT auto-increase
      // level based on points — leveling must happen via paid upgrade.
      level: clampMasteryLevel(mastery?.atirador?.level ?? 1),
    },
    estrategista: {
      points: Math.max(0, Math.floor(mastery?.estrategista?.points ?? 0)),
      level: clampMasteryLevel(mastery?.estrategista?.level ?? 1),
    },
    sorrateiro: {
      points: Math.max(0, Math.floor(mastery?.sorrateiro?.points ?? 0)),
      level: clampMasteryLevel(mastery?.sorrateiro?.level ?? 1),
    },
    ricochete: {
      points: Math.max(0, Math.floor(mastery?.ricochete?.points ?? 0)),
      level: clampMasteryLevel(mastery?.ricochete?.level ?? 1),
    },
    sanguinario: {
      points: Math.max(0, Math.floor(mastery?.sanguinario?.points ?? 0)),
      level: clampMasteryLevel(mastery?.sanguinario?.level ?? 1),
    },
    suporte: {
      points: Math.max(0, Math.floor(mastery?.suporte?.points ?? 0)),
      level: clampMasteryLevel(mastery?.suporte?.level ?? 1),
    },
  };
}

export function awardClassMasteryPoint(
  mastery: ClassMasteryProgress,
  characterClass: CharacterClass,
  points = 1,
): ClassMasteryProgress {
  const normalized = normalizeClassMastery(mastery);
  const nextPoints = Math.max(0, normalized[characterClass].points + points);
  return {
    ...normalized,
    [characterClass]: {
      points: nextPoints,
      // Do not auto-increase level when points reach thresholds.
      // Level must be increased explicitly via buyClassMasteryLevel.
      level: normalized[characterClass].level,
    },
  };
}

export function getClassMasteryLevelForClass(
  mastery: Partial<ClassMasteryProgress> | undefined,
  characterClass: CharacterClass,
): number {
  const normalized = normalizeClassMastery(mastery);
  return normalized[characterClass].level;
}

export function getClassAbilityChance(
  characterClass: CharacterClass,
  masteryLevel: number,
): number {
  const safeLevel = clampMasteryLevel(masteryLevel);
  return CLASS_MASTERY_ABILITY_CHANCE[characterClass][safeLevel - 1];
}

export function getClassMasteryUpgradeCost(nextLevel: number): number | null {
  if (nextLevel < 2 || nextLevel > CLASS_MASTERY_LEVEL_CAP) {
    return null;
  }
  return (
    CLASS_MASTERY_UPGRADE_COSTS[
      nextLevel as keyof typeof CLASS_MASTERY_UPGRADE_COSTS
    ] ?? null
  );
}

/**
 * Checks if the player has any class available to evolve.
 * A class can be evolved only if:
 * - It's not at the maximum level (5)
 * - Player has accumulated enough mastery points to reach the next level
 * - The upgrade cost for the next level exists
 * - The player has enough gold for the upgrade
 * 
 * This logic mirrors exactly what ClassMasteryCard uses to show/enable the upgrade button.
 * 
 * @param classMastery - The player's class mastery progress
 * @param availableGold - Current gold balance
 * @returns true if at least one class can be evolved
 */
export function hasEvolvableClass(
  classMastery: Partial<ClassMasteryProgress> | undefined,
  availableGold: number,
): boolean {
  if (!classMastery) return false;
  
  const CLASSES = [
    "atirador",
    "estrategista",
    "sorrateiro",
    "ricochete",
    "sanguinario",
    "suporte",
  ] as const;

  for (const cls of CLASSES) {
    const state = classMastery[cls];
    if (!state) continue;

    // Can't evolve if already at max level
    if (state.level >= CLASS_MASTERY_LEVEL_CAP) continue;

    // Next level would be state.level + 1
    const nextLevel = state.level + 1;
    
    // Get the points threshold needed for the next level
    const nextThreshold = CLASS_MASTERY_THRESHOLDS[nextLevel - 1] ?? 0;
    
    // Player must have enough points to progress to next level
    if (state.points < nextThreshold) continue;
    
    const cost = getClassMasteryUpgradeCost(nextLevel);

    // Can evolve if cost exists and player has enough gold
    if (cost !== null && availableGold >= cost) {
      return true;
    }
  }

  return false;
}

export function getMostPlayedClass(
  mastery: Partial<ClassMasteryProgress> | undefined,
  tieBreakerClass?: CharacterClass,
): CharacterClass {
  const normalized = normalizeClassMastery(mastery);
  const classes = Object.keys(normalized) as CharacterClass[];

  let bestClass: CharacterClass = classes[0];
  let bestPoints = normalized[bestClass].points;

  for (const currentClass of classes) {
    const currentPoints = normalized[currentClass].points;
    if (currentPoints > bestPoints) {
      bestClass = currentClass;
      bestPoints = currentPoints;
      continue;
    }

    if (
      currentPoints === bestPoints &&
      tieBreakerClass &&
      currentClass === tieBreakerClass
    ) {
      bestClass = currentClass;
    }
  }

  return bestClass;
}

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
  const xpToNext =
    cappedLevel >= LEVEL_CAP ? 0 : Math.max(0, nextLevelMin - safeXp);

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
      new Set([
        ...(unlocks?.charactersUnlocked ?? DEFAULT_UNLOCKS.charactersUnlocked),
      ]),
    ),
    cosmeticsUnlocked: Array.from(
      new Set([...(unlocks?.cosmeticsUnlocked ?? [])]),
    ),
    claimedLevelRewards: Array.from(
      new Set([
        ...(unlocks?.claimedLevelRewards ??
          DEFAULT_UNLOCKS.claimedLevelRewards),
      ]),
    ).sort((a, b) => a - b),
  };
  return normalized;
}

export function normalizeCurrencies(
  currencies?: Partial<Currencies>,
): Currencies {
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
        new Set([
          ...nextUnlocks.charactersUnlocked,
          reward.unlockedCharacterId,
        ]),
      );
    }
    nextUnlocks.claimedLevelRewards = Array.from(
      new Set([...nextUnlocks.claimedLevelRewards, reward.level]),
    ).sort((a, b) => a - b);
  }

  return { unlocks: nextUnlocks, currencies: nextCurrencies };
}
