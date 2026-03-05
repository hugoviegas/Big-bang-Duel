
# ============================================================
# DUELO — MASTER PROMPT FOR FULL GAME DEVELOPMENT
# AI: Gemini 3 Pro via Antigravity | Stack: React + Firebase + Vercel
# ============================================================

You are a senior full-stack game developer and UI/UX designer.
Your task is to build a complete, production-ready online multiplayer
card game called **Big Bang Duel** from scratch.

Follow every instruction in this document precisely. Do not skip sections.
When in doubt, build MORE than asked, never less.

---

## 1. PROJECT OVERVIEW

Big Bang Duel is a 2-player real-time card game inspired by classic American
Western cowboy pistol duels. Each player has a pistol and must
eliminate the opponent by strategically choosing cards each turn.
Cards are selected secretly and revealed simultaneously, creating
psychological tension and bluffing opportunities.

The game has 3 difficulty modes:
- BEGINNER (Iniciante)
- NORMAL
- ADVANCED (Avançado)

---

## 2. TECH STACK

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** TailwindCSS + custom CSS animations (no emoji, only images/SVGs)
- **State Management:** Zustand
- **Real-time:** Firebase Realtime Database (for live game sync)
- **Auth:** Firebase Authentication (Email/Password + Google OAuth)
- **Database:** Firebase Firestore (user profiles, leaderboard, match history)
- **Storage:** Firebase Storage (user avatars if needed)
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Image Assets:** All character art, card illustrations, backgrounds and
  effects must be generated via Gemini image generation (prompts provided
  in Section 9 and 10 of this document). Export as WebP for performance.
- **Audio:** Howler.js for sound effects (gunshot, reload, dodge, win/lose)
- **Animations:** Framer Motion + custom CSS keyframes

---

## 3. FOLDER STRUCTURE

duelo/
├── public/
│   └── assets/
│       ├── characters/         # Generated character art
│       │   ├── player_idle.webp
│       │   ├── player_shoot.webp
│       │   ├── player_dodge.webp
│       │   ├── player_reload.webp
│       │   ├── player_hit.webp
│       │   ├── player_death.webp
│       │   ├── villain_idle.webp
│       │   ├── villain_shoot.webp
│       │   ├── villain_dodge.webp
│       │   ├── villain_reload.webp
│       │   ├── villain_hit.webp
│       │   └── villain_death.webp
│       ├── cards/              # Card face art
│       │   ├── card_shot.webp
│       │   ├── card_double_shot.webp
│       │   ├── card_dodge.webp
│       │   ├── card_reload.webp
│       │   └── card_counter.webp
│       ├── effects/            # Particle/effect art
│       │   ├── muzzle_flash.webp
│       │   ├── bullet_trail.webp
│       │   ├── dust_dodge.webp
│       │   ├── smoke_reload.webp
│       │   ├── counter_spark.webp
│       │   └── blood_splat.webp (cartoon style, non-graphic)
│       ├── ui/                 # UI elements
│       │   ├── heart_full.webp
│       │   ├── heart_empty.webp
│       │   ├── bullet_full.webp
│       │   ├── bullet_empty.webp
│       │   ├── logo.webp
│       │   ├── bg_desert.webp
│       │   ├── bg_saloon.webp
│       │   └── wood_panel.webp
│       └── audio/
│           ├── gunshot.mp3
│           ├── double_shot.mp3
│           ├── dodge.mp3
│           ├── reload.mp3
│           ├── counter.mp3
│           ├── hit.mp3
│           ├── win.mp3
│           ├── lose.mp3
│           ├── draw.mp3
│           ├── card_flip.mp3
│           ├── bg_music.mp3
│           └── crowd_cheer.mp3
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── game/
│   │   │   ├── GameArena.tsx       # Main game screen
│   │   │   ├── Character.tsx       # Animated character component
│   │   │   ├── CardHand.tsx        # Player's card selection row
│   │   │   ├── CardItem.tsx        # Individual card with flip animation
│   │   │   ├── StatusBar.tsx       # Life + ammo indicators
│   │   │   ├── TurnResult.tsx      # Round result overlay
│   │   │   ├── GameOver.tsx        # Win/Lose/Draw screen
│   │   │   ├── BotThinking.tsx     # Bot "thinking" animation
│   │   │   └── EffectOverlay.tsx   # Particle effects layer
│   │   ├── lobby/
│   │   │   ├── MainMenu.tsx
│   │   │   ├── ModeSelect.tsx
│   │   │   ├── OnlineLobby.tsx
│   │   │   ├── WaitingRoom.tsx
│   │   │   └── RoomCard.tsx
│   │   ├── leaderboard/
│   │   │   └── Leaderboard.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Tooltip.tsx
│   │       └── Toast.tsx
│   ├── hooks/
│   │   ├── useGame.ts
│   │   ├── useFirebase.ts
│   │   ├── useAuth.ts
│   │   ├── useBot.ts
│   │   └── useSound.ts
│   ├── store/
│   │   ├── gameStore.ts
│   │   ├── authStore.ts
│   │   └── lobbyStore.ts
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── gameEngine.ts       # Core game logic
│   │   ├── botAI.ts            # Bot strategy logic
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts
│   ├── pages/
│   │   ├── index.tsx           # Landing/Login
│   │   ├── menu.tsx
│   │   ├── game.tsx
│   │   ├── online.tsx
│   │   └── leaderboard.tsx
│   └── styles/
│       ├── globals.css
│       ├── animations.css
│       └── western.css
├── firebase.json
├── .env.local
├── vite.config.ts
└── vercel.json

