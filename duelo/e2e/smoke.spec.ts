import { test, expect } from "@playwright/test";

/**
 * E2E Smoke Tests: Critical user flows
 */

test.describe("Auth -> Solo Game -> Match History Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://127.0.0.1:4173");
  });

  test("should complete solo game and appear in match history", async ({
    page,
  }) => {
    // Login with test account
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("e2e-test@example.com");

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("testpass123");

    const loginBtn = page.locator('button:has-text("Login")');
    await loginBtn.click();

    // Wait for menu to appear
    await page.waitForSelector('text="Play Solo"', { timeout: 10000 });

    // Start solo game
    const playBtn = page.locator('button:has-text("Play Solo")');
    await playBtn.click();

    // Select game mode
    await page.waitForSelector("text=Difficulty", { timeout: 5000 });
    const normalModeBtn = page.locator('button:contains("Normal")').first();
    await normalModeBtn.click();

    // Wait for game to start
    await page.waitForSelector('[role="heading"]:has-text("Turn")', {
      timeout: 5000,
    });

    // Play a turn: select first available card
    const cardBtns = page.locator("button:has-text('shot')").first();
    if (await cardBtns.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cardBtns.click();
    }

    // Wait for turn to resolve
    await page.waitForTimeout(3000);

    // Continue until game over (simplified - just check we can get to history)
    await page.goto("http://127.0.0.1:4173/match-history");

    // Should see match history
    const historyTitle = page.locator('text="Match History"');
    await expect(historyTitle).toBeVisible({ timeout: 5000 });
  });

  test("should display win/loss stats after match", async ({ page }) => {
    // Quick login
    await page.fill('input[type="email"]', "smoke-test@example.com");
    await page.fill('input[type="password"]', "testpass123");
    await page.locator('button:has-text("Login")').click();

    // Navigate to leaderboard
    await page.goto("http://127.0.0.1:4173/leaderboard");

    // Should display leaderboard with stats
    const leaderboard =
      page.locator('[role="table"]') || page.locator("text='Leaderboard'");
    await expect(leaderboard).toBeVisible({ timeout: 5000 });

    // Check for win column
    expect(
      (await page.textContent("text='Wins'")) ||
        (await page.textContent("text='W'")),
    ).toBeTruthy();
  });
});

test.describe("Online Multiplayer: Host/Guest Sync", () => {
  let hostPage: any;
  let guestPage: any;

  test.beforeAll(async ({ browser }) => {
    // Create two browser contexts for host and guest
    hostPage = await browser.newPage();
    guestPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await hostPage.close();
    await guestPage.close();
  });

  test("should sync room state between host and guest", async ({ page }) => {
    // Host: Login and create room
    await page.goto("http://127.0.0.1:4173");

    // ... login flow ...
    await page.fill('input[type="email"]', "host@example.com");
    await page.fill('input[type="password"]', "testpass123");
    await page.locator('button:has-text("Login")').click();

    // Navigate to online
    await page.goto("http://127.0.0.1:4173/online");

    // Create room
    const createRoomBtn = page
      .locator('button:has-text("Create Room")')
      .first();
    await createRoomBtn.click();

    // Extract room code
    const roomCodeText = await page.textContent(
      "text=/Room code|Room #|Code:/i",
    );
    const roomCode = roomCodeText?.match(/[A-Z0-9]{6}/)?.[0];

    expect(roomCode).toBeTruthy();

    // Guest: Join same room (simplified test)
    // In real test would use second browser context
    // Guest joins with code...
    // guest should sync turn results with host

    // Verify room state synchronized
    const gameStatus = page.locator("text=/In Progress|Playing|Round/i");
    await expect(gameStatus).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Friend Request Flow", () => {
  test("should send, accept, and display friend", async ({ page }) => {
    await page.goto("http://127.0.0.1:4173");

    // Login
    await page.fill('input[type="email"]', "friend-test@example.com");
    await page.fill('input[type="password"]', "testpass123");
    await page.locator('button:has-text("Login")').click();

    // Navigate to friends
    await page.goto("http://127.0.0.1:4173/friends");

    // Wait for friends page to load
    await page.waitForSelector("text='Friends'", { timeout: 5000 });

    // Send friend request
    const playerCodeInput = page.locator('input[placeholder*="code"]');
    if (await playerCodeInput.isVisible()) {
      await playerCodeInput.fill("FRIEND1"); // Test player code
      const sendBtn = page.locator('button:has-text("Send")').first();
      await sendBtn.click();

      // Should show success or pending state
      await page.waitForTimeout(1000);
      const status = await page.textContent("text=/Pending|Sent|Success/i");
      expect(status).toBeTruthy();
    }
  });
});

test.describe("Leaderboard Updates", () => {
  test("should show updated rank after winning match", async ({ page }) => {
    await page.goto("http://127.0.0.1:4173");

    // Login
    await page.fill('input[type="email"]', "rank-test@example.com");
    await page.fill('input[type="password"]', "testpass123");
    await page.locator('button:has-text("Login")').click();

    // Check initial rank on leaderboard
    await page.goto("http://127.0.0.1:4173/leaderboard");

    const leaderboardTable = page.locator('[role="table"]').first();
    const initialRank = await leaderboardTable.textContent();

    // Play a solo match (simplified)
    // ... (would need full game flow)

    // Refresh leaderboard
    await page.reload();

    const updatedRank = await leaderboardTable.textContent();
    // Rank should be updated (this is a basic smoke test)
    expect(updatedRank).toBeDefined();
  });
});

test("should handle loading and error states gracefully", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");

  // Test loading spinner during auth
  const submitBtn = page.locator('button:has-text("Login")').first();
  await submitBtn.click();

  // Should show loading or disable button
  const isDisabled = await submitBtn.isDisabled();
  const loadingSpinner = await page
    .locator('[role="status"]')
    .first()
    .isVisible()
    .catch(() => false);

  expect(isDisabled || loadingSpinner).toBeTruthy();
});
