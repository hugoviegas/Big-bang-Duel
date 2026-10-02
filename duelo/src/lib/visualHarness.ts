/**
 * Test-only hooks for the Playwright visual harness (`npm run test:visual`).
 *
 * Imported from main.tsx only when `import.meta.env.DEV` is true and
 * VITE_VISUAL_HARNESS === "true" (set in .env.visual). `vite build` sets DEV to
 * false, so this module never ships in a production bundle.
 *
 * Auth itself is not faked here: the Playwright fixtures seed the persisted
 * auth store in localStorage and App.tsx skips the Firebase auth listener in
 * this mode. See docs/TEST_GUIDE.md.
 */
import { disableNetwork } from "firebase/firestore";
import { goOffline } from "firebase/database";
import { MotionGlobalConfig } from "framer-motion";
import { db, rtdb } from "./firebase";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";

// Deterministic screenshots: framer-motion animations jump to their end state,
// and Firestore/RTDB answer from the (empty) local cache instead of a server.
MotionGlobalConfig.skipAnimations = true;
void disableNetwork(db);
goOffline(rtdb);

// Lets the fixtures seed battle states (e2e/visual/fixtures.ts).
(window as unknown as Record<string, unknown>).__BBD_VISUAL__ = {
  useAuthStore,
  useGameStore,
};
