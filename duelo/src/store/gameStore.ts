import { create } from "zustand";
import { ref, update } from "firebase/database";
import { rtdb } from "../lib/firebase";
import type {
  GameState,
  GameMode,
  CardType,
  AttackTimer,
  RoomConfig,
  TurnResult,
} from "../types";
import {
  LIFE_BY_MODE,
  resolveCards,
  checkWinner,
  MAX_DODGE_STREAK,
  MAX_DOUBLE_SHOT_USES,
} from "../lib/gameEngine";
import { getClassMasteryLevelForClass } from "../lib/progression";
import { botChooseCard, initBotPersona } from "../lib/botAI";
import { CHARACTERS, getCharacter, getCharacterClass } from "../lib/characters";
import { useAuthStore } from "./authStore";

// ─── Solo Game Persistence (localStorage) ────────────────────────────────────
const SOLO_MATCH_KEY = "bbd_active_solo_match";

interface SavedSoloMatch {
  mode: GameMode;
  turn: number;
  player: GameState["player"];
  opponent: GameState["opponent"];
  history: TurnResult[];
  bestOf3: boolean;
  currentRound: number;
  playerStars: number;
  opponentStars: number;
  hideOpponentAmmo: boolean;
  attackTimer: AttackTimer;
  savedAt: number;
}

