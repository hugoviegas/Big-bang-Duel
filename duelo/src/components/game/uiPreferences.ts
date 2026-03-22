export const UI_PREFS_UPDATED_EVENT = "bbd-ui-prefs-updated";

const KEY_INFO_DISPLAY_MODE = "bbd-ui-info-display-mode";

// Info display modes
export const INFO_DISPLAY_MODES = {
  SHOW_INFO: 0,     // Mostra dicas, descrição da carta e botão confirmar
  BUTTON_ONLY: 1,   // Apenas botão de confirmar
  HIDE_ALL: 2,      // Esconde tudo
} as const;

export type InfoDisplayMode = (typeof INFO_DISPLAY_MODES)[keyof typeof INFO_DISPLAY_MODES];

export interface UIPreferences {
  infoDisplayMode: InfoDisplayMode;
}

function getNumber(key: string, defaultValue: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  const num = parseInt(raw, 10);
  return isNaN(num) ? defaultValue : num;
}

function setNumber(key: string, value: number): void {
  localStorage.setItem(key, String(value));
}

export function getUIPreferences(): UIPreferences {
  const modeNum = getNumber(KEY_INFO_DISPLAY_MODE, INFO_DISPLAY_MODES.SHOW_INFO);
  // Ensure it's a valid mode (0, 1, or 2)
  const validMode = (modeNum === 0 || modeNum === 1 || modeNum === 2 ? modeNum : INFO_DISPLAY_MODES.SHOW_INFO) as InfoDisplayMode;
  return {
    infoDisplayMode: validMode,
  };
}

export function setInfoDisplayMode(value: InfoDisplayMode): void {
  setNumber(KEY_INFO_DISPLAY_MODE, value);
  window.dispatchEvent(new CustomEvent(UI_PREFS_UPDATED_EVENT));
  // Async save to Firebase (fire and forget)
  savePrefsToDB().catch((err) =>
    console.warn("[uiPreferences] Failed to save infoDisplayMode:", err),
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
  setNumber(KEY_INFO_DISPLAY_MODE, prefs.infoDisplayMode);
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
    // Cast to the types expected by Firestore
    const prefsForDB = prefs as any;
    await updateUIPreferences(uid, prefsForDB);
    console.log("[uiPreferences] Saved to Firebase:", prefs);
  } catch (err) {
    console.warn("[uiPreferences] Failed to save to DB:", err);
  }
}
