import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  // Visual baselines: e2e/__screenshots__/<name>-<viewport>-<platform>.png
  snapshotPathTemplate: "e2e/__screenshots__/{arg}-{platform}{ext}",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Visual QA harness: npm run test:visual (see docs/TEST_GUIDE.md).
      // Viewports are set per describe block in the specs.
      name: "visual",
      testDir: "./e2e/visual",
      testMatch: "**/*.visual.ts",
      retries: 0,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4174",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        serviceWorkers: "block",
        // Raster large async-decoded images (BottomNav icons) in the same
        // frame instead of a frame later, so screenshots never miss them.
        launchOptions: { args: ["--disable-checker-imaging"] },
        trace: "off",
        video: "off",
      },
      expect: {
        toHaveScreenshot: { animations: "disabled", caret: "hide" },
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      // Dev server in `visual` mode: loads .env.visual (fake Firebase + harness flag).
      command:
        "npm run dev -- --mode visual --host 127.0.0.1 --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
