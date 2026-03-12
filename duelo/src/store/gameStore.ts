import { create } from "zustand";
import { ref, update } from "firebase/database";
import { rtdb } from "../lib/firebase";
import type {
  GameState,
  GameMode,
  CardType,
  BotDifficulty,
  AttackTimer,
  RoomConfig,
} from "../types";
import {
  LIFE_BY_MODE,
  resolveCards,
  checkWinner,
  MAX_DODGE_STREAK,
  MAX_DOUBLE_SHOT_USES,
} from "../lib/gameEngine";
import { botChooseCard } from "../lib/botAI";
import { CHARACTERS, getCharacter, getCharacterClass } from "../lib/characters";

interface GameStore extends GameState {
  initializeGame: (
    mode: GameMode,
    isOnline: boolean,
    isHost: boolean,
    roomId?: string,
    botDifficulty?: BotDifficulty,
    playerAvatar?: string,
    config?: Partial<RoomConfig>,
    playerDisplayName?: string,
  ) => void;
  selectCard: (card: CardType) => void;
  resolveTurn: () => void;
  setPhase: (phase: GameState["phase"]) => void;
  quitGame: () => void;
  syncFromFirebase: (roomData: any, isHost: boolean) => void;
  nextRound: () => void;
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
    shieldUsesLeft: 2,
  },
  lastResult: null,
  isOnline: false,
  isHost: false,
  roomId: null,
  roomStatus: "waiting",
  winnerId: null,
  history: [],
  botDifficulty: "medium",
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

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  initializeGame: (
    mode,
    isOnline,
    isHost,
    roomId,
    botDifficulty = "medium",
    playerAvatar = "marshal",
    config = {},
    playerDisplayName = "Pistoleiro",
  ) => {
    _isResolving = false;
    const life = LIFE_BY_MODE[mode];
    // Usar TODOS os personagens disponíveis, não apenas 3
    const allAvatarIds = CHARACTERS.map((c) => c.id);
    const opponentAvatars = allAvatarIds.filter((a) => a !== playerAvatar);
    const opponentAvatar =
      opponentAvatars[Math.floor(Math.random() * opponentAvatars.length)];

    // Set attack timer based on difficulty (if not online or not provided in config)
    let attackTimer: AttackTimer = 10;
    if (!config.attackTimer) {
      if (botDifficulty === "easy") {
        attackTimer = 30 as AttackTimer;
      } else if (botDifficulty === "medium") {
        attackTimer = 10 as AttackTimer;
      } else if (botDifficulty === "hard") {
        attackTimer = 5 as AttackTimer;
      }
    }

    const opponentCharDef = getCharacter(opponentAvatar);

    // Determinar se deve ocultar munições do oponente
    // Online: usa config (padrão false), Solo: médio/difícil ocultam, fácil mostra
    const shouldHideAmmo = isOnline
      ? (config.hideOpponentAmmo ?? false)
      : botDifficulty !== "easy";

    set({
      ...initialState,
      mode,
      isOnline,
      isHost: isOnline ? isHost : false,
      roomId: roomId || null,
      botDifficulty: isOnline ? undefined : botDifficulty,
      phase: "selecting",
      attackTimer: (config.attackTimer ?? attackTimer) as AttackTimer,
      bestOf3: config.bestOf3 ?? false,
      hideOpponentAmmo: shouldHideAmmo,
      currentRound: 1,
      playerStars: 0,
      opponentStars: 0,
      roundWinnerId: null,
      player: {
        ...initialState.player,
        life,
        maxLife: life,
        avatar: playerAvatar,
        displayName: playerDisplayName,
        characterClass: getCharacterClass(playerAvatar),
        shieldUsesLeft: 2,
      },
      opponent: {
        ...initialState.opponent,
        life,
        maxLife: life,
        avatar: opponentAvatar,
        displayName: opponentCharDef.name,
        characterClass: getCharacterClass(opponentAvatar),
        shieldUsesLeft: 2,
      },
    });
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
        const pHistory = currentState.history.map((h) => h.playerCard);
        const botCard = botChooseCard(
          currentState.opponent,
          pHistory,
          currentState.mode,
          currentState.botDifficulty || "medium",
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

    // Capturar os valores ANTES de qualquer update
    const pCard = state.player.selectedCard;
    const oCard = state.opponent.selectedCard;
    const pAmmo = state.player.ammo;
    const oAmmo = state.opponent.ammo;
    const pLife = state.player.life;
    const oLife = state.opponent.life;

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
      const result = resolveCards(
        pCard,
        oCard,
        pAmmo,
        oAmmo,
        currentState.mode,
        currentState.turn,
        currentState.player.characterClass,
        currentState.opponent.characterClass,
        currentState.player.shieldUsesLeft,
        currentState.opponent.shieldUsesLeft,
      );

      const pAnim = result.playerLifeLost > 0 ? "hit" : cardToAnim(pCard);
      const oAnim = result.opponentLifeLost > 0 ? "hit" : cardToAnim(oCard);

      const newPlayerLife = Math.max(0, pLife - result.playerLifeLost);
      const newOpponentLife = Math.max(0, oLife - result.opponentLifeLost);
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
        doubleShotsLeft:
          pCard === "double_shot"
            ? Math.max(
                0,
                (currentState.player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES) -
                  1,
              )
            : (currentState.player.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES),
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
        doubleShotsLeft:
          oCard === "double_shot"
            ? Math.max(
                0,
                (currentState.opponent.doubleShotsLeft ??
                  MAX_DOUBLE_SHOT_USES) - 1,
              )
            : (currentState.opponent.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES),
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
                hostChoice: null,
                guestChoice: null,
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
          } else {
            // Round over — show interstitial, then auto-start next round
            set({
              playerStars: newPlayerStars,
              opponentStars: newOpponentStars,
              roundWinnerId: roundWinner,
              phase: "round_over",
            });
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
              hostChoice: null,
              guestChoice: null,
              turn: afterAnimState.turn + 1,
              status: afterAnimState.winnerId ? "finished" : "in_progress",
            });
          } catch (e) {
            console.error("Firebase sync error:", e);
          }
        }

        if (afterAnimState.winnerId) {
          set({ phase: "game_over" });
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
      // Primeiro atualizar as cartas, depois resolver
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
          life: roomData[`${myRole}Life`] ?? state.player.life,
          ammo: roomData[`${myRole}Ammo`] ?? state.player.ammo,
          displayName:
            (isHost ? roomData.hostName : roomData.guestName) ||
            state.player.displayName,
          selectedCard:
            (roomData[`${myRole}Choice`] as CardType) ||
            state.player.selectedCard,
        },
        opponent: {
          ...state.opponent,
          displayName: isHost
            ? roomData.guestName || "Inimigo"
            : roomData.hostName || "Host",
          life: roomData[`${otherRole}Life`] ?? state.opponent.life,
          ammo: roomData[`${otherRole}Ammo`] ?? state.opponent.ammo,
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
        },
      });

      // Breve delay para garantir que o state foi aplicado antes de resolver
      setTimeout(() => {
        get().resolveTurn();
      }, 100);
      return;
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
        life: roomData[`${myRole}Life`] ?? curr.player.life,
        ammo: roomData[`${myRole}Ammo`] ?? curr.player.ammo,
        displayName:
          (isHost ? roomData.hostName : roomData.guestName) ||
          curr.player.displayName,
        selectedCard:
          curr.phase === "selecting"
            ? curr.player.selectedCard ||
              (roomData[`${myRole}Choice`] as CardType) ||
              null
            : null,
      },
      opponent: {
        ...curr.opponent,
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
        life: roomData[`${otherRole}Life`] ?? curr.opponent.life,
        ammo: roomData[`${otherRole}Ammo`] ?? curr.opponent.ammo,
        selectedCard: null,
        choiceRevealed: false,
      },
    }));
  },

  nextRound: () => {
    const state = get();
    const life = LIFE_BY_MODE[state.mode];
    _isResolving = false;
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
        hostLife: life,
        guestLife: life,
        hostAmmo: 0,
        guestAmmo: 0,
        status: "in_progress",
      }).catch((e) => console.error("nextRound sync error:", e));
    }
  },

  setPhase: (phase) => set({ phase }),
  quitGame: () => {
    _isResolving = false;
    set(initialState);
  },
}));
