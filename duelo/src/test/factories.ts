import type {
  User,
  Room,
  TurnResult,
  MatchSummary,
  PlayerState,
  GameState,
  LeaderboardEntry,
  Achievement,
  UserPreferences,
} from "../../types";

/**
 * Factory functions for deterministic test data
 * All factories return objects with sensible defaults + customization
 */

export const createTestUser = (overrides?: Partial<User>): User => ({
  uid: "test-user-" + Math.random().toString(36).slice(7),
  email: "test@example.com",
  displayName: "Test Player",
  playerCode: "ABC123",
  selectedCharacter: "pano",
  avatar: "https://via.placeholder.com/150",
  statsByMode: {
    solo: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
    online: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
    overall: { wins: 0, losses: 0, draws: 0, trophies: 0, xp: 0, level: 1 },
  },
  unlockedCharacters: ["pano"],
  gold: 100,
  gems: 0,
  achievements: [],
  claimedRewards: [],
  createdAt: Date.now(),
  lastActive: Date.now(),
  preferences: {
    defaultMode: "normal",
    defaultCharacter: "pano",
    soundEnabled: true,
    musicEnabled: true,
  },
  ...overrides,
});

export const createTestPlayerState = (
  overrides?: Partial<PlayerState>,
): PlayerState => ({
  life: 4,
  ammo: 3,
  dodgeStreak: 0,
  selectedCard: null,
  animationState: "idle",
  ...overrides,
});

export const createTestGameState = (
  overrides?: Partial<GameState>,
): GameState => ({
  mode: "normal",
  difficulty: "normal",
  phase: "selecting",
  turn: 1,
  roundCount: 1,
  bestOf3: {
    playerWins: 0,
    opponentWins: 0,
  },
  player: createTestPlayerState(),
  opponent: createTestPlayerState(),
  turnHistory: [],
  roomId: null,
  roomCode: null,
  matchStartTime: null,
  matchEndTime: null,
  ...overrides,
});

export const createTestRoom = (overrides?: Partial<Room>): Room => ({
  id: "room-" + Math.random().toString(36).slice(7),
  hostId: "host-uid",
  guestId: null,
  hostName: "Host Player",
  guestName: null,
  mode: "normal",
  difficulty: "normal",
  isPublic: false,
  hostChoice: null,
  guestChoice: null,
  status: "waiting",
  bestOf3Enabled: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  config: {
    attackTimer: 10,
    autoResolve: true,
  },
  ...overrides,
});

export const createTestTurnResult = (
  overrides?: Partial<TurnResult>,
): TurnResult => ({
  turn: 1,
  playerCard: "shot",
  opponentCard: "dodge",
  playerLifeLost: 0,
  opponentLifeLost: 0,
  playerAmmoChange: -1,
  opponentAmmoChange: 0,
  narrative: "You shot but opponent dodged!",
  result: "opponent_dodged",
  timestamp: Date.now(),
  ...overrides,
});

export const createTestMatchSummary = (
  overrides?: Partial<MatchSummary>,
): MatchSummary => ({
  matchId: "match-" + Math.random().toString(36).slice(7),
  uid: "test-uid",
  characterId: "pano",
  mode: "online",
  difficulty: "normal",
  result: "win",
  shots: 5,
  doubleShots: 2,
  dodges: 3,
  reloads: 4,
  counters: 1,
  damageDealt: 8,
  damageTaken: 4,
  turnsPlayed: 15,
  dodgeRate: 0.2,
  remainingHealth: 3,
  opponentCharacterId: "stormtrooper",
  opponentPlayerCode: "OPP001",
  timestamp: Date.now(),
  xpGained: 50,
  trophiesGained: 10,
  goldGained: 25,
  achievementsUnlocked: [],
  ...overrides,
});

export const createTestLeaderboardEntry = (
  overrides?: Partial<LeaderboardEntry>,
): LeaderboardEntry => ({
  uid: "test-uid",
  playerCode: "ABCD01",
  displayName: "Test Player",
  avatar: "https://via.placeholder.com/150",
  level: 5,
  trophies: 250,
  wins: 15,
  losses: 5,
  draws: 2,
  winRate: 0.75,
  mode: "overall",
  lastUpdated: Date.now(),
  rank: 1,
  ...overrides,
});

export const createTestAchievement = (
  overrides?: Partial<Achievement>,
): Achievement => ({
  id: "first_win",
  name: "First Victory",
  description: "Win your first match",
  unlockedAt: Date.now(),
  reward: {
    gold: 50,
    gems: 0,
  },
  category: "milestone",
  rarity: "common",
  ...overrides,
});

export const createTestUserPreferences = (
  overrides?: Partial<UserPreferences>,
): UserPreferences => ({
  defaultMode: "normal",
  defaultCharacter: "pano",
  soundEnabled: true,
  musicEnabled: true,
  notificationsEnabled: true,
  theme: "dark",
  ...overrides,
});

/**
 * Seed-based deterministic data generation for consistent test outcomes
 */
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const createDeterministicUser = (seed: number): User => {
  const random = () => seededRandom(seed++);
  return createTestUser({
    uid: `seed-user-${seed}`,
    playerCode: `CODE${Math.floor(random() * 10000)
      .toString()
      .padStart(4, "0")}`,
    statsByMode: {
      solo: {
        wins: Math.floor(random() * 20),
        losses: Math.floor(random() * 20),
        draws: Math.floor(random() * 5),
        trophies: Math.floor(random() * 500),
        xp: Math.floor(random() * 1000),
        level: Math.floor(random() * 10) + 1,
      },
      online: {
        wins: Math.floor(random() * 20),
        losses: Math.floor(random() * 20),
        draws: Math.floor(random() * 5),
        trophies: Math.floor(random() * 500),
        xp: Math.floor(random() * 1000),
        level: Math.floor(random() * 10) + 1,
      },
      overall: {
        wins: Math.floor(random() * 40),
        losses: Math.floor(random() * 40),
        draws: Math.floor(random() * 10),
        trophies: Math.floor(random() * 1000),
        xp: Math.floor(random() * 2000),
        level: Math.floor(random() * 15) + 1,
      },
    },
  });
};
