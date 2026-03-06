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
import type { UserPreferences } from "../types";

export function useUserPreferences() {
  const { user, updateCharacter, updatePreferences } = useAuthStore();

  /**
   * Loads preferences from Firestore and merges them into local store.
   * Call this once on first mount of any screen that needs up-to-date prefs.
   */
  const loadPreferences = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
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
  }, [user?.uid]);

  /**
   * Saves the selected character to Firestore and updates local store.
   */
  const saveCharacter = useCallback(
    async (characterId: string) => {
      // Always update local immediately for snappy UI
      updateCharacter(characterId);

      if (!user?.uid) return;
      try {
        const ref = doc(db, "users", user.uid);
        await setDoc(ref, { avatar: characterId }, { merge: true });
      } catch (err) {
        console.warn("[useUserPreferences] saveCharacter failed:", err);
      }
    },
    [user?.uid, updateCharacter],
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
    [user?.uid, updatePreferences],
  );

  return { loadPreferences, saveCharacter, savePreferences };
}
