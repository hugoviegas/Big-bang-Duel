export type GameMode = "beginner" | "normal" | "advanced";
export type CardType = "shot" | "double_shot" | "dodge" | "reload" | "counter";
export type BotDifficulty = "easy" | "medium" | "hard";
export type AttackTimer = 2 | 3 | 5 | 10 | 30;

/**
 * Classes de personagem — cada uma tem uma habilidade passiva com 5% de chance de ativar.
 *  - atirador:     tiro tem chance de ser crítico (2x dano).
 *  - estrategista: recarga tem chance de dar +2 munições ao invés de +1.
 *  - sorrateiro:   qualquer carta tem chance de esquivar de tiros inimigos.
 *  - ricochete:    contra-golpe tem chance de dobrar o dano de retorno.
 *  - sanguinario:  tiro duplo tem chance de consumir apenas 1 munição.
 *  - suporte:      quando leva tiro tem chance de ativar escudo (bloqueia 1 HP, máx 2x por partida).
 */
export type CharacterClass =
  | "atirador"
  | "estrategista"
  | "sorrateiro"
  | "ricochete"
  | "sanguinario"
  | "suporte";

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
  shieldUsesLeft: number; // Suporte class: remaining shield activations this match (max 2)
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
  botDifficulty?: BotDifficulty;
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
  /** True if the player's Suporte shield blocked damage this turn. */
  playerShieldUsed?: boolean;
  /** True if the opponent's Suporte shield blocked damage this turn. */
  opponentShieldUsed?: boolean;
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
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  playerCode: PlayerCode;
  avatar: string;
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
  guestId: string | null;
  guestName: string | null;
  guestAvatar?: string;
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
}
