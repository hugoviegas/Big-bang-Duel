import { useState, useEffect } from "react";
import {
  ref,
  set,
  get,
  onValue,
  update,
  onDisconnect,
  off,
} from "firebase/database";
import { rtdb } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { LIFE_BY_MODE } from "../lib/gameEngine";
import type { Room, GameMode, RoomConfig } from "../types";

const QUICK_MATCH_MODE: GameMode = "advanced";
const QUICK_MATCH_CONFIG: RoomConfig = {
  isPublic: true,
  attackTimer: 10,
  bestOf3: false,
  hideOpponentAmmo: true,
};

export type QuickMatchResult = {
  roomId: string;
  mode: GameMode;
  config: RoomConfig;
  isHost: boolean;
};

export function useFirebaseRoom() {
  const { user } = useAuthStore();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Creates a room and sets host
  const createRoom = async (
    mode: GameMode,
    config: RoomConfig,
    playerAvatar: string = "marshal",
    playerAvatarPicture?: string,
  ) => {
    if (!user) return null;

    // Generate simple 6-char code
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const initialLife = LIFE_BY_MODE[mode];

    const newRoom: Partial<Room> = {
      id: roomId,
      hostId: user.uid,
      hostName: user.displayName || "Pistoleiro",
      hostAvatar: playerAvatar,
      hostAvatarPicture: playerAvatarPicture ?? null,
      guestId: null,
      mode,
      status: "waiting",
      createdAt: Date.now(),
      config,
      hostStars: 0,
      guestStars: 0,
      currentRound: 1,
    };

    await set(roomRef, newRoom);
    setCurrentRoomId(roomId);

    await update(roomRef, {
      hostChoice: null,
      guestChoice: null,
      hostReady: false,
      guestReady: false,
      turn: 1,
      hostLife: initialLife,
      guestLife: initialLife,
      hostAmmo: 0,
      guestAmmo: 0,
    });

    return roomId;
  };

  // Joins an existing room — returns the Room on success or null on failure
  const joinRoom = async (
    roomId: string,
    playerAvatar: string = "marshal",
    playerAvatarPicture?: string,
  ): Promise<Room | null> => {
    if (!user) return null;

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const room = snapshot.val() as Room;
      if (room.status === "waiting" && !room.guestId) {
        await update(roomRef, {
          guestId: user.uid,
          guestName: user.displayName || "Pistoleiro",
          guestAvatar: playerAvatar,
          guestAvatarPicture: playerAvatarPicture ?? null,
          status: "in_progress",
        });
        setCurrentRoomId(roomId);
        return room;
      }
    }
    return null;
  };

  const submitChoice = async (roomId: string, choice: string) => {
    if (!user) return;
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;
    const room = snapshot.val();
    const isHost = user.uid === room.hostId;
    const role = isHost ? "host" : "guest";

    await update(roomRef, {
      [`${role}Choice`]: choice,
    });
  };

  const getUserRooms = async () => {
    if (!user) return [];
    const roomsRef = ref(rtdb, "rooms");
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return [];

    const roomsData = snapshot.val();
    const activeRooms: Room[] = [];
    const now = Date.now();
    const THIRTY_MINS = 30 * 60 * 1000;

    for (const room of Object.values(roomsData) as any[]) {
      if (
        (room.hostId === user.uid || room.guestId === user.uid) &&
        room.status !== "finished"
      ) {
        // If room is waiting for more than 30 mins, mark it as finished (deleted/expired)
        if (
          room.status === "waiting" &&
          room.createdAt &&
          now - room.createdAt > THIRTY_MINS
        ) {
          update(ref(rtdb, `rooms/${room.id}`), { status: "finished" }).catch(
            () => {},
          );
        } else {
          activeRooms.push(room);
        }
      }
    }

    return activeRooms;
  };

  const getPublicRooms = async (): Promise<Room[]> => {
    const roomsRef = ref(rtdb, "rooms");
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return [];

    const roomsData = snapshot.val();
    const publicRooms: Room[] = [];
    const now = Date.now();
    const THIRTY_MINS = 30 * 60 * 1000;

    for (const room of Object.values(roomsData) as any[]) {
      if (
        room.config?.isPublic &&
        room.status === "waiting" &&
        room.createdAt &&
        now - room.createdAt < THIRTY_MINS &&
        room.hostId !== user?.uid
      ) {
        publicRooms.push(room as Room);
      }
    }
    return publicRooms;
  };

  const quickMatch = async (
    playerAvatar: string = "marshal",
    playerAvatarPicture?: string,
  ): Promise<QuickMatchResult | null> => {
    if (!user) return null;

    const roomsRef = ref(rtdb, "rooms");
    const snapshot = await get(roomsRef);
    const now = Date.now();
    const THIRTY_MINS = 30 * 60 * 1000;

    const candidates: Room[] = [];
    if (snapshot.exists()) {
      const roomsData = snapshot.val();
      for (const room of Object.values(roomsData) as any[]) {
        const cfg = room.config as RoomConfig | undefined;
        const isQuickRoom =
          room.mode === QUICK_MATCH_MODE &&
          room.status === "waiting" &&
          !room.guestId &&
          room.hostId !== user.uid &&
          cfg?.isPublic === QUICK_MATCH_CONFIG.isPublic &&
          cfg?.attackTimer === QUICK_MATCH_CONFIG.attackTimer &&
          cfg?.bestOf3 === QUICK_MATCH_CONFIG.bestOf3 &&
          (cfg?.hideOpponentAmmo ?? false) ===
            (QUICK_MATCH_CONFIG.hideOpponentAmmo ?? false) &&
          room.createdAt &&
          now - room.createdAt < THIRTY_MINS;

        if (isQuickRoom) {
          candidates.push(room as Room);
        }
      }
    }

    // FIFO entry into the oldest available quick room.
    candidates.sort((a, b) => a.createdAt - b.createdAt);
    for (const room of candidates) {
      const joined = await joinRoom(room.id, playerAvatar, playerAvatarPicture);
      if (joined) {
        return {
          roomId: room.id,
          mode: room.mode,
          config: {
            isPublic: room.config?.isPublic ?? true,
            attackTimer: room.config?.attackTimer ?? 10,
            bestOf3: room.config?.bestOf3 ?? false,
            hideOpponentAmmo: room.config?.hideOpponentAmmo ?? true,
          },
          isHost: false,
        };
      }
    }

    const roomId = await createRoom(
      QUICK_MATCH_MODE,
      QUICK_MATCH_CONFIG,
      playerAvatar,
      playerAvatarPicture,
    );

    if (!roomId) return null;
    return {
      roomId,
      mode: QUICK_MATCH_MODE,
      config: QUICK_MATCH_CONFIG,
      isHost: true,
    };
  };

  const markPlayerReturnedToMenu = async (
    roomId: string,
  ): Promise<"pending" | "deleted" | "not_found"> => {
    if (!user) return "pending";

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return "not_found";

    const room = snapshot.val() as Room & {
      hostReturnedToMenuAt?: number;
      guestReturnedToMenuAt?: number;
    };

    const isHost = room.hostId === user.uid;
    const isGuest = room.guestId === user.uid;
    if (!isHost && !isGuest) return "pending";

    const rolePrefix = isHost ? "host" : "guest";
    await update(roomRef, {
      [`${rolePrefix}ReturnedToMenuAt`]: Date.now(),
      status: "finished",
    });

    const latestSnap = await get(roomRef);
    if (!latestSnap.exists()) return "deleted";

    const latest = latestSnap.val() as {
      status?: string;
      hostReturnedToMenuAt?: number;
      guestReturnedToMenuAt?: number;
    };

    const bothReturned =
      !!latest.hostReturnedToMenuAt && !!latest.guestReturnedToMenuAt;
    if (latest.status === "finished" && bothReturned) {
      await set(roomRef, null);
      return "deleted";
    }

    return "pending";
  };

  const cancelWaitingRoom = async (roomId: string): Promise<void> => {
    if (!user) return;
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snap = await get(roomRef);
    if (!snap.exists()) return;
    const room = snap.val() as Room;

    if (
      room.hostId === user.uid &&
      room.status === "waiting" &&
      !room.guestId
    ) {
      await set(roomRef, null);
    }
  };

  return {
    createRoom,
    joinRoom,
    submitChoice,
    getUserRooms,
    getPublicRooms,
    quickMatch,
    markPlayerReturnedToMenu,
    cancelWaitingRoom,
    currentRoomId,
  };
}

export function useMatchSync(roomId: string | null) {
  const { user } = useAuthStore();

  const joinRoom = async (rId: string) => {
    if (!user) return false;
    const roomRef = ref(rtdb, `rooms/${rId}`);
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      const room = snapshot.val() as Room;
      // If already in game or host, allow entry without update
      if (room.hostId === user.uid || room.guestId === user.uid) return true;
      // Otherwise try joining as guest
      if (room.status === "waiting" && !room.guestId) {
        await update(roomRef, {
          guestId: user.uid,
          guestName: user.displayName || "Pistoleiro",
          guestAvatarPicture: user.avatarPicture ?? null,
          status: "in_progress",
        });
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!roomId || !user) return;
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const presenceRef = ref(rtdb, `rooms/${roomId}/status`);
    onDisconnect(presenceRef).set("finished");
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const roomData = snapshot.val();
      const isHost = user.uid === roomData.hostId;
      useGameStore.getState().syncFromFirebase(roomData, isHost);
    });
    return () => {
      unsubscribe();
      off(roomRef);
    };
  }, [roomId, user?.uid]);

  return { joinRoom };
}
