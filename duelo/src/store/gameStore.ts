import { create } from 'zustand';
import type { GameState, GameMode, CardType, BotDifficulty } from '../types';
import { LIFE_BY_MODE, resolveCards, checkWinner } from '../lib/gameEngine';
import { botChooseCard } from '../lib/botAI';

interface GameStore extends GameState {
  initializeGame: (mode: GameMode, isOnline: boolean, roomId?: string, botDifficulty?: BotDifficulty, playerAvatar?: string) => void;
  selectCard: (card: CardType) => void;
  resolveTurn: () => void;
  setPhase: (phase: GameState['phase']) => void;
  quitGame: () => void;
  syncFromFirebase: (roomData: any, isHost: boolean) => void;
}

const initialState: GameState = {
  id: '',
  mode: 'beginner',
  phase: 'idle',
  turn: 1,
  player: {
    id: 'player1',
    displayName: 'Pistoleiro',
    avatar: 'marshal',
    life: 3,
    maxLife: 3,
    ammo: 0,
    maxAmmo: 3,
    selectedCard: null,
    choiceRevealed: false,
    isAnimating: false,
    currentAnimation: 'idle',
    wins: 0
  },
  opponent: {
    id: 'bot',
    displayName: 'El Diablo',
    avatar: 'skull',
    life: 3,
    maxLife: 3,
    ammo: 0,
    maxAmmo: 3,
    selectedCard: null,
    choiceRevealed: false,
    isAnimating: false,
    currentAnimation: 'idle',
    wins: 0
  },
  lastResult: null,
  isOnline: false,
  roomId: null,
  winnerId: null,
  history: [],
  botDifficulty: 'medium'
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  initializeGame: (mode, isOnline, roomId, botDifficulty = 'medium', playerAvatar = 'marshal') => {
    const life = LIFE_BY_MODE[mode];
    // Pick a random opponent avatar that's different from the player
    const allAvatars = ['marshal', 'skull', 'la_dama'];
    const opponentAvatars = allAvatars.filter(a => a !== playerAvatar);
    const opponentAvatar = opponentAvatars[Math.floor(Math.random() * opponentAvatars.length)];
    
    const opponentNames: Record<string, string> = {
      marshal: 'The Marshal',
      skull: 'The Skull',
      la_dama: 'La Dama'
    };

    set({
      ...initialState,
      mode,
      isOnline,
      roomId: roomId || null,
      botDifficulty: isOnline ? undefined : botDifficulty,
      phase: 'selecting',
      player: {
        ...initialState.player,
        life,
        maxLife: life,
        avatar: playerAvatar,
      },
      opponent: {
        ...initialState.opponent,
        life,
        maxLife: life,
        avatar: opponentAvatar,
        displayName: opponentNames[opponentAvatar] || 'El Diablo',
      }
    });
  },

  selectCard: (card) => {
    const state = get();
    if (state.phase !== 'selecting') return;

    set({
      player: { ...state.player, selectedCard: card },
    });

    // In solo mode, bot chooses after a delay
    if (!state.isOnline) {
      const thinkDelay = 1200 + Math.random() * 1200; // 1.2-2.4s random for realism
      setTimeout(() => {
        const currentState = get();
        const pHistory = currentState.history.map(h => h.playerCard);
        const botCard = botChooseCard(
          currentState.opponent,
          pHistory,
          currentState.mode,
          currentState.botDifficulty || 'medium'
        );

        set({
          opponent: { ...currentState.opponent, selectedCard: botCard }
        });

        get().resolveTurn();
      }, thinkDelay);
    }
  },

  resolveTurn: () => {
    const state = get();
    if (!state.player.selectedCard || !state.opponent.selectedCard) return;

    // Phase: Revealing cards
    set({
      phase: 'revealing',
      player: { ...state.player, choiceRevealed: true },
      opponent: { ...state.opponent, choiceRevealed: true }
    });

    setTimeout(() => {
      const currentState = get();
      set({ phase: 'resolving' });

      const pCard = currentState.player.selectedCard!;
      const oCard = currentState.opponent.selectedCard!;

      // Map card to character animation
      const cardToAnim = (card: CardType): 'shoot' | 'dodge' | 'reload' | 'counter' | 'idle' => {
        if (card === 'shot' || card === 'double_shot') return 'shoot';
        if (card === 'dodge') return 'dodge';
        if (card === 'reload') return 'reload';
        if (card === 'counter') return 'counter';
        return 'idle';
      };

      const result = resolveCards(pCard, oCard, currentState.player.ammo, currentState.opponent.ammo, currentState.mode, currentState.turn);

      // Determine character animations based on outcome
      const pAnim = result.playerLifeLost > 0 ? 'hit' : cardToAnim(pCard);
      const oAnim = result.opponentLifeLost > 0 ? 'hit' : cardToAnim(oCard);

      set(curr => {
        const newPlayerLife = Math.max(0, curr.player.life - result.playerLifeLost);
        const newOpponentLife = Math.max(0, curr.opponent.life - result.opponentLifeLost);
        const newPlayerAmmo = Math.min(3, Math.max(0, curr.player.ammo + result.playerAmmoChange));
        const newOpponentAmmo = Math.min(3, Math.max(0, curr.opponent.ammo + result.opponentAmmoChange));

        const newPlayer = {
          ...curr.player,
          life: newPlayerLife,
          ammo: newPlayerAmmo,
          currentAnimation: (newPlayerLife <= 0 ? 'death' : pAnim) as any,
          isAnimating: true
        };
        const newOpponent = {
          ...curr.opponent,
          life: newOpponentLife,
          ammo: newOpponentAmmo,
          currentAnimation: (newOpponentLife <= 0 ? 'death' : oAnim) as any,
          isAnimating: true
        };

        const winner = checkWinner(newPlayer, newOpponent);

        return {
          player: newPlayer,
          opponent: newOpponent,
          lastResult: result,
          history: [...curr.history, result],
          phase: 'animating' as const,
          winnerId: winner
        };
      });

      // After animation period
      setTimeout(() => {
        const afterAnimState = get();
        if (afterAnimState.winnerId) {
          set({ phase: 'game_over' });
        } else {
          set(curr => ({
            phase: 'selecting' as const,
            turn: curr.turn + 1,
            player: { ...curr.player, selectedCard: null, choiceRevealed: false, isAnimating: false, currentAnimation: 'idle' as any },
            opponent: { ...curr.opponent, selectedCard: null, choiceRevealed: false, isAnimating: false, currentAnimation: 'idle' as any }
          }));
        }
      }, 3000);

    }, 1200);
  },

  syncFromFirebase: (roomData, isHost) => {
    if (!roomData) return;

    const myRole = isHost ? 'host' : 'guest';
    const otherRole = isHost ? 'guest' : 'host';

    // Basic state update
    set(state => ({
      mode: roomData.mode || state.mode,
      roomId: roomData.id,
      isOnline: true,
      phase: roomData.status === 'in_progress' ? (state.phase === 'idle' ? 'selecting' : state.phase) : state.phase,
      player: {
        ...state.player,
        life: roomData[`${myRole}Life`] ?? state.player.life,
        ammo: roomData[`${myRole}Ammo`] ?? state.player.ammo,
        // Only overwrite selectedCard from Firebase if we're not in the middle of selecting
        // Or if Firebase actually has a confirmed choice we don't have yet
        selectedCard: state.phase === 'selecting' 
          ? (state.player.selectedCard || (roomData[`${myRole}Choice`] as CardType) || null)
          : (roomData[`${myRole}Choice`] as CardType || null),
      },
      opponent: {
        ...state.opponent,
        displayName: isHost ? (roomData.guestName || 'Inimigo') : (roomData.hostName || 'Host'),
        life: roomData[`${otherRole}Life`] ?? state.opponent.life,
        ammo: roomData[`${otherRole}Ammo`] ?? state.opponent.ammo,
        selectedCard: roomData.status === 'resolving' ? (roomData[`${otherRole}Choice`] as CardType) : null,
      }
    }));

    // If both have chosen, and we are not yet resolving, maybe local state needs to trigger?
    // Actually, in online mode, we should wait for a designated 'resolving' status from Firebase 
    // to ensure both see the same result at the same time.
  },

  setPhase: (phase) => set({ phase }),
  quitGame: () => set(initialState)
}));
