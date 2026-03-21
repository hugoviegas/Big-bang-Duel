export type GameMode = "beginner" | "normal" | "advanced";
export type CardType = "shot" | "double_shot" | "dodge" | "reload" | "counter";
export type AttackTimer = 2 | 3 | 5 | 10 | 30;

/**
 * Classes de personagem — cada uma tem habilidade passiva com chance baseada na maestria da classe.
 *  - atirador:     tiro tem chance de ser crítico (2x dano).
 *  - estrategista: recarga tem chance de dar +2 munições ao invés de +1.
 *  - sorrateiro:   qualquer carta tem chance de esquivar de tiros inimigos.
 *  - ricochete:    contra-golpe tem chance de dobrar o dano de retorno.
 *  - sanguinario:  qualquer carta tem chance de recarregar 1 carga de tiro duplo (máx 2x por partida).
 *  - suporte:      Curandeiro: ao usar qualquer carta tem chance de recuperar 1 HP (máx 2x por partida).
 */
export type CharacterClass =
  | "atirador"
  | "estrategista"
  | "sorrateiro"
  | "ricochete"
  | "sanguinario"
  | "suporte";

export interface ClassMasteryState {
  points: number;
  level: number;
}

export type ClassMasteryProgress = Record<CharacterClass, ClassMasteryState>;

/** User preferences that are persisted in Firestore and loaded on every device. */
export interface UserPreferences {
  selectedCharacter: string; // character id, e.g. 'marshal'
  defaultMode: GameMode; // default game mode for quick-play
  defaultAttackTimer: AttackTimer; // default attack timer
  defaultBestOf3: boolean; // default best-of-3 toggle
  defaultIsPublic: boolean; // default room visibility
}

export type GamePhase =
  | "idle"
  | "selecting"
  | "revealing"
  | "resolving"
  | "animating"
  | "round_over"
  | "game_over";

export interface RoomConfig {
  isPublic: boolean;
  attackTimer: AttackTimer; // seconds, 0 = unlimited
  bestOf3: boolean;
  hideOpponentAmmo?: boolean; // hide opponent ammo in online matches
}

export interface Card {
  id: CardType;
  label: string;
  description: string;
  ammoCost: number;
  minAmmoRequired: number;
  image: string; // path to generated WebP
}

export interface PlayerState {
  id: string;
  displayName: string;
  avatar: string;
  life: number;
  maxLife: number;
  ammo: number;
  maxAmmo: number;
  selectedCard: CardType | null;
  choiceRevealed: boolean;
  isAnimating: boolean;
  currentAnimation:
    | "idle"
    | "shoot"
    | "dodge"
    | "reload"
    | "hit"
    | "death"
    | "counter";
  wins: number;
  dodgeStreak: number; // consecutive dodges used this round
  doubleShotsLeft: number; // remaining double_shot uses this round (max 3)
  characterClass: CharacterClass; // passive ability class
  classMasteryLevel?: number; // passive ability mastery level (1-5)
  shieldUsesLeft: number; // remaining capped passive activations this match (Curandeiro/Sanguinário, max 2)
  avatarPicture?: string; // custom profile picture (independent of character)
}

export interface GameState {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  turn: number;
  player: PlayerState;
  opponent: PlayerState;
  lastResult: TurnResult | null;
  isOnline: boolean;
  isHost: boolean;
  roomId: string | null;
  roomStatus?: "waiting" | "in_progress" | "resolving" | "finished";
  winnerId: string | null;
  history: TurnResult[];
  // Room config
  // New config fields
  attackTimer: AttackTimer;
  bestOf3: boolean;
  hideOpponentAmmo: boolean; // hide opponent ammo (online: configurable, solo: based on difficulty)
  currentRound: number; // 1, 2 or 3
  playerStars: number; // rounds won by player
  opponentStars: number; // rounds won by opponent
  roundWinnerId: string | null; // winner of the last round (best-of-3)
}

