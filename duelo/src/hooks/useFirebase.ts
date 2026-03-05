import { useState, useEffect } from 'react';
import { ref, set, get, onValue, update, onDisconnect, off } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import type { Room, GameMode } from '../types';

export function useFirebaseRoom() {
  const { user } = useAuthStore();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Creates a room and sets host
  const createRoom = async (mode: GameMode) => {
    if (!user) return null;
    
    // Generate simple 6-char code
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    
    const newRoom: Partial<Room> = {
      id: roomId,
      hostId: user.uid,
      hostName: user.displayName || 'Pistoleiro',
      guestId: null,
      mode,
      status: 'waiting',
      createdAt: Date.now()
    };
    
    await set(roomRef, newRoom);
    setCurrentRoomId(roomId);
    
    // Host also needs empty hostChoice/guestChoice etc
    await update(roomRef, {
      hostChoice: null,
      guestChoice: null,
      hostReady: false,
      guestReady: false,
      'gameState/phase': 'selecting',
      'gameState/turn': 1,
      'gameState/hostLife': mode === 'beginner' ? 3 : 4,
      'gameState/guestLife': mode === 'beginner' ? 3 : 4,
      'gameState/hostAmmo': 0,
      'gameState/guestAmmo': 0,
    });
    
    return roomId;
  };

  // Joins an existing room
  const joinRoom = async (roomId: string) => {
    if (!user) return false;
    
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
      const room = snapshot.val() as Room;
      if (room.status === 'waiting' && !room.guestId) {
        await update(roomRef, {
          guestId: user.uid,
          guestName: user.displayName || 'Pistoleiro',
          status: 'in_progress'
        });
        setCurrentRoomId(roomId);
        return true;
      }
    }
    return false;
  };

  const submitChoice = async (roomId: string, choice: string) => {
    if (!user) return;
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;
    const room = snapshot.val();
    const isHost = user.uid === room.hostId;
    const role = isHost ? 'host' : 'guest';
    
    await update(roomRef, {
      [`${role}Choice`]: choice
    });
  };

  return { createRoom, joinRoom, submitChoice, currentRoomId };
}

export function useMatchSync(roomId: string | null) {
  const { user } = useAuthStore();
  const gameStore = useGameStore();

  useEffect(() => {
    if (!roomId || !user) return;

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    
    // Setup disconnect handler
    const presenceRef = ref(rtdb, `rooms/${roomId}/status`);
    onDisconnect(presenceRef).set('finished');

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const roomData = snapshot.val();
      const isHost = user.uid === roomData.hostId;
      
      gameStore.syncFromFirebase(roomData, isHost); 
    });

    return () => {
      unsubscribe();
      off(roomRef);
    };
  }, [roomId, user, gameStore]);
}
