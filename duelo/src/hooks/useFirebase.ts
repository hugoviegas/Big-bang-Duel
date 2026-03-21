import { useState, useEffect } from "react";
import {
  ref,
  set,
  get,
  onValue,
  update,
  onDisconnect,
  off,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { LIFE_BY_MODE } from "../lib/gameEngine";
import { getCharacterClass } from "../lib/characters";
import { getClassMasteryLevelForClass } from "../lib/progression";
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
    const hostClass = getCharacterClass(playerAvatar);
    const hostClassMasteryLevel = getClassMasteryLevelForClass(
      user.classMastery,
      hostClass,
    );

    const newRoom: Partial<Room> = {
      id: roomId,
      hostId: user.uid,
      hostName: user.displayName || "Pistoleiro",
      hostAvatar: playerAvatar,
      hostAvatarPicture: playerAvatarPicture,
      hostClassMasteryLevel,
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
      currentRound: 1,
      hostLife: initialLife,
      guestLife: initialLife,
      hostAmmo: 0,
      guestAmmo: 0,
      // Phase 2: Initialize state persistence fields
      hostDodgeStreak: 0,
      guestDodgeStreak: 0,
      hostDoubleShotsLeft: 2,
      guestDoubleShotsLeft: 2,
      hostShieldUsesLeft: 2,
      guestShieldUsesLeft: 2,
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
          guestClassMasteryLevel: getClassMasteryLevelForClass(
            user.classMastery,
            getCharacterClass(playerAvatar),
          ),
          status: "in_progress",
          // Ensure state persistence fields are initialized for guest
          guestDodgeStreak: room.guestDodgeStreak ?? 0,
          guestDoubleShotsLeft: room.guestDoubleShotsLeft ?? 2,
          guestShieldUsesLeft: room.guestShieldUsesLeft ?? 2,
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

  const submitEmoji = async (
    roomId: string,
    emoji: string,
  ): Promise<boolean> => {
    if (!user) return false;
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return false;

    const room = snapshot.val() as Room;
    const isHost = user.uid === room.hostId;
    const role = isHost ? "host" : "guest";
    const now = Date.now();
    const lastSentAt = (room as any)[`${role}EmojiSentAt`] as
      | number
      | undefined;

    if (lastSentAt && now - lastSentAt < 4000) {
      return false;
    }

    await update(roomRef, {
      [`${role}EmojiEvent`]: {
        emoji,
        sentAt: now,
        nonce: `${role}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      },
      [`${role}EmojiSentAt`]: now,
    });

    return true;
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
    const TWO_MINS_MS = 2 * 60 * 1000;

    for (const room of Object.values(roomsData) as any[]) {
      if (
        (room.hostId === user.uid || room.guestId === user.uid) &&
        room.status !== "finished"
      ) {
        // Expire waiting rooms older than 30 min
        if (
          room.status === "waiting" &&
          room.createdAt &&
          now - room.createdAt > THIRTY_MINS
        ) {
          update(ref(rtdb, `rooms/${room.id}`), { status: "finished" }).catch(
            () => {},
          );
          continue;
        }

        // Clean up in_progress rooms where BOTH players have been gone > 2 min
        const hostLeftAt: number | undefined = room.hostLeftAt;
        const guestLeftAt: number | undefined = room.guestLeftAt;
        if (
          hostLeftAt &&
          guestLeftAt &&
          now - hostLeftAt > TWO_MINS_MS &&
          now - guestLeftAt > TWO_MINS_MS
        ) {
          set(ref(rtdb, `rooms/${room.id}`), null).catch(() => {});
          continue;
        }

        // For in_progress rooms, only include if the current user can still rejoin
        // (their own LeftAt is either unset or within the 2-minute window)
        if (room.status === "in_progress" || room.status === "resolving") {
          const isHost = room.hostId === user.uid;
          const myLeftAt: number | undefined = isHost
            ? room.hostLeftAt
            : room.guestLeftAt;
          if (myLeftAt && now - myLeftAt > TWO_MINS_MS) {
            // User's reconnect window has expired — skip
            continue;
          }
        }

        activeRooms.push(room);
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

    // ── Reuse the user's own existing waiting quick-match room (prevents ghost rooms) ──
    if (snapshot.exists()) {
      const roomsData = snapshot.val();
      for (const room of Object.values(roomsData) as any[]) {
        if (
          room.hostId === user.uid &&
          room.mode === QUICK_MATCH_MODE &&
          room.status === "waiting" &&
          !room.guestId &&
          room.createdAt &&
          now - room.createdAt < THIRTY_MINS
        ) {
          return {
            roomId: room.id,
            mode: QUICK_MATCH_MODE,
            config: QUICK_MATCH_CONFIG,
            isHost: true,
          };
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
      hostLeftAt?: number;
      guestLeftAt?: number;
    };

    const isHost = room.hostId === user.uid;
    const isGuest = room.guestId === user.uid;
    if (!isHost && !isGuest) return "pending";

    // Only mark the leaving player — keep room status as-is so the other
    // player or the same player can rejoin within TWO_MINS_MS.
    const rolePrefix = isHost ? "host" : "guest";
    const now = Date.now();
    await update(roomRef, {
      [`${rolePrefix}LeftAt`]: now,
    });

    // Read fresh state and clean up if BOTH players have been gone > 2 minutes
    const latestSnap = await get(roomRef);
    if (!latestSnap.exists()) return "deleted";
    const latest = latestSnap.val() as {
      hostLeftAt?: number;
      guestLeftAt?: number;
    };
    const TWO_MINS_MS = 2 * 60 * 1000;
    if (
      latest.hostLeftAt &&
      latest.guestLeftAt &&
      now - latest.hostLeftAt > TWO_MINS_MS &&
      now - latest.guestLeftAt > TWO_MINS_MS
    ) {
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
    submitEmoji,
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
      // If already in room (as host or guest), allow re-entry and clear LeftAt
      if (room.hostId === user.uid || room.guestId === user.uid) {
        const isHost = room.hostId === user.uid;
        const rolePrefix = isHost ? "host" : "guest";
        await update(roomRef, { [`${rolePrefix}LeftAt`]: null });
        return true;
      }
      // Otherwise try joining as guest (waiting room only)
      if (room.status === "waiting" && !room.guestId) {
        await update(roomRef, {
          guestId: user.uid,
          guestName: user.displayName || "Pistoleiro",
          guestAvatarPicture: user.avatarPicture ?? null,
          guestClassMasteryLevel: getClassMasteryLevelForClass(
            user.classMastery,
            getCharacterClass(user.avatar || "marshal"),
          ),
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

    // Track per-player disconnect: sets role-specific LeftAt with server timestamp
    // so the room stays in_progress and the player can rejoin within 2 minutes.
    let leftAtRef: ReturnType<typeof ref> | null = null;
    let effectCancelled = false;
    get(roomRef).then((snap) => {
      if (effectCancelled || !snap.exists()) return;
      const roomData = snap.val();
      const isHost = roomData.hostId === user.uid;
      const rolePrefix = isHost ? "host" : "guest";
      leftAtRef = ref(rtdb, `rooms/${roomId}/${rolePrefix}LeftAt`);
      onDisconnect(leftAtRef).set(serverTimestamp());
    });

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const roomData = snapshot.val();
      const isHost = user.uid === roomData.hostId;
      useGameStore.getState().syncFromFirebase(roomData, isHost);
    });
    return () => {
      effectCancelled = true;
      unsubscribe();
      off(roomRef);
      // Cancel the disconnect handler — player is intentionally navigating away
      if (leftAtRef) {
        onDisconnect(leftAtRef).cancel();
      }
    };
  }, [roomId, user?.uid]);

  return { joinRoom };
}
