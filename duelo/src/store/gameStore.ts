import { create } from 'zustand';
import type { GameState, GameMode, CardType, BotDifficulty } from '../types';
import { LIFE_BY_MODE, resolveCards, checkWinner } from '../lib/gameEngine';
import { botChooseCard } from '../lib/botAI';

interface GameStore extends GameState {
  initializeGame: (mode: GameMode, isOnline: boolean, roomId?: string, botDifficulty?: BotDifficulty) => void;
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
    avatar: 'villain',
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
  history: []
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  initializeGame: (mode, isOnline, roomId, botDifficulty = 'medium') => {
    const life = LIFE_BY_MODE[mode];
    set({
      ...initialState,
      mode,
      isOnline,
      roomId: roomId || null,
      botDifficulty: isOnline ? undefined : botDifficulty,
      phase: 'selecting',
      player: { ...initialState.player, life, maxLife: life },
      opponent: { ...initialState.opponent, life, maxLife: life }
    });
  },

  selectCard: (card) => {
    const state = get();
    if (state.phase !== 'selecting') return;

    set({
      player: { ...state.player, selectedCard: card },
    });

    // In solo mode, bot chooses right after player selects
    if (!state.isOnline) {
      setTimeout(() => {
        const pHistory = state.history.map(h => h.playerCard);
        const botCard = botChooseCard(state.opponent, pHistory, state.mode, state.botDifficulty || 'medium');
        
        set({
          opponent: { ...state.opponent, selectedCard: botCard }
        });

        get().resolveTurn();
      }, 1000); // bot thinking delay
    }
  },

  resolveTurn: () => {
    const state = get();
    if (!state.player.selectedCard || !state.opponent.selectedCard) return;

    set({ phase: 'revealing', player: { ...state.player, choiceRevealed: true }, opponent: { ...state.opponent, choiceRevealed: true } });

    setTimeout(() => {
      set({ phase: 'resolving' });
      
      const pCard = state.player.selectedCard!;
      const oCard = state.opponent.selectedCard!;
      
      const result = resolveCards(
        pCard, 
        oCard, 
        state.player.ammo, 
        state.opponent.ammo, 
        state.mode, 
        state.turn
      );

      set(curr => {
        const newPlayerLife = Math.max(0, curr.player.life - result.playerLifeLost);
        const newOpponentLife = Math.max(0, curr.opponent.life - result.opponentLifeLost);
        const newPlayerAmmo = Math.min(3, Math.max(0, curr.player.ammo + result.playerAmmoChange));
        const newOpponentAmmo = Math.min(3, Math.max(0, curr.opponent.ammo + result.opponentAmmoChange));

        const newPlayerState = { ...curr.player, life: newPlayerLife, ammo: newPlayerAmmo, currentAnimation: 'idle' as any };
        const newOpponentState = { ...curr.opponent, life: newOpponentLife, ammo: newOpponentAmmo, currentAnimation: 'idle' as any };

        let phase: GameState['phase'] = 'animating';
        const winner = checkWinner(newPlayerState, newOpponentState);
        
        return {
          player: newPlayerState,
          opponent: newOpponentState,
          lastResult: result,
          history: [...curr.history, result],
          phase,
          winnerId: winner
        };
      });

      // After animation
      setTimeout(() => {
        const afterAnimState = get();
        if (afterAnimState.winnerId) {
          set({ phase: 'game_over' });
        } else {
          set(curr => ({
            phase: 'selecting',
            turn: curr.turn + 1,
            player: { ...curr.player, selectedCard: null, choiceRevealed: false },
            opponent: { ...curr.opponent, selectedCard: null, choiceRevealed: false }
          }));
        }
      }, 3000); // 3 seconds overlay result

    }, 1500); // 1.5 seconds reveal
  },

  syncFromFirebase: (_roomData, _isHost) => {
    // Basic sync logic pulling state out of roomData
    // In a full implementation, this checks phase changes, opponent ready states, etc.
    // const state = get();
    // E.g. update opponent name when guest joins
  },

  setPhase: (phase) => set({ phase }),
  
  quitGame: () => set(initialState)
}));
