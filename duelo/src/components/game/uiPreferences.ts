export const UI_PREFS_UPDATED_EVENT = "bbd-ui-prefs-updated";

const KEY_HIDE_INFO_TEXTS = "bbd-ui-hide-info-texts";
const KEY_USE_CONFIRM_BUTTON = "bbd-ui-use-confirm-button";

export interface UIPreferences {
  hideInfoTexts: boolean;
  useConfirmButton: boolean;
}

function getBool(key: string, defaultValue: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  return raw === "true";
}

function setBool(key: string, value: boolean): void {
  localStorage.setItem(key, value ? "true" : "false");
}

export function getUIPreferences(): UIPreferences {
  return {
    hideInfoTexts: getBool(KEY_HIDE_INFO_TEXTS, false),
    useConfirmButton: getBool(KEY_USE_CONFIRM_BUTTON, true),
  };
}

export function setHideInfoTexts(value: boolean): void {
  setBool(KEY_HIDE_INFO_TEXTS, value);
  window.dispatchEvent(new CustomEvent(UI_PREFS_UPDATED_EVENT));
  // Async save to Firebase (fire and forget)
  savePrefsToDB().catch((err) =>
    console.warn("[uiPreferences] Failed to save hideInfoTexts:", err),
  );
}

export function setUseConfirmButton(value: boolean): void {
  setBool(KEY_USE_CONFIRM_BUTTON, value);
  window.dispatchEvent(new CustomEvent(UI_PREFS_UPDATED_EVENT));
  // Async save to Firebase (fire and forget)
  savePrefsToDB().catch((err) =>
    console.warn("[uiPreferences] Failed to save useConfirmButton:", err),
  );
}

/**
 * Sync UI preferences from Firestore to localStorage when profile loads.
 * Called from authStore after profile is loaded.
 */
export function syncPreferencesFromFirebase(
  prefs: UIPreferences | undefined,
): void {
  if (!prefs) return;
  setBool(KEY_HIDE_INFO_TEXTS, prefs.hideInfoTexts);
  setBool(KEY_USE_CONFIRM_BUTTON, prefs.useConfirmButton);
  window.dispatchEvent(new CustomEvent(UI_PREFS_UPDATED_EVENT));
}

/**
 * Get current preferences ready for saving to Firestore.
 */
export function getPreferencesForFirebase(): UIPreferences {
  return getUIPreferences();
}

/**
 * Save current preferences to Firebase (async, non-blocking).
 * Gets uid from authStore dynamically.
 */
async function savePrefsToDB(): Promise<void> {
  try {
    // Lazy import to avoid circular dependencies
    const { useAuthStore } = await import("../../store/authStore");
    const authStore = useAuthStore.getState();
    const uid = authStore.user?.uid;
    if (!uid) {
      console.warn("[uiPreferences] No uid available, skipping DB save");
      return;
    }

    const { updateUIPreferences } = await import("../../lib/firebaseService");
    const prefs = getPreferencesForFirebase();
    await updateUIPreferences(uid, prefs);
    console.log("[uiPreferences] Saved to Firebase:", prefs);
  } catch (err) {
    console.warn("[uiPreferences] Failed to save to DB:", err);
  }
}