export interface TurnResult {
  turn: number;
  playerCard: CardType;
  opponentCard: CardType;
  playerLifeLost: number;
  opponentLifeLost: number;
  playerAmmoChange: number;
  opponentAmmoChange: number;
  narrative: string;
  /** Name of the ability that triggered this turn for the player (e.g. 'Tiro Crítico'). */
  playerAbilityTriggered?: string;
  /** Name of the ability that triggered this turn for the opponent. */
  opponentAbilityTriggered?: string;
  /** True if the player's capped passive was used this turn (Curandeiro/Sanguinário). */
  playerShieldUsed?: boolean;
  /** True if the opponent's capped passive was used this turn (Curandeiro/Sanguinário). */
  opponentShieldUsed?: boolean;
  /** True if the player recovered 1 double_shot stack from Sanguinário passive. */
  playerDoubleShotReloaded?: boolean;
  /** True if the opponent recovered 1 double_shot stack from Sanguinário passive. */
  opponentDoubleShotReloaded?: boolean;
}

/** Unique player code in format #XXXXXXXX (hex uppercase). */
export type PlayerCode = string;

export type OnlineStatus = "online" | "offline" | "in_game";

export type MatchMode = "solo" | "online";

export interface ModeStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
}

export interface StatsByMode {
  solo: ModeStats;
  online: ModeStats;
  overall: ModeStats;
}

export interface ProgressionState {
  level: number;
  levelCap: number;
  xpTotal: number;
  xpCurrentLevel: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
}

export interface Currencies {
  gold: number;
  ruby: number;
}

export interface RankedStats {
  trophies: number;
  trophyPeak: number;
}

export interface Unlocks {
  charactersUnlocked: string[];
  cosmeticsUnlocked: string[];
  claimedLevelRewards: number[];
}

/** Per-character career statistics. */
export interface CharacterStats {
  partidas: number;
  vitorias: number;
  derrotas: number;
  tirosDisparados: number;
  recargas: number;
  desvios: number;
  contraGolpes: number;
  tirosDuplos: number;
}

/** Progress state for a single achievement. */
export interface AchievementProgress {
  id: string;
  /** Current unlocked tier (0 = none, 1-5 = tier). */
  level: number;
  /** Accumulated counter towards next tier. */
  progress: number;
  /** Timestamp when the current level was unlocked. */
  unlockedAt?: number;
  /** Highest tier whose reward has been manually claimed. */
  claimedLevel: number;
}

/** Lightweight summary persisted per match for achievement evaluation. */
export interface MatchSummary {
  matchId: string;
  uid: string;
  opponentUid?: string;
  characterId: string;
  opponentCharacterId: string;
  mode: MatchMode;
  result: "win" | "loss" | "draw";
  turns: number;
  /** Player stats in this match */
  shots: number;
  doubleShots: number;
  dodges: number;
  reloads: number;
  counters: number;
  /** Successful dodges (opponent shot but player dodged). */
  successfulDodges: number;
  /** Successful counters (opponent shot but player countered). */
  successfulCounters: number;
  damageTaken: number;
  damageDealt: number;
  /** Player remaining life when match ended. */
  remainingLife: number;
  timestamp: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  /** Unique player code e.g. #A0B1C2D4 — immutable after creation. */
  playerCode: PlayerCode;
  /** ID of the selected character — mirrors preferences.selectedCharacter for fast access. */
  avatar: string;
  /** Custom avatar picture path. When set by the user, overrides the default character profile image. */
  avatarPicture?: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  createdAt: Date;
  lastSeen?: Date;
  favoriteMode?: GameMode;
  isGuest?: boolean;
  expiresAt?: Date | number;
  /** Full preferences object, synced from Firestore. */
  preferences?: UserPreferences;
  /** Current online status. */
  onlineStatus?: OnlineStatus;
  /** Split stats to avoid mixing solo and online ranking. */
  statsByMode?: StatsByMode;
  progression?: ProgressionState;
  currencies?: Currencies;
  ranked?: RankedStats;
  unlocks?: Unlocks;
  /** Per-character career stats. Key = character id. */
  characterStats?: Record<string, CharacterStats>;
  /** Achievement progress. Key = achievement id. */
  achievements?: Record<string, AchievementProgress>;
  /** Class mastery progression used to scale passive ability chances. */
  classMastery?: ClassMasteryProgress;
  /** Character with most matches played. Computed on save. */
  favoriteCharacter?: string;
  /** Class with highest mastery points (tie broken by selected avatar class). */
  favoriteClass?: CharacterClass;
  /** Win streak (consecutive wins, reset on loss/draw). */
  winStreak?: number;
  /** Distinct opponent character ids faced. */
  opponentsFaced?: string[];
  /** Distinct online player uids defeated. */
  onlinePlayersDefeated?: string[];
  /** Count of perfect wins (no damage taken). */
  perfectWins?: number;
  /** Count of wins with 2+ remaining life. */
  highLifeWins?: number;
}

