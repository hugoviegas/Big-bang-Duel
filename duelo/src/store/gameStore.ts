import { create } from 'zustand';
import { ref, update } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import type { GameState, GameMode, CardType, BotDifficulty } from '../types';
import { LIFE_BY_MODE, resolveCards, checkWinner } from '../lib/gameEngine';
import { botChooseCard } from '../lib/botAI';

interface GameStore extends GameState {
  initializeGame: (mode: GameMode, isOnline: boolean, isHost: boolean, roomId?: string, botDifficulty?: BotDifficulty, playerAvatar?: string) => void;
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
  isHost: false,
  roomId: null,
  winnerId: null,
  history: [],
  botDifficulty: 'medium'
};

// Flag para prevenir múltiplas resoluções simultâneas
let _isResolving = false;

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  initializeGame: (mode, isOnline, isHost, roomId, botDifficulty = 'medium', playerAvatar = 'marshal') => {
    _isResolving = false;
    const life = LIFE_BY_MODE[mode];
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
      isHost: isOnline ? isHost : false,
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

    // Solo mode: bot responde e resolve automaticamente
    if (!state.isOnline) {
      const thinkDelay = 1200 + Math.random() * 1200;
      setTimeout(() => {
        const currentState = get();
        if (currentState.phase !== 'selecting') return;
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
    if (_isResolving) return;
    const state = get();
    if (!state.player.selectedCard || !state.opponent.selectedCard) return;
    if (state.phase !== 'selecting') return;

    _isResolving = true;

    // Capturar os valores ANTES de qualquer update
    const pCard = state.player.selectedCard;
    const oCard = state.opponent.selectedCard;
    const pAmmo = state.player.ammo;
    const oAmmo = state.opponent.ammo;
    const pLife = state.player.life;
    const oLife = state.opponent.life;

    set({
      phase: 'revealing',
      player: { ...state.player, choiceRevealed: true },
      opponent: { ...state.opponent, choiceRevealed: true }
    });

    setTimeout(() => {
      set({ phase: 'resolving' });

      const cardToAnim = (card: CardType): 'shoot' | 'dodge' | 'reload' | 'counter' | 'idle' => {
        if (card === 'shot' || card === 'double_shot') return 'shoot';
        if (card === 'dodge') return 'dodge';
        if (card === 'reload') return 'reload';
        if (card === 'counter') return 'counter';
        return 'idle';
      };

      const currentState = get();
      const result = resolveCards(pCard, oCard, pAmmo, oAmmo, currentState.mode, currentState.turn);

      const pAnim = result.playerLifeLost > 0 ? 'hit' : cardToAnim(pCard);
      const oAnim = result.opponentLifeLost > 0 ? 'hit' : cardToAnim(oCard);

      const newPlayerLife = Math.max(0, pLife - result.playerLifeLost);
      const newOpponentLife = Math.max(0, oLife - result.opponentLifeLost);
      const newPlayerAmmo = Math.min(3, Math.max(0, pAmmo + result.playerAmmoChange));
      const newOpponentAmmo = Math.min(3, Math.max(0, oAmmo + result.opponentAmmoChange));

      const newPlayer = {
        ...currentState.player,
        life: newPlayerLife,
        ammo: newPlayerAmmo,
        currentAnimation: (newPlayerLife <= 0 ? 'death' : pAnim) as any,
        isAnimating: true
      };
      const newOpponent = {
        ...currentState.opponent,
        life: newOpponentLife,
        ammo: newOpponentAmmo,
        currentAnimation: (newOpponentLife <= 0 ? 'death' : oAnim) as any,
        isAnimating: true
      };

      const winner = checkWinner(newPlayer, newOpponent);

      set({
        player: newPlayer,
        opponent: newOpponent,
        lastResult: result,
        history: [...currentState.history, result],
        phase: 'animating',
        winnerId: winner
      });

      setTimeout(async () => {
        _isResolving = false;
        const afterAnimState = get();

        // HOST: sincronizar resultado ao Firebase
        if (afterAnimState.isOnline && afterAnimState.roomId && afterAnimState.isHost) {
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
              status: afterAnimState.winnerId ? 'finished' : 'in_progress'
            });
          } catch (e) {
            console.error('Firebase sync error:', e);
          }
        }

        if (afterAnimState.winnerId) {
          set({ phase: 'game_over' });
        } else {
          set(curr => ({
            phase: 'selecting' as const,
            turn: curr.turn + 1,
            player: {
              ...curr.player,
              selectedCard: null,
              choiceRevealed: false,
              isAnimating: false,
              currentAnimation: 'idle' as any
            },
            opponent: {
              ...curr.opponent,
              selectedCard: null,
              choiceRevealed: false,
              isAnimating: false,
              currentAnimation: 'idle' as any
            }
          }));
        }
      }, 3000);

    }, 1200);
  },

  syncFromFirebase: (roomData, isHost) => {
    if (!roomData) return;
    if (_isResolving) return; // Não atualizar durante resolução

    const myRole = isHost ? 'host' : 'guest';
    const otherRole = isHost ? 'guest' : 'host';

    const hostChoice = roomData.hostChoice;
    const guestChoice = roomData.guestChoice;
    const isBothChosen = !!(hostChoice && guestChoice);

    const state = get();
    
    // Se ambos escolheram e ainda estamos selecionando -> resolver
    if (state.phase === 'selecting' && isBothChosen && !_isResolving) {
      // Primeiro atualizar as cartas, depois resolver
      set({
        isHost: isHost,
        isOnline: true,
        mode: roomData.mode || state.mode,
        roomId: roomData.id,
        player: {
          ...state.player,
          life: roomData[`${myRole}Life`] ?? state.player.life,
          ammo: roomData[`${myRole}Ammo`] ?? state.player.ammo,
          displayName: (isHost ? roomData.hostName : roomData.guestName) || state.player.displayName,
          selectedCard: (roomData[`${myRole}Choice`] as CardType) || state.player.selectedCard,
        },
        opponent: {
          ...state.opponent,
          displayName: isHost ? (roomData.guestName || 'Inimigo') : (roomData.hostName || 'Host'),
          life: roomData[`${otherRole}Life`] ?? state.opponent.life,
          ammo: roomData[`${otherRole}Ammo`] ?? state.opponent.ammo,
          selectedCard: (roomData[`${otherRole}Choice`] as CardType),
          choiceRevealed: true,
          avatar: state.opponent.avatar,
        }
      });
      
      // Breve delay para garantir que o state foi aplicado antes de resolver
      setTimeout(() => {
        get().resolveTurn();
      }, 100);
      return;
    }

    // Update normal de estado (sem resolução)
    set(curr => ({
      mode: roomData.mode || curr.mode,
      roomId: roomData.id,
      isOnline: true,
      isHost: isHost,
      turn: roomData.turn ?? curr.turn,
      player: {
        ...curr.player,
        life: roomData[`${myRole}Life`] ?? curr.player.life,
        ammo: roomData[`${myRole}Ammo`] ?? curr.player.ammo,
        displayName: (isHost ? roomData.hostName : roomData.guestName) || curr.player.displayName,
        // Preservar selectedCard local durante fase de seleção
        selectedCard: curr.phase === 'selecting'
          ? (curr.player.selectedCard || (roomData[`${myRole}Choice`] as CardType) || null)
          : null,
      },
      opponent: {
        ...curr.opponent,
        displayName: isHost ? (roomData.guestName || 'Inimigo') : (roomData.hostName || 'Host'),
        life: roomData[`${otherRole}Life`] ?? curr.opponent.life,
        ammo: roomData[`${otherRole}Ammo`] ?? curr.opponent.ammo,
        selectedCard: null,
        choiceRevealed: false,
      }
    }));
  },

  setPhase: (phase) => set({ phase }),
  quitGame: () => {
    _isResolving = false;
    set(initialState);
  }
}));
