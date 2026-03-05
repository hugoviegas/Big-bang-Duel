import { create } from 'zustand';
import type { Room } from '../types';

interface LobbyState {
  rooms: Room[];
  currentRoom: Room | null;
  isLoading: boolean;
  error: string | null;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useLobbyStore = create<LobbyState>()((set) => ({
  rooms: [],
  currentRoom: null,
  isLoading: false,
  error: null,
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
