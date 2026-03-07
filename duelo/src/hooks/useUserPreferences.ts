/**
 * useUserPreferences
 * ------------------
 * Handles syncing user preferences (selected character, game defaults) between
 * the Zustand authStore (local/localStorage) and Firestore (cross-device).
 *
 * Firestore document path: users/{uid}
 * Fields managed here: avatar, preferences.*
 */
import { useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { updatePlayerProfile } from "../lib/firebaseService";
import type { UserPreferences } from "../types";

// Track which UIDs have already loaded preferences this session.
// Avoids a Firestore read every time the menu remounts.
const _prefsLoadedForUid = new Set<string>();

export function useUserPreferences() {
  const { user, updatePreferences } = useAuthStore();

  /**
   * Loads preferences from Firestore and merges them into local store.
   * Skipped if the user already has preferences loaded this session,
   * OR if they already have preferences saved locally (cross-device sync
   * is handled by Firestore offline persistence in the background).
   */
  const loadPreferences = useCallback(async () => {
    if (!user?.uid) return;

    // Skip if already loaded this session
    if (_prefsLoadedForUid.has(user.uid)) return;

    // Skip if user already has preferences and an avatar set locally —
    // offline persistence will background-sync any remote changes.
    if (user.preferences && user.avatar) {
      _prefsLoadedForUid.add(user.uid);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      _prefsLoadedForUid.add(user.uid); // mark loaded regardless of result
      if (!userDoc.exists()) return;

      const data = userDoc.data();
      const prefs: Partial<UserPreferences> = data.preferences ?? {};

      // Build a merged preferences object to write into the store
      const merged: UserPreferences = {
        selectedCharacter: data.avatar ?? user.avatar ?? "marshal",
        defaultMode:
          prefs.defaultMode ?? user.preferences?.defaultMode ?? "normal",
        defaultAttackTimer:
          prefs.defaultAttackTimer ??
          user.preferences?.defaultAttackTimer ??
          10,
        defaultBestOf3:
          prefs.defaultBestOf3 ?? user.preferences?.defaultBestOf3 ?? false,
        defaultIsPublic:
          prefs.defaultIsPublic ?? user.preferences?.defaultIsPublic ?? false,
      };

      updatePreferences(merged);
    } catch (err) {
      // Silently ignore Firestore errors (offline / permission issues)
      console.warn("[useUserPreferences] loadPreferences failed:", err);
    }
  }, [user, updatePreferences]);

  /**
   * Saves the selected character to Firestore and updates local store.
   * Now updates BOTH users/{uid} AND players/{uid} for consistency.
   */
  const saveCharacter = useCallback(
    async (characterId: string) => {
      if (!user?.uid) return;

      // Save to both collections to maintain consistency
      try {
        // Update players/{uid} - this is the source of truth for the game
        await updatePlayerProfile(user.uid, {
          avatar: characterId,
        });

        // Also update users/{uid} for legacy compatibility
        const ref = doc(db, "users", user.uid);
        await setDoc(ref, { avatar: characterId }, { merge: true });

        // Firebase listener will update local state automatically
        // No need to call updateCharacter() here
      } catch (err) {
        console.warn("[useUserPreferences] saveCharacter failed:", err);
      }
    },
    [user],
  );

  /**
   * Saves a partial preferences update to Firestore and local store.
   */
  const savePreferences = useCallback(
    async (prefs: Partial<UserPreferences>) => {
      // Update local immediately
      updatePreferences(prefs);

      if (!user?.uid) return;
      try {
        const ref = doc(db, "users", user.uid);
        // Firestore: merge nested fields with dot notation
        const firestoreUpdate: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(prefs)) {
          firestoreUpdate[`preferences.${key}`] = value;
        }
        // Also update top-level avatar if character changed
        if (prefs.selectedCharacter) {
          firestoreUpdate.avatar = prefs.selectedCharacter;
        }
        await updateDoc(ref, firestoreUpdate);
      } catch (err) {
        // If doc doesn't exist yet, use setDoc
        try {
          const ref = doc(db, "users", user.uid);
          await setDoc(ref, { preferences: prefs }, { merge: true });
        } catch {
          console.warn("[useUserPreferences] savePreferences failed:", err);
        }
      }
    },
    [user, updatePreferences],
  );

  return { loadPreferences, saveCharacter, savePreferences };
}
