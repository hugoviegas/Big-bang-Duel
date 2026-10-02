import { test } from "@playwright/test";
import {
  VIEWPORTS,
  gotoReady,
  openBattle,
  prepare,
  snap,
  type BattleState,
  type Session,
} from "./fixtures";

// Every route in App.tsx. Guests are redirected to /menu from the
// GuestRestrictedRoute pages, so only routes guests can open get a guest shot.
const ROUTES: { name: string; path: string; sessions: Session[] }[] = [
  { name: "login", path: "/", sessions: ["logged-out"] },
  { name: "menu", path: "/menu", sessions: ["auth", "guest"] },
  { name: "characters", path: "/characters", sessions: ["auth", "guest"] },
  { name: "profile", path: "/profile", sessions: ["auth"] },
  { name: "shop", path: "/shop", sessions: ["auth"] },
  { name: "missions", path: "/missions", sessions: ["auth", "guest"] },
  { name: "achievements", path: "/achievements", sessions: ["auth", "guest"] },
  { name: "friends", path: "/friends", sessions: ["auth"] },
  { name: "match-history", path: "/match-history", sessions: ["auth"] },
  { name: "leaderboard", path: "/leaderboard", sessions: ["auth"] },
  { name: "online", path: "/online", sessions: ["auth"] },
  { name: "design-system", path: "/design-system", sessions: ["auth"] },
  // No active match: current behaviour redirects to /menu.
  { name: "game-direct", path: "/game", sessions: ["auth"] },
];

const BATTLE_STATES: BattleState[] = ["selecting", "animating", "game_over"];

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;

  test.describe(size, () => {
    test.use({ viewport });

    for (const route of ROUTES) {
      for (const session of route.sessions) {
        const name = session === "guest" ? `${route.name}-guest` : route.name;

        test(name, async ({ page }) => {
          await prepare(page, session);
          await gotoReady(page, route.path);
          await snap(page, `${name}-${size}.png`);
        });
      }
    }

    for (const state of BATTLE_STATES) {
      test(`battle-${state}`, async ({ page }) => {
        await prepare(page, "auth");
        await openBattle(page, state);
        await snap(page, `battle-${state}-${size}.png`);
      });
    }
  });
}