export interface PlayerProfile {
  uid: string;
  displayName: string;
  playerCode: PlayerCode;
  avatar: string;
  /** Custom avatar picture path chosen by the user. */
  avatarPicture?: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  createdAt: number; // timestamp
  lastSeen: number; // timestamp
  onlineStatus: OnlineStatus;
  /** Split stats to avoid mixing solo and online ranking. */
  statsByMode?: StatsByMode;
  progression?: ProgressionState;
  currencies?: Currencies;
  ranked?: RankedStats;
  unlocks?: Unlocks;
  classMastery?: ClassMasteryProgress;
  characterStats?: Record<string, CharacterStats>;
  achievements?: Record<string, AchievementProgress>;
  favoriteCharacter?: string;
  favoriteClass?: CharacterClass;
  winStreak?: number;
  opponentsFaced?: string[];
  onlinePlayersDefeated?: string[];
  perfectWins?: number;
  highLifeWins?: number;
  /** UI preferences persisted per-player: hideInfoTexts and useConfirmButton. */
  uiPreferences?: UIPreferences;
}

export interface UIPreferences {
  hideInfoTexts: boolean;
  useConfirmButton: boolean;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  playerCode: PlayerCode;
  avatar: string;
  /** Custom profile picture — same as PlayerProfile.avatarPicture. */
  avatarPicture?: string;
  wins: number;
  losses: number;
  winRate: number;
  totalGames: number;
  trophies?: number;
  rank: number;
}

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  fromAvatar: string;
  fromAvatarPicture?: string;
  fromPlayerCode: PlayerCode;
  toUid: string;
  status: FriendRequestStatus;
  createdAt: number;
}

export interface Friend {
  uid: string;
  displayName: string;
  playerCode: PlayerCode;
  avatar: string;
  avatarPicture?: string;
  onlineStatus: OnlineStatus;
  lastSeen: number;
  addedAt: number;
  /** If this friend relation was created from a friend request, the request id. */
  friendRequestId?: string;
}

export interface Room {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  hostAvatarPicture?: string;
  hostClassMasteryLevel?: number;
  guestId: string | null;
  guestName: string | null;
  guestAvatar?: string;
  guestAvatarPicture?: string;
  guestClassMasteryLevel?: number;
  hostChoice: string | null;
  guestChoice: string | null;
  mode: GameMode;
  status: "waiting" | "in_progress" | "resolving" | "finished";
  gameState?: GameState;
  createdAt: number;
  // Room configuration
  config: RoomConfig;
  hostStars: number;
  guestStars: number;
  currentRound: number;
  // Phase 2: per-turn state sync fields
  hostLife?: number;
  guestLife?: number;
  hostAmmo?: number;
  guestAmmo?: number;
  turn?: number;
  hostDodgeStreak?: number;
  guestDodgeStreak?: number;
  hostDoubleShotsLeft?: number;
  guestDoubleShotsLeft?: number;
  hostShieldUsesLeft?: number;
  guestShieldUsesLeft?: number;
  // Host-authoritative TurnResult for ability sync
  lastTurnResult?: {
    turn: number;
    hostCard: CardType;
    guestCard: CardType;
    hostLifeLost: number;
    guestLifeLost: number;
    hostAmmoChange: number;
    guestAmmoChange: number;
    narrative: string;
    hostAbilityTriggered?: string | null;
    guestAbilityTriggered?: string | null;
    hostShieldUsed?: boolean;
    guestShieldUsed?: boolean;
    hostDoubleShotReloaded?: boolean;
    guestDoubleShotReloaded?: boolean;
  };
  // Reconnect window: set when a player leaves; cleared when they rejoin
  hostLeftAt?: number;
  guestLeftAt?: number;
  // Emoji quick-chat sync
  hostEmojiEvent?: {
    emoji: string;
    sentAt: number;
    nonce: string;
  };
  guestEmojiEvent?: {
    emoji: string;
    sentAt: number;
    nonce: string;
  };
  hostEmojiSentAt?: number;
  guestEmojiSentAt?: number;
}