function _persistSoloState(state: GameState): void {
  if (state.isOnline) return;
  if (state.phase === "idle" || state.phase === "game_over") return;
  try {
    const saved: SavedSoloMatch = {
      mode: state.mode,
      turn: state.turn,
      player: {
        ...state.player,
        selectedCard: null,
        choiceRevealed: false,
        isAnimating: false,
        currentAnimation: "idle",
      },
      opponent: {
        ...state.opponent,
        selectedCard: null,
        choiceRevealed: false,
        isAnimating: false,
        currentAnimation: "idle",
      },
      history: state.history,
      bestOf3: state.bestOf3,
      currentRound: state.currentRound,
      playerStars: state.playerStars,
      opponentStars: state.opponentStars,
      hideOpponentAmmo: state.hideOpponentAmmo,
      attackTimer: state.attackTimer,
      savedAt: Date.now(),
    };
    localStorage.setItem(SOLO_MATCH_KEY, JSON.stringify(saved));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export function getSavedSoloMatch(): SavedSoloMatch | null {
  try {
    const raw = localStorage.getItem(SOLO_MATCH_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedSoloMatch;
    if (Date.now() - saved.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SOLO_MATCH_KEY);
      return null;
    }
    return saved;
  } catch {
    localStorage.removeItem(SOLO_MATCH_KEY);
    return null;
  }
}

export function clearSavedSoloMatch(): void {
  localStorage.removeItem(SOLO_MATCH_KEY);
}

interface GameStore extends GameState {
  initializeGame: (
    mode: GameMode,
    isOnline: boolean,
    isHost: boolean,
    roomId?: string,
    playerAvatar?: string,
    config?: Partial<RoomConfig>,
    playerDisplayName?: string,
    playerAvatarPicture?: string,
  ) => void;
  selectCard: (card: CardType) => void;
  resolveTurn: () => void;
  setPhase: (phase: GameState["phase"]) => void;
  quitGame: () => void;
  syncFromFirebase: (roomData: any, isHost: boolean) => void;
  nextRound: () => void;
  restoreSoloMatch: () => boolean;
}

const initialState: GameState = {
  id: "",
  mode: "beginner",
  phase: "idle",
  turn: 1,
  player: {
    id: "player1",
    displayName: "Pistoleiro",
    avatar: "marshal",
    life: 3,
    maxLife: 3,
    ammo: 0,
    maxAmmo: 3,
    selectedCard: null,
    choiceRevealed: false,
    isAnimating: false,
    currentAnimation: "idle",
    wins: 0,
    dodgeStreak: 0,
    doubleShotsLeft: MAX_DOUBLE_SHOT_USES,
    characterClass: "atirador",
    classMasteryLevel: 1,
    shieldUsesLeft: 2,
  },
  opponent: {
    id: "bot",
    displayName: "El Diablo",
    avatar: "skull",
    life: 3,
    maxLife: 3,
    ammo: 0,
    maxAmmo: 3,
    selectedCard: null,
    choiceRevealed: false,
    isAnimating: false,
    currentAnimation: "idle",
    wins: 0,
    dodgeStreak: 0,
    doubleShotsLeft: MAX_DOUBLE_SHOT_USES,
    characterClass: "sorrateiro",
    classMasteryLevel: 1,
    shieldUsesLeft: 2,
  },
  lastResult: null,
  isOnline: false,
  isHost: false,
  roomId: null,
  roomStatus: "waiting",
  winnerId: null,
  history: [],
  // Room config defaults
  attackTimer: 10,
  bestOf3: false,
  hideOpponentAmmo: false,
  currentRound: 1,
  playerStars: 0,
  opponentStars: 0,
  roundWinnerId: null,
};

// Flag para prevenir múltiplas resoluções simultâneas
let _isResolving = false;

// Host-authoritative TurnResult for the guest to consume instead of
// resolving independently with its own Math.random() rolls.
let _pendingHostResult: TurnResult | null = null;

// When guest detects both choices but the host TurnResult hasn't arrived yet
let _waitingForHostResult = false;

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  initializeGame: (
    mode,
    isOnline,
    isHost,
    roomId,
    playerAvatar = "marshal",
    config = {},
    playerDisplayName = "Pistoleiro",
    playerAvatarPicture = undefined,
  ) => {
    _isResolving = false;
    _pendingHostResult = null;
    _waitingForHostResult = false;
    const life = LIFE_BY_MODE[mode];
    // Usar TODOS os personagens disponíveis, não apenas 3
    const allAvatarIds = CHARACTERS.map((c) => c.id);
    const opponentAvatars = allAvatarIds.filter((a) => a !== playerAvatar);
    const opponentAvatar =
      opponentAvatars[Math.floor(Math.random() * opponentAvatars.length)];

    // Fixed attack timer and ammo visibility for solo
    const attackTimer: AttackTimer = (config.attackTimer ?? 10) as AttackTimer;

    const opponentCharDef = getCharacter(opponentAvatar);
    const currentUser = useAuthStore.getState().user;
    const playerClass = getCharacterClass(playerAvatar);
    const playerMasteryLevel = getClassMasteryLevelForClass(
      currentUser?.classMastery,
      playerClass,
    );

    // Solo: always hide opponent ammo (matches hard-difficulty behaviour)
    // Online: use room config (default false = visible)
    const shouldHideAmmo = isOnline ? (config.hideOpponentAmmo ?? false) : true;

    // Pick a random bot persona for this match (varies strategy each game)
    if (!isOnline) initBotPersona(mode);

    set({
      ...initialState,
      mode,
      isOnline,
      isHost: isOnline ? isHost : false,
      roomId: roomId || null,
      phase: "selecting",
      attackTimer,
      bestOf3: config.bestOf3 ?? false,
      hideOpponentAmmo: shouldHideAmmo,
      currentRound: 1,
      playerStars: 0,
      opponentStars: 0,
      roundWinnerId: null,
      player: {
        ...initialState.player,
        id: currentUser?.uid ?? initialState.player.id,
        life,
        maxLife: life,
        avatar: playerAvatar,
        avatarPicture: playerAvatarPicture,
        displayName: playerDisplayName,
        characterClass: playerClass,
        classMasteryLevel: playerMasteryLevel,
        shieldUsesLeft: 2,
      },
      opponent: {
        ...initialState.opponent,
        id: isOnline
          ? isHost
            ? currentUser?.uid
              ? `pending_guest_for_${currentUser.uid}`
              : "pending_guest"
            : "pending_host"
          : initialState.opponent.id,
        life,
        maxLife: life,
        avatar: opponentAvatar,
        displayName: opponentCharDef.name,
        characterClass: getCharacterClass(opponentAvatar),
        classMasteryLevel: playerMasteryLevel,
        shieldUsesLeft: 2,
      },
    });

    // Persist initial solo state so a brand-new game can be resumed after a reload
    if (!isOnline) {
      _persistSoloState(get());
    }
  },

  selectCard: (card) => {
    const state = get();
    if (state.phase !== "selecting") return;

    set({
      player: { ...state.player, selectedCard: card },
    });

    // Solo mode: bot escolhe a carta mas NÃO resolve até confirmar ou timer
    if (!state.isOnline) {
      const thinkDelay = 1200 + Math.random() * 1200;
      setTimeout(() => {
        const currentState = get();
        if (currentState.phase !== "selecting") return;
        // If opponent already pre-decided a card (bot decided after last round),
        // do not re-decide when the player selects a card. This prevents the
        // bot from changing its choice on each player interaction.
        if (currentState.opponent.selectedCard) return;

        const pHistory = currentState.history.map((h) => h.playerCard);
        const botCard = botChooseCard(
          currentState.opponent,
          pHistory,
          currentState.mode,
          currentState.player,
        );
        set({
          opponent: { ...currentState.opponent, selectedCard: botCard },
        });
        // NÃO chama resolveTurn() aqui - aguarda botão confirmar ou timer
      }, thinkDelay);
    }
  },

  resolveTurn: () => {
    if (_isResolving) return;
    const state = get();
    if (!state.player.selectedCard || !state.opponent.selectedCard) return;
    if (state.phase !== "selecting") return;

    _isResolving = true;

    // ── Guest safety guard: never compute ability rolls independently ──
    // The host is the single source of truth for random outcomes.
    // If the host result hasn't arrived yet via RTDB, we'll be called again
    // by syncFromFirebase once it does.
    if (state.isOnline && !state.isHost && !_pendingHostResult) {
      _isResolving = false;
      return;
    }

    // Capturar os valores ANTES de qualquer update
    const pCard = state.player.selectedCard;
    const oCard = state.opponent.selectedCard;
    const pAmmo = state.player.ammo;
    const oAmmo = state.opponent.ammo;
    const pLife = state.player.life;
    const oLife = state.opponent.life;

    // ── Compute result NOW (before animations) ──
    // Host uses resolveCards() with Math.random() ability rolls.
    // Guest uses the host-authoritative result received via RTDB.
    // Both clients are guaranteed the exact same outcome.
    let result: TurnResult;
    if (state.isOnline && !state.isHost && _pendingHostResult) {
      result = _pendingHostResult;
      _pendingHostResult = null;
    } else {
      result = resolveCards(
        pCard,
        oCard,
        pAmmo,
        oAmmo,
        state.mode,
        state.turn,
        state.player.characterClass,
        state.opponent.characterClass,
        state.player.classMasteryLevel ?? 1,
        state.opponent.classMasteryLevel ?? 1,
        state.player.shieldUsesLeft,
        state.opponent.shieldUsesLeft,
        state.player.doubleShotsLeft,
        state.opponent.doubleShotsLeft,
        pLife,
        oLife,
        state.player.maxLife,
        state.opponent.maxLife,
      );
    }

    // ── Host broadcasts result to RTDB IMMEDIATELY ──
    // Writing before animations means the guest receives the result and can
    // start its own animation cycle at nearly the same time as the host.
    if (state.isOnline && state.isHost && state.roomId) {
      const roomRef = ref(rtdb, `rooms/${state.roomId}`);
      update(roomRef, {
        lastTurnResult: {
          turn: result.turn,
          hostCard: result.playerCard,
          guestCard: result.opponentCard,
          hostLifeLost: result.playerLifeLost,
          guestLifeLost: result.opponentLifeLost,
          hostAmmoChange: result.playerAmmoChange,
          guestAmmoChange: result.opponentAmmoChange,
          narrative: result.narrative,
          hostAbilityTriggered: result.playerAbilityTriggered ?? null,
          guestAbilityTriggered: result.opponentAbilityTriggered ?? null,
          hostShieldUsed: result.playerShieldUsed ?? false,
          guestShieldUsed: result.opponentShieldUsed ?? false,
          hostDoubleShotReloaded: result.playerDoubleShotReloaded ?? false,
          guestDoubleShotReloaded: result.opponentDoubleShotReloaded ?? false,
        },
      }).catch((e) =>
        console.error("[resolveTurn] RTDB lastTurnResult write error:", e),
      );
    }

    set({
      phase: "revealing",
      player: { ...state.player, choiceRevealed: true },
      opponent: { ...state.opponent, choiceRevealed: true },
    });

    setTimeout(() => {
      set({ phase: "resolving" });

      const cardToAnim = (
        card: CardType,
      ): "shoot" | "dodge" | "reload" | "counter" | "idle" => {
        if (card === "shot" || card === "double_shot") return "shoot";
        if (card === "dodge") return "dodge";
        if (card === "reload") return "reload";
        if (card === "counter") return "counter";
        return "idle";
      };

      const currentState = get();

      const pAnim = result.playerLifeLost > 0 ? "hit" : cardToAnim(pCard);
      const oAnim = result.opponentLifeLost > 0 ? "hit" : cardToAnim(oCard);

      const newPlayerLife = Math.min(
        currentState.player.maxLife,
        Math.max(0, pLife - result.playerLifeLost),
      );
      const newOpponentLife = Math.min(
        currentState.opponent.maxLife,
        Math.max(0, oLife - result.opponentLifeLost),
      );
      const newPlayerAmmo = Math.min(
        3,
        Math.max(0, pAmmo + result.playerAmmoChange),
      );
      const newOpponentAmmo = Math.min(
        3,
        Math.max(0, oAmmo + result.opponentAmmoChange),
      );

      const newPlayer = {
        ...currentState.player,
        life: newPlayerLife,
        ammo: newPlayerAmmo,
        currentAnimation: (newPlayerLife <= 0 ? "death" : pAnim) as any,
        isAnimating: true,
        dodgeStreak:
          pCard === "dodge"
            ? Math.min(
                MAX_DODGE_STREAK,
                (currentState.player.dodgeStreak ?? 0) + 1,
              )
            : 0,
        doubleShotsLeft: Math.min(
          3,
          (pCard === "double_shot"
            ? Math.max(
                0,
                (currentState.player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES) -
                  1,
              )
            : (currentState.player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES)) +
            (result.playerDoubleShotReloaded ? 1 : 0),
        ),
        shieldUsesLeft: result.playerShieldUsed
          ? Math.max(0, (currentState.player.shieldUsesLeft ?? 2) - 1)
          : (currentState.player.shieldUsesLeft ?? 2),
      };
      const newOpponent = {
        ...currentState.opponent,
        life: newOpponentLife,
        ammo: newOpponentAmmo,
        currentAnimation: (newOpponentLife <= 0 ? "death" : oAnim) as any,
        isAnimating: true,
        dodgeStreak:
          oCard === "dodge"
            ? Math.min(
                MAX_DODGE_STREAK,
                (currentState.opponent.dodgeStreak ?? 0) + 1,
              )
            : 0,
        doubleShotsLeft: Math.min(
          3,
          (oCard === "double_shot"
            ? Math.max(
                0,
                (currentState.opponent.doubleShotsLeft ??
                  MAX_DOUBLE_SHOT_USES) - 1,
              )
            : (currentState.opponent.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES)) +
            (result.opponentDoubleShotReloaded ? 1 : 0),
        ),
        shieldUsesLeft: result.opponentShieldUsed
          ? Math.max(0, (currentState.opponent.shieldUsesLeft ?? 2) - 1)
          : (currentState.opponent.shieldUsesLeft ?? 2),
      };

      const winner = checkWinner(newPlayer, newOpponent);

      set({
        player: newPlayer,
        opponent: newOpponent,
        lastResult: result,
        history: [...currentState.history, result],
        phase: "animating",
        winnerId: winner,
      });

      setTimeout(async () => {
        _isResolving = false;
        const afterAnimState = get();

        const roundWinner = afterAnimState.winnerId; // may be player.id, opponent.id, 'draw', or null

        // ====== BEST-OF-3 LOGIC ======
        if (roundWinner && afterAnimState.bestOf3) {
          const isDraw = roundWinner === "draw";
          const isPlayerWin = roundWinner === afterAnimState.player.id;

          const newPlayerStars =
            afterAnimState.playerStars + (isPlayerWin ? 1 : 0);
          const newOpponentStars =
            afterAnimState.opponentStars + (!isPlayerWin && !isDraw ? 1 : 0);

          // HOST: sync stars to Firebase
          if (
            afterAnimState.isOnline &&
            afterAnimState.roomId &&
            afterAnimState.isHost
          ) {
            try {
              const roomRef = ref(rtdb, `rooms/${afterAnimState.roomId}`);
              const matchOver = newPlayerStars >= 2 || newOpponentStars >= 2;
              await update(roomRef, {
                hostStars: afterAnimState.isHost
                  ? newPlayerStars
                  : newOpponentStars,
                guestStars: afterAnimState.isHost
                  ? newOpponentStars
                  : newPlayerStars,
                hostLife: afterAnimState.player.life,
                guestLife: afterAnimState.opponent.life,
                hostAmmo: afterAnimState.player.ammo,
                guestAmmo: afterAnimState.opponent.ammo,
                hostDodgeStreak: afterAnimState.player.dodgeStreak ?? 0,
                guestDodgeStreak: afterAnimState.opponent.dodgeStreak ?? 0,
                hostDoubleShotsLeft:
                  afterAnimState.player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
                guestDoubleShotsLeft:
                  afterAnimState.opponent.doubleShotsLeft ??
                  MAX_DOUBLE_SHOT_USES,
                hostShieldUsesLeft: afterAnimState.player.shieldUsesLeft ?? 2,
                guestShieldUsesLeft:
                  afterAnimState.opponent.shieldUsesLeft ?? 2,
                hostChoice: null,
                guestChoice: null,
                lastTurnResult: null,
                turn: afterAnimState.turn + 1,
                status: matchOver ? "finished" : "in_progress",
              });
            } catch (e) {
              console.error("Firebase sync error:", e);
            }
          }

          if (newPlayerStars >= 2 || newOpponentStars >= 2) {
            // Match over
            set({
              playerStars: newPlayerStars,
              opponentStars: newOpponentStars,
              roundWinnerId: roundWinner,
              phase: "game_over",
            });
            if (!afterAnimState.isOnline) clearSavedSoloMatch();
          } else {
            // Round over — show interstitial, then auto-start next round
            set({
              playerStars: newPlayerStars,
              opponentStars: newOpponentStars,
              roundWinnerId: roundWinner,
              phase: "round_over",
            });
            if (!afterAnimState.isOnline) _persistSoloState(get());
            setTimeout(() => {
              get().nextRound();
            }, 3500);
          }
          return;
        }

        // ====== NORMAL (no best-of-3) ======
        // HOST: sincronizar resultado ao Firebase
        if (
          afterAnimState.isOnline &&
          afterAnimState.roomId &&
          afterAnimState.isHost
        ) {
          try {
            const roomRef = ref(rtdb, `rooms/${afterAnimState.roomId}`);
            await update(roomRef, {
              hostLife: afterAnimState.player.life,
              guestLife: afterAnimState.opponent.life,
              hostAmmo: afterAnimState.player.ammo,
              guestAmmo: afterAnimState.opponent.ammo,
              hostDodgeStreak: afterAnimState.player.dodgeStreak ?? 0,
              guestDodgeStreak: afterAnimState.opponent.dodgeStreak ?? 0,
              hostDoubleShotsLeft:
                afterAnimState.player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
              guestDoubleShotsLeft:
                afterAnimState.opponent.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
              hostShieldUsesLeft: afterAnimState.player.shieldUsesLeft ?? 2,
              guestShieldUsesLeft: afterAnimState.opponent.shieldUsesLeft ?? 2,
              hostChoice: null,
              guestChoice: null,
              lastTurnResult: null,
              turn: afterAnimState.turn + 1,
              status: afterAnimState.winnerId ? "finished" : "in_progress",
            });
          } catch (e) {
            console.error("Firebase sync error:", e);
          }
        }

        if (afterAnimState.winnerId) {
          set({ phase: "game_over" });
          if (!afterAnimState.isOnline) clearSavedSoloMatch();
        } else {
          set((curr) => ({
            phase: "selecting" as const,
            turn: curr.turn + 1,
            player: {
              ...curr.player,
              selectedCard: null,
              choiceRevealed: false,
              isAnimating: false,
              currentAnimation: "idle" as any,
            },
            opponent: {
              ...curr.opponent,
              selectedCard: null,
              choiceRevealed: false,
              isAnimating: false,
              currentAnimation: "idle" as any,
            },
          }));
          if (!afterAnimState.isOnline) _persistSoloState(get());
          // Solo mode: let the bot pre-decide immediately after the round ends
          // so the decision is stable and visible before the player picks.
          if (!afterAnimState.isOnline) {
            const pHistory = get().history.map((h) => h.playerCard);
            const predecided = botChooseCard(
              get().opponent,
              pHistory,
              get().mode,
              get().player,
            );
            // Only set if not already chosen by other logic
            if (!get().opponent.selectedCard) {
              set({
                opponent: { ...get().opponent, selectedCard: predecided },
              });
            }
          }
        }
      }, 3000);
    }, 1200);
  },

  syncFromFirebase: (roomData, isHost) => {
    if (!roomData) return;
    if (_isResolving) return; // Não atualizar durante resolução

    const myRole = isHost ? "host" : "guest";
    const otherRole = isHost ? "guest" : "host";

    const hostChoice = roomData.hostChoice;
    const guestChoice = roomData.guestChoice;
    const isBothChosen = !!(hostChoice && guestChoice);

    const state = get();

    // Se ambos escolheram e ainda estamos selecionando -> resolver
    if (state.phase === "selecting" && isBothChosen && !_isResolving) {
      // Atualizar as cartas e estado sincronizado antes de decidir quem resolve
      set({
        isHost: isHost,
        isOnline: true,
        mode: roomData.mode || state.mode,
        roomId: roomData.id,
        roomStatus: roomData.status,
        attackTimer: roomData.config?.attackTimer ?? state.attackTimer,
        bestOf3: roomData.config?.bestOf3 ?? state.bestOf3,
        hideOpponentAmmo:
          roomData.config?.hideOpponentAmmo ?? state.hideOpponentAmmo,
        currentRound: roomData.currentRound ?? state.currentRound,
        playerStars: isHost
          ? (roomData.hostStars ?? state.playerStars)
          : (roomData.guestStars ?? state.playerStars),
        opponentStars: isHost
          ? (roomData.guestStars ?? state.opponentStars)
          : (roomData.hostStars ?? state.opponentStars),
        player: {
          ...state.player,
          id: isHost
            ? (roomData.hostId ?? state.player.id)
            : (roomData.guestId ?? state.player.id),
          life: roomData[`${myRole}Life`] ?? state.player.life,
          ammo: roomData[`${myRole}Ammo`] ?? state.player.ammo,
          dodgeStreak:
            roomData[`${myRole}DodgeStreak`] ?? state.player.dodgeStreak ?? 0,
          doubleShotsLeft:
            roomData[`${myRole}DoubleShotsLeft`] ??
            state.player.doubleShotsLeft ??
            MAX_DOUBLE_SHOT_USES,
          shieldUsesLeft:
            roomData[`${myRole}ShieldUsesLeft`] ??
            state.player.shieldUsesLeft ??
            2,
          displayName:
            (isHost ? roomData.hostName : roomData.guestName) ||
            state.player.displayName,
          selectedCard:
            (roomData[`${myRole}Choice`] as CardType) ||
            state.player.selectedCard,
          classMasteryLevel:
            roomData[`${myRole}ClassMasteryLevel`] ??
            state.player.classMasteryLevel ??
            1,
        },
        opponent: {
          ...state.opponent,
          id: isHost
            ? (roomData.guestId ?? state.opponent.id)
            : (roomData.hostId ?? state.opponent.id),
          displayName: isHost
            ? roomData.guestName || "Inimigo"
            : roomData.hostName || "Host",
          life: roomData[`${otherRole}Life`] ?? state.opponent.life,
          ammo: roomData[`${otherRole}Ammo`] ?? state.opponent.ammo,
          dodgeStreak:
            roomData[`${otherRole}DodgeStreak`] ??
            state.opponent.dodgeStreak ??
            0,
          doubleShotsLeft:
            roomData[`${otherRole}DoubleShotsLeft`] ??
            state.opponent.doubleShotsLeft ??
            MAX_DOUBLE_SHOT_USES,
          shieldUsesLeft:
            roomData[`${otherRole}ShieldUsesLeft`] ??
            state.opponent.shieldUsesLeft ??
            2,
          selectedCard: roomData[`${otherRole}Choice`] as CardType,
          choiceRevealed: true,
          avatar: isHost
            ? (roomData.guestAvatar ?? state.opponent.avatar)
            : (roomData.hostAvatar ?? state.opponent.avatar),
          avatarPicture: isHost
            ? (roomData.guestAvatarPicture ?? state.opponent.avatarPicture)
            : (roomData.hostAvatarPicture ?? state.opponent.avatarPicture),
          characterClass: getCharacterClass(
            isHost
              ? (roomData.guestAvatar ?? state.opponent.avatar)
              : (roomData.hostAvatar ?? state.opponent.avatar),
          ),
          classMasteryLevel:
            roomData[`${otherRole}ClassMasteryLevel`] ??
            state.opponent.classMasteryLevel ??
            1,
        },
      });

      // ── Decide who triggers resolution ──
      // Host always resolves (computes ability rolls with Math.random()).
      // Guest resolves ONLY after receiving the host-authoritative result via
      // RTDB — this ensures both clients apply the exact same outcome,
      // regardless of which machine's RNG would have produced different rolls.
      if (!isHost) {
        if (roomData.lastTurnResult) {
          const htr = roomData.lastTurnResult;
          if (htr.turn === (roomData.turn ?? state.turn)) {
            // Host result already in RTDB — map to guest perspective and resolve
            _pendingHostResult = {
              turn: htr.turn,
              playerCard: htr.guestCard,
              opponentCard: htr.hostCard,
              playerLifeLost: htr.guestLifeLost,
              opponentLifeLost: htr.hostLifeLost,
              playerAmmoChange: htr.guestAmmoChange,
              opponentAmmoChange: htr.hostAmmoChange,
              narrative: htr.narrative,
              playerAbilityTriggered: htr.guestAbilityTriggered || undefined,
              opponentAbilityTriggered: htr.hostAbilityTriggered || undefined,
              playerShieldUsed: htr.guestShieldUsed ?? false,
              opponentShieldUsed: htr.hostShieldUsed ?? false,
              playerDoubleShotReloaded: htr.guestDoubleShotReloaded ?? false,
              opponentDoubleShotReloaded: htr.hostDoubleShotReloaded ?? false,
            };
            _waitingForHostResult = false;
            setTimeout(() => get().resolveTurn(), 100);
          } else {
            // Turn mismatch — wait for the correct turn's result
            _waitingForHostResult = true;
          }
        } else {
          // Host hasn't resolved yet — wait; syncFromFirebase will re-fire
          // when lastTurnResult arrives in RTDB
          _waitingForHostResult = true;
        }
      } else {
        // Host resolves authoritatively
        setTimeout(() => get().resolveTurn(), 100);
      }
      return;
    }

    // ── Guest waiting for host result that arrived in a later sync event ──
    if (
      _waitingForHostResult &&
      !isHost &&
      !_isResolving &&
      roomData.lastTurnResult
    ) {
      const htr = roomData.lastTurnResult;
      const currentTurn = roomData.turn ?? state.turn;
      if (htr.turn === currentTurn && isBothChosen) {
        _pendingHostResult = {
          turn: htr.turn,
          playerCard: htr.guestCard,
          opponentCard: htr.hostCard,
          playerLifeLost: htr.guestLifeLost,
          opponentLifeLost: htr.hostLifeLost,
          playerAmmoChange: htr.guestAmmoChange,
          opponentAmmoChange: htr.hostAmmoChange,
          narrative: htr.narrative,
          playerAbilityTriggered: htr.guestAbilityTriggered || undefined,
          opponentAbilityTriggered: htr.hostAbilityTriggered || undefined,
          playerShieldUsed: htr.guestShieldUsed ?? false,
          opponentShieldUsed: htr.hostShieldUsed ?? false,
          playerDoubleShotReloaded: htr.guestDoubleShotReloaded ?? false,
          opponentDoubleShotReloaded: htr.hostDoubleShotReloaded ?? false,
        };
        _waitingForHostResult = false;

        // Now resolve with the host's result
        setTimeout(() => {
          get().resolveTurn();
        }, 100);
        return;
      }
    }

    // Update normal de estado (sem resolução)
    set((curr) => ({
      mode: roomData.mode || curr.mode,
      roomId: roomData.id,
      roomStatus: roomData.status,
      isOnline: true,
      isHost: isHost,
      turn: roomData.turn ?? curr.turn,
      // Sync room config
      attackTimer: roomData.config?.attackTimer ?? curr.attackTimer,
      bestOf3: roomData.config?.bestOf3 ?? curr.bestOf3,
      hideOpponentAmmo:
        roomData.config?.hideOpponentAmmo ?? curr.hideOpponentAmmo,
      currentRound: roomData.currentRound ?? curr.currentRound,
      playerStars: isHost
        ? (roomData.hostStars ?? curr.playerStars)
        : (roomData.guestStars ?? curr.playerStars),
      opponentStars: isHost
        ? (roomData.guestStars ?? curr.opponentStars)
        : (roomData.hostStars ?? curr.opponentStars),
      player: {
        ...curr.player,
        id: isHost
          ? (roomData.hostId ?? curr.player.id)
          : (roomData.guestId ?? curr.player.id),
        life: roomData[`${myRole}Life`] ?? curr.player.life,
        ammo: roomData[`${myRole}Ammo`] ?? curr.player.ammo,
        dodgeStreak:
          roomData[`${myRole}DodgeStreak`] ?? curr.player.dodgeStreak ?? 0,
        doubleShotsLeft:
          roomData[`${myRole}DoubleShotsLeft`] ??
          curr.player.doubleShotsLeft ??
          MAX_DOUBLE_SHOT_USES,
        shieldUsesLeft:
          roomData[`${myRole}ShieldUsesLeft`] ??
          curr.player.shieldUsesLeft ??
          2,
        displayName:
          (isHost ? roomData.hostName : roomData.guestName) ||
          curr.player.displayName,
        selectedCard:
          curr.phase === "selecting"
            ? curr.player.selectedCard ||
              (roomData[`${myRole}Choice`] as CardType) ||
              null
            : null,
        classMasteryLevel:
          roomData[`${myRole}ClassMasteryLevel`] ??
          curr.player.classMasteryLevel ??
          1,
      },
      opponent: {
        ...curr.opponent,
        id: isHost
          ? (roomData.guestId ?? curr.opponent.id)
          : (roomData.hostId ?? curr.opponent.id),
        displayName: isHost
          ? roomData.guestName || "Inimigo"
          : roomData.hostName || "Host",
        avatar: isHost
          ? (roomData.guestAvatar ?? curr.opponent.avatar)
          : (roomData.hostAvatar ?? curr.opponent.avatar),
        avatarPicture: isHost
          ? (roomData.guestAvatarPicture ?? curr.opponent.avatarPicture)
          : (roomData.hostAvatarPicture ?? curr.opponent.avatarPicture),
        characterClass: getCharacterClass(
          isHost
            ? (roomData.guestAvatar ?? curr.opponent.avatar)
            : (roomData.hostAvatar ?? curr.opponent.avatar),
        ),
        classMasteryLevel:
          roomData[`${otherRole}ClassMasteryLevel`] ??
          curr.opponent.classMasteryLevel ??
          1,
        life: roomData[`${otherRole}Life`] ?? curr.opponent.life,
        ammo: roomData[`${otherRole}Ammo`] ?? curr.opponent.ammo,
        dodgeStreak:
          roomData[`${otherRole}DodgeStreak`] ?? curr.opponent.dodgeStreak ?? 0,
        doubleShotsLeft:
          roomData[`${otherRole}DoubleShotsLeft`] ??
          curr.opponent.doubleShotsLeft ??
          MAX_DOUBLE_SHOT_USES,
        shieldUsesLeft:
          roomData[`${otherRole}ShieldUsesLeft`] ??
          curr.opponent.shieldUsesLeft ??
          2,
        selectedCard: null,
        choiceRevealed: false,
      },
    }));
  },

  nextRound: () => {
    const state = get();
    const life = LIFE_BY_MODE[state.mode];
    _isResolving = false;
    _pendingHostResult = null;
    _waitingForHostResult = false;
    set((curr) => ({
      turn: 1,
      winnerId: null,
      roundWinnerId: null,
      lastResult: null,
      history: [],
      phase: "selecting" as const,
      currentRound: curr.currentRound + 1,
      player: {
        ...curr.player,
        life,
        maxLife: life,
        ammo: 0,
        selectedCard: null,
        choiceRevealed: false,
        isAnimating: false,
        currentAnimation: "idle" as any,
        dodgeStreak: 0,
        doubleShotsLeft: MAX_DOUBLE_SHOT_USES,
      },
      opponent: {
        ...curr.opponent,
        life,
        maxLife: life,
        ammo: 0,
        selectedCard: null,
        choiceRevealed: false,
        isAnimating: false,
        currentAnimation: "idle" as any,
        dodgeStreak: 0,
        doubleShotsLeft: MAX_DOUBLE_SHOT_USES,
      },
    }));

    // Host syncs the new round to Firebase
    const after = get();
    if (after.isOnline && after.isHost && after.roomId) {
      const roomRef = ref(rtdb, `rooms/${after.roomId}`);
      update(roomRef, {
        turn: 1,
        currentRound: after.currentRound,
        hostChoice: null,
        guestChoice: null,
        lastTurnResult: null,
        hostLife: life,
        guestLife: life,
        hostAmmo: 0,
        guestAmmo: 0,
        hostDodgeStreak: 0,
        guestDodgeStreak: 0,
        hostDoubleShotsLeft: MAX_DOUBLE_SHOT_USES,
        guestDoubleShotsLeft: MAX_DOUBLE_SHOT_USES,
        hostShieldUsesLeft: after.player.shieldUsesLeft ?? 2,
        guestShieldUsesLeft: after.opponent.shieldUsesLeft ?? 2,
        status: "in_progress",
      }).catch((e) => console.error("nextRound sync error:", e));
    }

    // Solo: persist new round state
    if (!after.isOnline) _persistSoloState(after);
  },

  setPhase: (phase) => set({ phase }),

  restoreSoloMatch: () => {
    const saved = getSavedSoloMatch();
    if (!saved) return false;
    _isResolving = false;
    set({
      ...initialState,
      mode: saved.mode,
      turn: saved.turn,
      phase: "selecting",
      isOnline: false,
      isHost: false,
      roomId: null,
      attackTimer: saved.attackTimer,
      bestOf3: saved.bestOf3,
      hideOpponentAmmo: saved.hideOpponentAmmo,
      currentRound: saved.currentRound,
      playerStars: saved.playerStars,
      opponentStars: saved.opponentStars,
      player: {
        ...saved.player,
        selectedCard: null,
        choiceRevealed: false,
        isAnimating: false,
        currentAnimation: "idle",
      },
      opponent: {
        ...saved.opponent,
        selectedCard: null,
        choiceRevealed: false,
        isAnimating: false,
        currentAnimation: "idle",
      },
      history: saved.history,
      winnerId: null,
      roundWinnerId: null,
      lastResult: null,
    });
    return true;
  },

  quitGame: () => {
    _isResolving = false;
    _pendingHostResult = null;
    _waitingForHostResult = false;
    clearSavedSoloMatch();
    set(initialState);
  },
}));
