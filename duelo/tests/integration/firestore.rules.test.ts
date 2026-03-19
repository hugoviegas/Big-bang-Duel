import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "../../types";
import { createTestUser, createTestMatchSummary } from "../test/factories";

describe.skip("firebaseService - Firestore Integration (Emulator)", () => {
  let testEnv: RulesTestEnvironment;
  const testProjectId = "bigbangduel-test";

  beforeAll(async () => {
    // Initialize the Rules Testing Library
    testEnv = await initializeTestEnvironment({
      projectId: testProjectId,
      firestore: {
        rules: "" /* Rules loaded from firestore.rules in emulator */,
        host: "localhost",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clear emulator between tests
    await testEnv.clearFirestore();
  });

  describe("Profile CRUD with Firestore emulator", () => {
    it("should create player profile with unique player code", async () => {
      const user = createTestUser();
      const db = testEnv.authenticatedContext(user.uid).firestore();

      const playerRef = doc(db, "players", user.uid);
      const profileData: Partial<User> = {
        uid: user.uid,
        displayName: user.displayName,
        playerCode: user.playerCode,
        statsByMode: user.statsByMode,
        createdAt: Date.now(),
      };

      // Should succeed for owner
      await assertSucceeds(setDoc(playerRef, profileData));

      // Verify data was written
      const snap = await getDoc(playerRef);
      expect(snap.exists()).toBe(true);
      expect(snap.data()?.playerCode).toBe(user.playerCode);
    });

    it("should prevent unauthorized writes to other user profiles", async () => {
      const user1 = createTestUser({ uid: "user-1" });
      const user2 = createTestUser({ uid: "user-2" });

      const db2 = testEnv.authenticatedContext(user2.uid).firestore();
      const playerRef = doc(db2, "players", user1.uid);

      const profileData = {
        displayName: "Hacked!",
        statsByMode: user1.statsByMode,
      };

      // Should fail: user2 trying to write to user1's profile
      await assertFails(updateDoc(playerRef, profileData));
    });

    it("should allow reading own profile", async () => {
      const user = createTestUser();
      const db = testEnv.authenticatedContext(user.uid).firestore();

      const playerRef = doc(db, "players", user.uid);
      const profileData = {
        uid: user.uid,
        displayName: user.displayName,
        statsByMode: user.statsByMode,
      };

      await setDoc(playerRef, profileData);

      // Should succeed for owner
      const snap = await assertSucceeds(getDoc(playerRef));
      expect(snap.exists()).toBe(true);
    });

    it("should allow reading other user profiles (public stats)", async () => {
      const user1 = createTestUser({ uid: "user-1" });
      const user2 = createTestUser({ uid: "user-2" });

      const db1 = testEnv.authenticatedContext(user1.uid).firestore();
      const playerRef = doc(db1, "players", user1.uid);

      await setDoc(playerRef, {
        uid: user1.uid,
        displayName: user1.displayName,
        statsByMode: user1.statsByMode,
      });

      // user2 should be able to read user1's profile (public)
      const db2 = testEnv.authenticatedContext(user2.uid).firestore();
      const playerRef2 = doc(db2, "players", user1.uid);

      const snap = await assertSucceeds(getDoc(playerRef2));
      expect(snap.exists()).toBe(true);
    });
  });

  describe("Match history persistence", () => {
    it("should create match history entry for own matches only", async () => {
      const user = createTestUser();
      const db = testEnv.authenticatedContext(user.uid).firestore();

      const matchSummary = createTestMatchSummary({ uid: user.uid });
      const matchRef = doc(
        db,
        "players",
        user.uid,
        "matchHistory",
        matchSummary.matchId,
      );

      // Should succeed
      await assertSucceeds(
        setDoc(matchRef, {
          ...matchSummary,
          timestamp: serverTimestamp(),
        }),
      );

      // Verify
      const snap = await getDoc(matchRef);
      expect(snap.data()?.matchId).toBe(matchSummary.matchId);
    });

    it("should prevent writing match history to other users", async () => {
      const user1 = createTestUser({ uid: "user-1" });
      const user2 = createTestUser({ uid: "user-2" });
      const matchSummary = createTestMatchSummary({ uid: user1.uid });

      const db2 = testEnv.authenticatedContext(user2.uid).firestore();
      const matchRef = doc(
        db2,
        "players",
        user1.uid,
        "matchHistory",
        matchSummary.matchId,
      );

      // Should fail: user2 writing to user1's match history
      await assertFails(
        setDoc(matchRef, {
          ...matchSummary,
          timestamp: serverTimestamp(),
        }),
      );
    });
  });

  describe("Leaderboard updates", () => {
    it("should allow writing to own leaderboard entry", async () => {
      const user = createTestUser();
      const db = testEnv.authenticatedContext(user.uid).firestore();

      const leaderboardRef = doc(db, "leaderboard", user.uid);

      const entry = {
        uid: user.uid,
        displayName: user.displayName,
        level: 5,
        trophies: 250,
        wins: 10,
        losses: 3,
        mode: "overall",
        lastUpdated: serverTimestamp(),
      };

      await assertSucceeds(setDoc(leaderboardRef, entry));

      const snap = await getDoc(leaderboardRef);
      expect(snap.data()?.trophies).toBe(250);
    });

    it("should prevent writing arbitrary leaderboard entries", async () => {
      const user = createTestUser();
      const db = testEnv.authenticatedContext(user.uid).firestore();

      const leaderboardRef = doc(db, "leaderboard", "other-uid");

      const entry = {
        uid: "other-uid",
        displayName: "Spoofed!",
        trophies: 9999,
      };

      // Should fail
      await assertFails(setDoc(leaderboardRef, entry));
    });
  });

  describe("Friend requests", () => {
    it("should allow creating friend request with own UID as sender", async () => {
      const user1 = createTestUser({ uid: "user-1" });
      const user2 = createTestUser({ uid: "user-2" });

      const db1 = testEnv.authenticatedContext(user1.uid).firestore();
      const requestRef = doc(db1, "friendRequests", "request-1");

      const request = {
        fromUid: user1.uid,
        toUid: user2.uid,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      await assertSucceeds(setDoc(requestRef, request));

      const snap = await getDoc(requestRef);
      expect(snap.data()?.fromUid).toBe(user1.uid);
    });

    it("should prevent creating friend request with spoofed sender", async () => {
      const user1 = createTestUser({ uid: "user-1" });
      const user2 = createTestUser({ uid: "user-2" });

      const db1 = testEnv.authenticatedContext(user1.uid).firestore();
      const requestRef = doc(db1, "friendRequests", "request-1");

      const maliciousRequest = {
        fromUid: user2.uid, // user1 trying to spoof user2 as sender
        toUid: user1.uid,
        status: "pending",
      };

      // Should fail
      await assertFails(setDoc(requestRef, maliciousRequest));
    });

    it("should allow accepting own pending friend request", async () => {
      const user1 = createTestUser({ uid: "user-1" });
      const user2 = createTestUser({ uid: "user-2" });

      // Create request as user1
      const db1 = testEnv.authenticatedContext(user1.uid).firestore();
      const requestRef = doc(db1, "friendRequests", "req-1");
      await setDoc(requestRef, {
        fromUid: user1.uid,
        toUid: user2.uid,
        status: "pending",
      });

      // Accept as user2
      const db2 = testEnv.authenticatedContext(user2.uid).firestore();
      const requestRef2 = doc(db2, "friendRequests", "req-1");

      await assertSucceeds(updateDoc(requestRef2, { status: "accepted" }));

      const snap = await getDoc(requestRef2);
      expect(snap.data()?.status).toBe("accepted");
    });
  });
});