---

## 4. TYPESCRIPT TYPES (src/types/index.ts)

\`\`\`typescript
export type GameMode = 'beginner' | 'normal' | 'advanced';
export type CardType = 'shot' | 'double_shot' | 'dodge' | 'reload' | 'counter';
export type GamePhase =
  | 'idle'
  | 'selecting'
  | 'revealing'
  | 'resolving'
  | 'animating'
  | 'game_over';

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
  currentAnimation: 'idle' | 'shoot' | 'dodge' | 'reload' | 'hit' | 'death' | 'counter';
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
  roomId: string | null;
  winnerId: string | null;
  history: TurnResult[];
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
  guestId: string | null;
  mode: GameMode;
  status: 'waiting' | 'in_progress' | 'finished';
  gameState: GameState;
  createdAt: number;
}
\`\`\`

---

## 5. COMPLETE GAME ENGINE (src/lib/gameEngine.ts)

Build a pure function-based engine with NO side effects.

\`\`\`typescript
// CARD DEFINITIONS PER MODE
export const CARDS_BY_MODE: Record<GameMode, CardType[]> = {
  beginner: ['shot', 'dodge', 'reload'],
  normal:   ['shot', 'double_shot', 'dodge', 'reload'],
  advanced: ['shot', 'double_shot', 'dodge', 'reload', 'counter'],
};

export const LIFE_BY_MODE: Record<GameMode, number> = {
  beginner: 3,
  normal:   4,
  advanced: 4,
};

export const MAX_AMMO = 3;

// RESOLUTION MATRIX
// resolveCards(playerCard, opponentCard, playerAmmo, opponentAmmo) → TurnResult
//
// FULL LOGIC TABLE (all 25 combinations in advanced mode):
//
// shot vs shot         → both -1 ammo, both -1 life
// shot vs double_shot  → player -1 ammo -2 life, opponent -2 ammo -1 life
// shot vs dodge        → player -1 ammo, opponent safe
// shot vs reload       → player -1 ammo, opponent -1 life (reload fails)
// shot vs counter      → player -1 ammo -1 life (counter hit), opponent -1 ammo safe
// double_shot vs shot  → player -2 ammo -1 life, opponent -1 ammo -2 life
// double_shot vs dbl   → both -2 ammo, both -2 life
// double_shot vs dodge → player -2 ammo, opponent safe (both bullets dodged)
// double_shot vs reload→ player -2 ammo, opponent -2 life (reload fails)
// double_shot vs counter→ player -2 ammo -1 life, opponent -1 ammo safe (counter deflects all)
// dodge vs shot        → player safe, opponent -1 ammo
// dodge vs double_shot → player safe, opponent -2 ammo
// dodge vs dodge       → nothing
// dodge vs reload      → opponent +1 ammo
// dodge vs counter     → opponent -1 ammo wasted (player didn't shoot)
// reload vs shot       → player -1 life (reload interrupted), opponent -1 ammo
// reload vs double_shot→ player -2 life (reload interrupted), opponent -2 ammo
// reload vs dodge      → player +1 ammo, opponent nothing
// reload vs reload     → both +1 ammo
// reload vs counter    → player +1 ammo, opponent -1 ammo wasted
// counter vs shot      → player -1 ammo +dodge +counter hit, opponent -1 ammo -1 life
// counter vs double_shot→player -1 ammo +dodge +counter hit, opponent -2 ammo -1 life
// counter vs dodge     → player -1 ammo wasted, opponent safe
// counter vs reload    → player -1 ammo wasted, opponent +1 ammo
// counter vs counter   → both -1 ammo (no shots fired = no counter trigger)
//
// IMPORTANT RULES:
// - shot requires minAmmo = 1. If player has 0, they cannot select it.
// - double_shot requires minAmmo = 2.
// - counter requires minAmmo = 1. Costs 1 ammo ALWAYS, even if not triggered.
// - reload cap: if ammo == MAX_AMMO, reload has no effect (wasted turn).
// - ammo can never go below 0 or above MAX_AMMO.
// - When a character dies, the death animation plays before game over screen.
//
// NARRATIVE STRINGS (display in TurnResult overlay):
// Map every combination to an exciting Western-style narrative string, examples:
// "shot vs reload" → "Você atirou em plena recarga! Adversário atingido!"
// "counter vs shot" → "CONTRA GOLPE! Desviou e atirou de volta!"
// "double_shot vs counter" → "Tiro Duplo bloqueado! Contra golpe certeiro!"
// Generate all 25 narratives.

export function resolveCards(
  pCard: CardType,
  oCard: CardType,
  pAmmo: number,
  oAmmo: number,
  mode: GameMode
): TurnResult { /* ... full implementation ... */ }

export function getAvailableCards(mode: GameMode, ammo: number): CardType[] {
  return CARDS_BY_MODE[mode].filter(card => {
    if (card === 'shot') return ammo >= 1;
    if (card === 'double_shot') return ammo >= 2;
    if (card === 'counter') return ammo >= 1;
    return true; // dodge and reload always available
  });
}

export function checkWinner(player: PlayerState, opponent: PlayerState): string | null {
  if (player.life <= 0 && opponent.life <= 0) return 'draw';
  if (player.life <= 0) return opponent.id;
  if (opponent.life <= 0) return player.id;
  return null;
}
\`\`\`

---

## 6. BOT AI (src/lib/botAI.ts)

Implement 3 difficulty levels for solo play:

\`\`\`typescript
export type BotDifficulty = 'easy' | 'medium' | 'hard';

// EASY BOT: purely random from available cards
// MEDIUM BOT: weighted probability based on situation:
//   - ammo = 0 → 80% reload, 20% dodge
//   - ammo = 1 → 40% shot, 30% dodge, 30% reload
//   - ammo = 2 → 35% shot, 25% double_shot, 20% dodge, 20% reload
//   - ammo = 3 → 30% shot, 40% double_shot, 15% dodge, 15% reload
//   - advanced mode: counter has 15% chance when ammo >= 1
// HARD BOT: pattern recognition — tracks player's last 3 moves and
//   calculates the best counter based on frequency analysis.
//   If player used reload 2+ times in a row → shoot next turn.
//   If player shot last turn → use dodge or counter.
//   If player used counter last turn → use reload (counter wastes ammo).
//   Adds slight randomness (20%) to avoid being too predictable.

export function botChooseCard(
  botState: PlayerState,
  playerHistory: CardType[],
  mode: GameMode,
  difficulty: BotDifficulty
): CardType { /* ... full implementation ... */ }
\`\`\`

---

## 7. FIREBASE ARCHITECTURE

### 7.1 Firebase Config (src/lib/firebase.ts)
\`\`\`typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
\`\`\`

### 7.2 Firestore Collections

**Collection: users/{uid}**
\`\`\`json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "avatar": "villain | hero (string selector for character)",
  "wins": 0,
  "losses": 0,
  "draws": 0,
  "totalGames": 0,
  "winRate": 0.0,
  "favoriteMode": "beginner | normal | advanced",
  "createdAt": "timestamp",
  "lastSeen": "timestamp"
}
\`\`\`

**Collection: matches/{matchId}**
\`\`\`json
{
  "matchId": "string",
  "player1Id": "string",
  "player2Id": "string | 'bot'",
  "mode": "beginner | normal | advanced",
  "winnerId": "string | 'draw'",
  "totalTurns": 0,
  "history": [ TurnResult ],
  "playedAt": "timestamp",
  "durationSeconds": 0
}
\`\`\`

**Collection: leaderboard/{uid}** (denormalized for fast reads)
\`\`\`json
{
  "uid": "string",
  "displayName": "string",
  "avatar": "string",
  "wins": 0,
  "totalGames": 0,
  "winRate": 0.0,
  "updatedAt": "timestamp"
}
\`\`\`

### 7.3 Firebase Realtime Database — Online Rooms

**Path: /rooms/{roomId}**
\`\`\`json
{
  "roomId": "string",
  "hostId": "string",
  "guestId": "string | null",
  "mode": "beginner | normal | advanced",
  "status": "waiting | in_progress | finished",
  "hostChoice": "null | CardType",
  "guestChoice": "null | CardType",
  "hostReady": false,
  "guestReady": false,
  "gameState": {
    "turn": 0,
    "hostLife": 4,
    "guestLife": 4,
    "hostAmmo": 0,
    "guestAmmo": 0,
    "phase": "selecting",
    "lastResult": null
  },
  "createdAt": "timestamp"
}
\`\`\`

**Realtime flow:**
1. Host creates room → writes to /rooms/{roomId} with status: 'waiting'
2. Guest joins → writes guestId, status: 'in_progress'
3. Each player selects card → writes their choice (hostChoice / guestChoice)
4. When BOTH choices are set (not null) → the HOST client resolves the turn
   using gameEngine.resolveCards() and writes the new gameState
5. Both clients watch /rooms/{roomId} for changes and animate accordingly
6. On game over → write final result to Firestore (matches + leaderboard update)

**Cheat prevention:** Choices are encrypted before writing to RTDB using
a simple XOR with the roomId as key. Both sides decrypt before resolving.

---

## 8. AUTHENTICATION FLOWS

### Login Screen
- Western-themed full-screen background (desert sunset)
- Game logo centered at top with idle animation (slight float)
- Two options: "ENTRAR" (Login) and "CRIAR CONTA" (Register)
- Email + Password fields with wooden-panel style
- "Entrar com Google" button with Google OAuth
- Animated wanted-poster frame around the form
- On success → navigate to Main Menu

### Register Screen
- Same aesthetic as Login
- Fields: Nome de Pistoleiro (displayName), Email, Password, Confirm Password
- Character selection: choose between Hero or Villain character avatar
- Validation: displayName min 3 chars, password min 6 chars
- Creates Firestore user document on success

### Auth Guard
- Wrap all game routes with AuthGuard component
- Redirect unauthenticated users to login
- Show loading animation (spinning sheriff star) while checking auth state

---

## 9. CHARACTER DESIGN — IMAGE GENERATION PROMPTS

Generate these images using Gemini image generation.
Style reference: Cuphead (1930s rubber hose animation) + Wild West.
All characters must have exaggerated proportions, thick black outlines,
bold flat colors, and a hand-drawn ink look. No photorealism.

### Character 1: THE MARSHAL (Hero / Player Character)

Generate 6 sprites, each as a transparent-background WebP, 400x600px:

**marshal_idle.webp**
"A cartoon cowboy hero in Cuphead rubber-hose 1930s animation style,
wide-brimmed golden sheriff hat, red bandana around neck, brown leather
vest with a shining gold star badge, white shirt, dark trousers with
holster, oversized white gloved hands, round friendly face with big
white eyes and thick black pupils, slight confident smirk. He sways
gently. Thick black outlines, bold flat colors, hand-inked style.
Transparent background. Full body, 3/4 view facing right."

**marshal_shoot.webp**
"Same cartoon cowboy sheriff as before, in dramatic shooting pose:
arm extended forward pointing a large cartoon revolver, eyes squinting
with focus, muzzle flash burst at gun tip (yellow/orange star-shaped),
left hand on hip, hat tilted back slightly. Thick black outlines,
Cuphead style. Transparent background."

**marshal_dodge.webp**
"Same cartoon cowboy sheriff, dramatic side-leap dodge pose: body
leaning sharply to the left, legs off ground, arms splayed wide, eyes
wide and surprised but confident, hat flying off slightly, motion
lines behind him. Cuphead rubber-hose style. Transparent background."

**marshal_reload.webp**
"Same cartoon cowboy sheriff, reload animation pose: looking down at
gun held in both hands, cracking cylinder open, small cartridges
flying out, focused expression, smoke wisps from barrel.
Cuphead style. Transparent background."

**marshal_hit.webp**
"Same cartoon cowboy sheriff, reacting to being shot: body jerked
backward, eyes turned to X shapes, stars spinning around head,
hat knocked askew, small cartoon impact burst on chest (red starburst).
Cuphead style. Transparent background."

**marshal_death.webp**
"Same cartoon cowboy sheriff in defeat: slumped on ground, sitting
against imaginary wall, hat covering face, white flag cartoon-popping
from hand, X eyes, small birds or stars orbiting his head.
Cuphead style. Transparent background."

---

### Character 2: EL DIABLO (Villain / Bot / Opponent Character)

**diablo_idle.webp**
"A menacing cartoon outlaw villain in Cuphead rubber-hose 1930s style:
tall black sombrero with red skull decoration, long black cape/duster
coat, red-and-black striped shirt, twin holsters with two revolvers,
devilish grin with pointed teeth, glowing red eyes with yellow pupils,
thin curled mustache, slightly hunched menacing posture.
Thick black outlines, bold flat colors. Transparent background.
Full body, 3/4 view facing left."

**diablo_shoot.webp**
"Same villain outlaw El Diablo, firing both pistols simultaneously:
both arms extended with large cartoon revolvers, double muzzle flashes,
evil grin stretched wide, sombrero vibrating from recoil, dramatic
lean forward. Cuphead style. Transparent background."

**diablo_dodge.webp**
"Same villain El Diablo, dramatic backflip dodge: fully inverted
mid-air backflip, cape flowing dramatically upward, revolvers still
in hands, evil laughing expression, motion blur trails. Cuphead style.
Transparent background."

**diablo_reload.webp**
"Same villain El Diablo, reloading with theatrical flair: spinning
one revolver on his finger while loading the other, smug grin,
cartridges forming an arc in the air. Cuphead style. Transparent background."

**diablo_hit.webp**
"Same villain El Diablo, hit reaction: body twisted from impact,
sombrero flipped upward, one revolver dropped, angry X eyes,
red impact burst, teeth clenched. Cuphead style. Transparent background."

**diablo_death.webp**
"Same villain El Diablo, defeat: dramatically collapsed in heap,
sombrero covering him like a tent, both revolvers dropped beside him,
X eyes visible under sombrero brim, small devils flying around him.
Cuphead style. Transparent background."

---

## 10. CARD ARTWORK — IMAGE GENERATION PROMPTS

All cards: 300x420px, transparent background, Cuphead + Wild West style.
Each card has a central illustration with bold decorative western border.

**card_shot.webp**
"A single large cartoon revolver pointing forward center-frame, dramatic
perspective foreshortening, muzzle flash at tip, smoke wisps, engraved
barrel with western floral details. Bold black outlines, flat colors
(brown, gold, orange). Western decorative card border with rope motif.
1930s Cuphead animation style."

**card_double_shot.webp**
"Two crossed cartoon revolvers pointing outward in an X pattern, double
muzzle flashes, dramatic lighting, extra smoke. Bold badge-style
background circle behind the guns. Gold and red color palette.
Western ornate border. Cuphead style."

**card_dodge.webp**
"A cartoon cowboy boot and spur kicking sideways in a dodge motion,
speed lines radiating outward, dust cloud puff at heel. Blue and white
color palette to suggest swift movement. Western rope border. Cuphead style."

**card_reload.webp**
"A cartoon hand holding a cylinder being loaded with bullets, individual
cartridges floating in arc formation being loaded in. Warm brown and
copper tones. Simple western border. Cuphead style."

**card_counter.webp**
"A cartoon cowboy hand catching a bullet mid-air between two fingers
(exaggerated), shocked bullet with face expression, spark bursts around
fingers, electric energy crackle. Purple and gold dramatic palette.
Ornate western border with lightning motifs. Cuphead style."

---

## 11. EFFECT ANIMATIONS — CSS + FRAMER MOTION

### Card Selection Effect
\`\`\`css
/* Card hover: lift + glow */
.card-item:hover {
  transform: translateY(-20px) scale(1.05);
  filter: drop-shadow(0 10px 20px rgba(255, 200, 50, 0.8));
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Card selected: golden pulse */
.card-item.selected {
  animation: selectedPulse 0.5s ease-out forwards;
}

@keyframes selectedPulse {
  0%   { transform: scale(1); filter: brightness(1); }
  50%  { transform: scale(1.15); filter: brightness(1.5) sepia(1) hue-rotate(10deg); }
  100% { transform: scale(1.08) translateY(-15px); filter: brightness(1.3); }
}

/* Card flip reveal animation */
.card-flip-container { perspective: 1000px; }
.card-flip {
  transform-style: preserve-3d;
  animation: flipReveal 0.6s ease-in-out forwards;
}
@keyframes flipReveal {
  0%   { transform: rotateY(0deg); }
  50%  { transform: rotateY(90deg); }
  100% { transform: rotateY(0deg); }
}
\`\`\`

### Shooting Effect (Framer Motion)
\`\`\`typescript
// Bullet trail flying from shooter to opponent
const bulletVariants = {
  hidden: { x: 0, opacity: 0, scale: 0 },
  visible: { x: 800, opacity: [0, 1, 1, 0], scale: [0, 1.5, 1, 0] },
};
<motion.img
  src="/assets/effects/bullet_trail.webp"
  variants={bulletVariants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.3, ease: "easeIn" }}
/>
\`\`\`

### Screen Shake (on hit)
\`\`\`css
@keyframes screenShake {
  0%,100% { transform: translate(0,0); }
  10%     { transform: translate(-8px, -4px); }
  20%     { transform: translate(8px, 4px); }
  30%     { transform: translate(-8px, 4px); }
  40%     { transform: translate(8px, -4px); }
  50%     { transform: translate(-6px, -2px); }
  60%     { transform: translate(6px, 2px); }
  70%     { transform: translate(-4px, 2px); }
  80%     { transform: translate(4px, -2px); }
  90%     { transform: translate(-2px, 1px); }
}
.screen-shake { animation: screenShake 0.5s cubic-bezier(.36,.07,.19,.97); }
\`\`\`

### Character Animations
\`\`\`typescript
// Character uses Framer Motion variants
const charVariants = {
  idle:    { y: [0, -8, 0], transition: { repeat: Infinity, duration: 2 } },
  shoot:   { x: [0, 20, 0], transition: { duration: 0.3 } },
  dodge:   { x: [0, -60, 0], y: [0, -30, 0], transition: { duration: 0.4 } },
  reload:  { rotate: [0, -10, 0], transition: { duration: 0.5 } },
  hit:     { x: [0, -20, 20, -10, 0], transition: { duration: 0.4 } },
  death:   { y: [0, 100], opacity: [1, 0.5, 0], transition: { duration: 0.8 } },
  counter: { scale: [1, 1.3, 0.9, 1.1, 1], transition: { duration: 0.5 } },
};
\`\`\`

### Muzzle Flash
\`\`\`typescript
// Muzzle flash: appears for 150ms at gun position
const MuzzleFlash = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.img
        src="/assets/effects/muzzle_flash.webp"
        initial={{ scale: 0, opacity: 1, rotate: 0 }}
        animate={{ scale: [0, 2, 1.5], opacity: [1, 1, 0], rotate: 15 }}
        transition={{ duration: 0.15 }}
        className="absolute top-1/2 right-0 w-24 h-24"
      />
    )}
  </AnimatePresence>
);
\`\`\`

### Life Lost Animation
\`\`\`typescript
// Heart breaks and falls when life is lost
const HeartBreak = () => (
  <motion.img
    src="/assets/ui/heart_full.webp"
    animate={{ y: [0, -20, 40], rotate: [0, -20, 20], opacity: [1, 1, 0] }}
    transition={{ duration: 0.6 }}
    className="absolute w-8 h-8"
  />
);
\`\`\`

### Turn Result Overlay
\`\`\`typescript
// Large dramatic text overlay for round result
const TurnResultOverlay = ({ narrative }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }}
    transition={{ duration: 2.5, times: [0, 0.2, 0.5, 1] }}
    className="absolute inset-0 flex items-center justify-center z-50"
  >
    <div className="bg-black/60 text-yellow-300 font-western text-4xl
                    px-8 py-4 rounded-lg border-4 border-yellow-500
                    text-center max-w-sm">
      {narrative}
    </div>
  </motion.div>
);
\`\`\`

---

## 12. UI DESIGN SYSTEM

### Color Palette
\`\`\`css
:root {
  --color-sand:       #D4A855;
  --color-sand-light: #F0D080;
  --color-brown-dark: #3B1F0A;
  --color-brown-mid:  #7B4A1E;
  --color-red-west:   #C0392B;
  --color-gold:       #FFD700;
  --color-sky:        #87CEEB;
  --color-sunset-1:   #FF6B35;
  --color-sunset-2:   #F7C59F;
  --color-black-ink:  #1A0A00;
  --color-parchment:  #F5E6C8;
}
\`\`\`

### Typography
- Title font: "Rye" (Google Fonts) — Western serif for headings
- Body font: "Permanent Marker" — casual handwritten for narrative text
- UI font: "Oswald" — condensed sans for stats and numbers
- Import all three from Google Fonts in index.html

### Background
- Desert scene with parallax: distant mountains (slowest) → cactus
  silhouettes (medium) → ground/dirt road (fastest) → dust particles
- Implement CSS parallax with three layers scrolling on a CSS animation
- A looping tumbleweed rolls across the screen every 15 seconds
- Sky transitions based on game state: blue (normal) → orange-red (when
  someone is at 1 life) → dark/stormy (during counter or double shot)

### Main Arena Layout (Desktop 1440px)
\`\`\`
┌──────────────────────────────────────────────────────────────┐
│  DUELO LOGO           [Turn: 3]          [⚙️ Menu]           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [MARSHAL STATUS]                    [EL DIABLO STATUS]      │
│  ❤️❤️❤️ 🔵🔵🔵                          ❤️❤️❤️ 🔵🔵🔵            │
│                                                              │
│       [MARSHAL SPRITE]          [EL DIABLO SPRITE]           │
│         (animated)                  (animated)               │
│                                                              │
│              ── DESERT GROUND ──                             │
├──────────────────────────────────────────────────────────────┤
│  YOUR CARDS:                                                 │
│  [SHOT] [DODGE] [RELOAD] [DOUBLE SHOT] [COUNTER]             │
│         (hover to preview) (click to select)                 │
│  [Confirm Selection] ← button appears after card chosen      │
└──────────────────────────────────────────────────────────────┘
\`\`\`

### Mobile Layout (< 768px)
- Stack vertically: logo → status bars → arena (smaller sprites, side by side)
  → card hand (scrollable row) → confirm button
- Cards in a horizontal scroll row at the bottom, each 100px wide
- Touch: tap card to select, tap again to deselect, tap Confirm to lock in
- Prevent accidental selections: require 0.3s hold OR double-tap to confirm

### Tablet Layout (768px–1200px)
- Same as desktop but sprites 80% size, cards slightly smaller
- Two-column layout possible: arena left, cards right

---

## 13. ONLINE MULTIPLAYER SCREENS

### Main Menu
- Animated logo entrance (drops from sky, dust puff on landing)
- Buttons (wooden sign style):
  1. JOGAR SOLO (vs Bot) — with bot difficulty selector
  2. JOGAR ONLINE (vs Player)
  3. RANKING (Leaderboard)
  4. SAIR (Logout)
- Player avatar and name shown top-right with win count

### Online Lobby
- Create Room button → generates 6-character room code
- Join Room input → enter friend's code
- Public Rooms list (max 10 visible, refresh button)
  - Shows: host name, mode, "Aguardando..." status
- Room row: click → send join request
- Waiting Room screen: shows both players' names and avatars once joined
  - "Host" badge on creator
  - Mode selector (host can change)
  - Ready button for both players → starts game when both ready
  - 30-second auto-cancel if guest doesn't ready up

### Disconnect Handling
- If opponent disconnects mid-game → show "Oponente saiu" overlay
- Offer: "Aguardar 30s" or "Abandonar partida"
- If abandons → opponent gets win, leaderboard updates

---

## 14. LEADERBOARD

- Real-time Firestore listener (top 50 players by wins)
- Table columns: Rank, Avatar, Nome, Vitórias, Jogos, Win Rate %
- Top 3 highlighted with Gold/Silver/Bronze western badge frames
- Current logged-in player always shown at bottom of list
  (even if not in top 50), highlighted in gold outline
- Animated entrance: rows slide in from right one by one (stagger 50ms)
- Tabs: ALL TIME | THIS MONTH | THIS WEEK
- Monthly/weekly use Firestore subcollections with TTL

---

## 15. GAME OVER SCREEN

- Full screen overlay with animated western frame
- Show winner character doing victory animation (idle loops with scale)
- Display:
  - "VITÓRIA!" or "DERROTA!" or "EMPATE!" (big western font)
  - Final stats: turns played, biggest damage dealt, cards used breakdown
  - +1 Win / +1 Loss counter with animation
- Buttons:
  - REVANCHE (rematch — same mode, swap sides)
  - MENU PRINCIPAL
- Update Firestore leaderboard: increment wins/losses/totalGames, recalculate winRate

---

## 16. SETTINGS MODAL

- Toggle background music (on/off + volume slider)
- Toggle sound effects
- Toggle screen shake (accessibility)
- Toggle animations (accessibility — disable for motion sensitivity)
- Language: PT-BR / EN (i18n ready, implement Portuguese as default)
- All settings saved to localStorage

---

## 17. RESPONSIVE BREAKPOINTS

\`\`\`typescript
const breakpoints = {
  mobile:  '< 768px',   // single column, touch-optimized
  tablet:  '768–1199px',// two-column with condensed sprites
  desktop: '≥ 1200px',  // full layout as designed
};
\`\`\`

Use TailwindCSS responsive prefixes (sm:, md:, lg:, xl:) throughout.
All tap targets on mobile must be minimum 44x44px (Apple HIG standard).
No horizontal overflow on any screen size.

---

## 18. PERFORMANCE REQUIREMENTS

- First Contentful Paint: < 1.5s
- All game assets preloaded on menu screen with progress bar
- Images as WebP with fallback to PNG
- Lazy load leaderboard and lobby screens
- Firebase listeners unsubscribed on component unmount
- Debounce Firestore writes (no more than 1 write per 500ms)
- Use React.memo and useCallback throughout to prevent re-renders

---

## 19. VERCEL DEPLOYMENT CONFIG (vercel.json)

\`\`\`json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000" }]
    }
  ]
}
\`\`\`

Set environment variables in Vercel dashboard:
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.

---

## 20. FIREBASE SECURITY RULES

### Firestore Rules
\`\`\`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.keys();
    }
    match /leaderboard/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
  }
}
\`\`\`

### Realtime Database Rules
\`\`\`json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null && (
          !data.exists() ||
          data.child('hostId').val() === auth.uid ||
          data.child('guestId').val() === auth.uid ||
          data.child('guestId').val() === null
        )"
      }
    }
  }
}
\`\`\`

---

## 21. ADDITIONAL POLISH DETAILS

- **Wanted Poster Login frame**: The login form is wrapped in an old western
  wanted poster (yellowed parchment texture, "WANTED" header replaced by
  "DUELO" logo), with bullet hole decorations in corners.

- **Dust particles**: Continuous CSS particle system in arena background —
  20 small beige dots floating upward slowly, random sizes 2-6px.

- **Tumbleweed**: A circular rolling SVG tumbleweed crosses the screen
  every 20 seconds using CSS animation translateX(-100vw to 110vw) + rotate.

- **Sheriff star loading**: Loading states use a spinning CSS sheriff star
  badge instead of a default spinner.

- **Tooltip cards**: When hovering a card, a wooden-sign-style tooltip
  appears above showing card name, ammo cost, and description text.

- **History log**: A collapsible side panel showing all previous turns
  as a text log (accessible via small scroll icon). Shows each turn's
  cards and outcome as a short narrative line.

- **Transition between screens**: All screen transitions use a quick
  horizontal wipe (curtain pull) effect — a brown curtain slides across
  and back, revealing the new screen (CSS animation, 400ms).

---

## 22. DEVELOPMENT ORDER (SUGGESTED SPRINT PLAN)

Sprint 1 — Foundation (Days 1-2):
  - Vite + React + TypeScript + TailwindCSS setup
  - Firebase config and Auth (Login + Register screens)
  - Basic routing (pages)
  - Type definitions

Sprint 2 — Game Engine (Days 3-4):
  - gameEngine.ts with all 25 resolution scenarios
  - botAI.ts (all 3 difficulties)
  - Zustand game store
  - Unit tests for all card combinations

Sprint 3 — Solo Game UI (Days 5-7):
  - GameArena layout (desktop + mobile)
  - Character components (static images first, animations later)
  - Card hand + selection logic
  - Status bars (life + ammo)
  - TurnResult overlay
  - GameOver screen
  - Full solo vs bot game loop working end-to-end

Sprint 4 — Visual Polish (Days 8-9):
  - All Framer Motion animations
  - CSS effects (screen shake, muzzle flash, etc.)
  - Background parallax + tumbleweed
  - Sound effects (Howler.js)
  - All generated art assets integrated

Sprint 5 — Online Multiplayer (Days 10-12):
  - Firebase Realtime Database room system
  - Online lobby (create/join room)
  - Real-time game sync
  - Disconnect handling

Sprint 6 — Leaderboard + Final Polish (Days 13-14):
  - Leaderboard screen (Firestore)
  - Match history saves
  - Profile screen
  - Settings modal
  - Responsive audit (mobile, tablet, desktop)
  - Vercel deployment

---

## 23. IMPORTANT IMPLEMENTATION NOTES

1. The game engine must be deterministic: given the same two cards and
   game state, resolveCards() always returns the same result.

2. In online mode, ONLY the host computes the resolution to avoid
   conflicts. The guest observes and both animate simultaneously.

3. Never store the opponent's choice in the client's local state before
   reveal. In RTDB, use Firebase Security Rules to prevent reading the
   opponent's choice field until both choices are set.

4. All monetary/score updates to Firestore must use transactions
   (runTransaction) to prevent race conditions.

5. The bot never "cheats" — it only uses getAvailableCards() to get
   valid options, same as the player.

6. Implement an "opponent is thinking" animation for bot (1.5–3s random
   delay + animated "..." or thinking indicator on bot character) to
   simulate human-like response time and build tension.

7. Mobile: use viewport-height units (svh) not vh to account for
   browser chrome on iOS/Android.

8. Implement haptic feedback on mobile using navigator.vibrate():
   - Card select: 30ms
   - Hit received: 100ms + 80ms + 100ms (triple pulse)
   - Win: 200ms + 100ms + 200ms
   - Lose: 500ms long buzz

NOW BEGIN BUILDING THE PROJECT following every section of this document.
Start with the folder structure and Sprint 1.
Ask no clarifying questions — build everything as specified.
