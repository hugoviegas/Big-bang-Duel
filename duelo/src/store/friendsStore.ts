import { create } from "zustand";
import type { Friend, FriendRequest, PlayerProfile } from "../types";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  getPendingRequests,
  removeFriend,
  findPlayerByCode,
  subscribeToFriends,
  subscribeToPendingRequests,
  subscribeToPresence,
} from "../lib/firebaseService";

interface FriendsState {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  isLoading: boolean;
  error: string | null;
  /** Unsubscribe functions for real-time listeners. */
  _unsubscribers: (() => void)[];
  /** UID currently being listened to — prevents duplicate subscriptions. */
  _listeningUid: string | null;

  // Actions
  loadFriends: (uid: string) => Promise<void>;
  loadPendingRequests: (uid: string) => Promise<void>;
  /** Start real-time listeners for friends + pending requests + presence. */
  startListening: (uid: string) => void;
  stopListening: () => void;
  sendRequest: (
    myProfile: PlayerProfile,
    targetCode: string,
  ) => Promise<string | null>;
  acceptRequest: (requestId: string, myProfile: PlayerProfile) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  removeFriend: (myUid: string, friendUid: string) => Promise<void>;
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  friends: [],
  pendingRequests: [],
  isLoading: false,
  error: null,
  _unsubscribers: [],
  _listeningUid: null,

  loadFriends: async (uid) => {
    set({ isLoading: true, error: null });
    try {
      const friends = await getFriendsList(uid);
      set({ friends, isLoading: false });
    } catch {
      set({ error: "Erro ao carregar amigos", isLoading: false });
    }
  },

  loadPendingRequests: async (uid) => {
    try {
      const requests = await getPendingRequests(uid);
      set({ pendingRequests: requests });
    } catch {
      // Silently fail
    }
  },

  startListening: (uid) => {
    const state = get();
    // Skip if already listening to this exact UID
    if (state._listeningUid === uid) return;

    // Clean up existing listeners
    state._unsubscribers.forEach((fn) => fn());

    const unsubs: (() => void)[] = [];

    // Listen to friends list
    unsubs.push(
      subscribeToFriends(uid, (friends) => {
        set({ friends });
        // For each friend, subscribe to presence
        friends.forEach((f) => {
          const presenceUnsub = subscribeToPresence(f.uid, (status) => {
            set((s) => ({
              friends: s.friends.map((fr) =>
                fr.uid === f.uid ? { ...fr, onlineStatus: status } : fr,
              ),
            }));
          });
          unsubs.push(presenceUnsub);
        });
      }),
    );

    // Listen to pending requests
    unsubs.push(
      subscribeToPendingRequests(uid, (requests) => {
        set({ pendingRequests: requests });
      }),
    );

    set({ _unsubscribers: unsubs, _listeningUid: uid });
  },

  stopListening: () => {
    get()._unsubscribers.forEach((fn) => fn());
    set({ _unsubscribers: [], _listeningUid: null });
  },

  sendRequest: async (myProfile, targetCode) => {
    set({ error: null });
    const cleanCode = targetCode.trim().toUpperCase();
    const code = cleanCode.startsWith("#") ? cleanCode : `#${cleanCode}`;

    if (code === myProfile.playerCode) {
      return "Você não pode adicionar a si mesmo!";
    }

    const target = await findPlayerByCode(code);
    if (!target) {
      return "Jogador não encontrado com esse código.";
    }

    // Check if already friends
    const { friends } = get();
    if (friends.some((f) => f.uid === target.uid)) {
      return "Vocês já são amigos!";
    }

    await sendFriendRequest(myProfile, target.uid);
    return null; // success
  },

  acceptRequest: async (requestId, myProfile) => {
    try {
      console.log("[friendsStore.acceptRequest] Starting acceptance...", {
        requestId,
        uid: myProfile.uid,
      });
      await acceptFriendRequest(requestId, myProfile);
      console.log(
        "[friendsStore.acceptRequest] Acceptance succeeded, refreshing lists...",
      );
      // Refresh
      await get().loadPendingRequests(myProfile.uid);
      await get().loadFriends(myProfile.uid);
      console.log("[friendsStore.acceptRequest] Lists refreshed ✓");
    } catch (error) {
      console.error(
        "[friendsStore.acceptRequest] FAILED:",
        error,
        error instanceof Error ? error.message : "",
      );
      throw error;
    }
  },

  rejectRequest: async (requestId) => {
    await rejectFriendRequest(requestId);
  },

  removeFriend: async (myUid, friendUid) => {
    await removeFriend(myUid, friendUid);
    set((s) => ({ friends: s.friends.filter((f) => f.uid !== friendUid) }));
  },
}));
