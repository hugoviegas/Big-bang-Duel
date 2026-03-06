export type GameMode = "beginner" | "normal" | "advanced";
export type CardType = "shot" | "double_shot" | "dodge" | "reload" | "counter";
export type BotDifficulty = "easy" | "medium" | "hard";
export type AttackTimer = 2 | 3 | 5 | 10 | 30;

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
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatar: string;
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
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatar: string;
  wins: number;
  winRate: number;
  totalGames: number;
  rank: number;
}

export interface Room {
  id: string;
  hostId: string;
  hostName: string;
  guestId: string | null;
  guestName: string | null;
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
