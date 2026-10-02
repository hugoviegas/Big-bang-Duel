import { expect, type Page } from "@playwright/test";
import {
  calculateProgression,
  DEFAULT_UNLOCKS,
  normalizeClassMastery,
} from "../../src/lib/progression";

export const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 844, height: 390 },
];

export type Session = "logged-out" | "auth" | "guest";
export type BattleState = "selecting" | "animating" | "game_over";

const FIXED_NOW = new Date("2026-01-15T15:00:00-03:00");

const stats = (wins: number, losses: number, draws: number) => {
  const totalGames = wins + losses + draws;
  return {
    wins,
    losses,
    draws,
    totalGames,
    winRate: totalGames ? Math.round((wins / totalGames) * 1000) / 10 : 0,
  };
};

function fixtureUser(isGuest: boolean) {
  const overall = stats(42, 18, 3);
  return {
    uid: isGuest ? "visual-guest" : "visual-user",
    email: isGuest ? "" : "visual@example.test",
    displayName: isGuest ? "Forasteiro" : "Xerife Visual",
    playerCode: isGuest ? "" : "#A0B1C2D4",
    avatar: "marshal",
    ...overall,
    statsByMode: {
      solo: stats(30, 10, 2),
      online: stats(12, 8, 1),
      overall,
    },
    progression: calculateProgression(isGuest ? 0 : 2400),
    currencies: isGuest ? { gold: 0, ruby: 0 } : { gold: 1250, ruby: 35 },
    ranked: { trophies: 340, trophyPeak: 410 },
    unlocks: DEFAULT_UNLOCKS,
    classMastery: normalizeClassMastery(undefined),
    createdAt: "2026-01-01T12:00:00.000Z",
    isGuest,
    ...(isGuest ? { expiresAt: "2099-01-01T00:00:00.000Z" } : {}),
  };
}

/**
 * Freezes time and randomness, cuts the network to local + Google Fonts,
 * stubs missing audio (D3) and, for auth/guest sessions, seeds the persisted
 * auth store that ProtectedRoute reads. Call before the first navigation.
 */
export async function prepare(page: Page, session: Session) {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.route("**/assets/audio/**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route(
    (url) =>
      url.hostname !== "127.0.0.1" &&
      url.hostname !== "fonts.googleapis.com" &&
      url.hostname !== "fonts.gstatic.com",
    (route) => route.abort(),
  );

  const persistedAuth =
    session === "logged-out"
      ? null
      : JSON.stringify({
          state: { user: fixtureUser(session === "guest"), isAuthenticated: true },
          version: 0,
        });

  await page.addInitScript((auth) => {
    // Seeded PRNG (mulberry32) so Math.random() layouts repeat run to run.
    let seed = 0x5eed;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    if (auth) localStorage.setItem("bbd-auth-storage", auth);
  }, persistedAuth);
}

/** Navigates and waits for the global AssetPreloader to finish. */
export async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText("CARREGANDO ARSENAL")).toHaveCount(0, {
    timeout: 15000,
  });
  await page.waitForLoadState("networkidle");
}

/**
 * Full-page screenshot once every image has loaded (BottomNav icons are
 * loading="lazy", so force them eager). Dust particles are masked: their
 * Math.random() positions are recomputed on every render of the login page.
 */
export async function snap(page: Page, name: string) {
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => {
      img.loading = "eager";
      return img.complete;
    }),
  );
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    mask: [page.locator(".dust-particle")],
  });
}

/**
 * Seeds gameStore with a solo match in the given phase and opens /game via
 * client-side navigation (a full reload would reset the store to idle).
 */
export async function openBattle(page: Page, state: BattleState) {
  await gotoReady(page, "/menu");
  await page.evaluate((state) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { useGameStore } = (window as any).__BBD_VISUAL__;
    useGameStore
      .getState()
      .initializeGame("normal", false, false, undefined, "marshal", {}, "Xerife Visual");

    const { player, opponent } = useGameStore.getState();
    const result = {
      turn: 1,
      playerCard: "shot",
      opponentCard: "reload",
      playerLifeLost: 0,
      opponentLifeLost: 1,
      playerAmmoChange: -1,
      opponentAmmoChange: 1,
      narrative: "Você atirou enquanto o oponente recarregava!",
    };

    if (state === "animating") {
      useGameStore.setState({
        phase: "animating",
        lastResult: result,
        history: [result],
        player: { ...player, selectedCard: "shot", choiceRevealed: true, isAnimating: true, currentAnimation: "shoot" },
        opponent: { ...opponent, life: opponent.life - 1, ammo: 1, selectedCard: "reload", choiceRevealed: true, isAnimating: true, currentAnimation: "hit" },
      });
    }

    if (state === "game_over") {
      useGameStore.setState({
        phase: "game_over",
        turn: 3,
        lastResult: result,
        history: [result, { ...result, turn: 2 }, { ...result, turn: 3 }],
        winnerId: player.id,
        player: { ...player, currentAnimation: "idle" },
        opponent: { ...opponent, life: 0, currentAnimation: "death" },
      });
    }

    window.history.pushState(null, "", "/game");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, state);
  await page.waitForURL("**/game");
  await page.waitForLoadState("networkidle");
}
