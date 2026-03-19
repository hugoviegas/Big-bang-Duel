# Big Bang Duel - Test Strategy & Guide

## Phase 1 MVP Complete ✅

This document describes the comprehensive test strategy implemented for Big Bang Duel game. Testing is organized in waves, starting with MVP (fast feedback + safety net) then expanding to full coverage.

---

## 📊 Test Pyramid Structure (MVP Focus)

```
                    E2E Tests (Playwright)           ~5 tests
                    Integration Tests (Emulator)     ~15 tests
    Unit Tests (Vitest + RTL)                        ~30-40 tests
```

---

## 🚀 Running Tests Locally

### Prerequisites

```bash
cd duelo
npm install
npm install -D @firebase/rules-unit-testing
```

### Unit & Integration Tests (TypeScript/Node)

```bash
# Run all unit tests
npm run test:unit

# Run with watch mode (re-run on file change)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm run test:unit -- src/lib/gameEngine.test.ts

# Run integration tests only
npm run test:integration
```

### E2E Tests (Playwright)

```bash
# Run Playwright smoke tests headless
npm run test:e2e

# Run with UI (browser visible)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/smoke.spec.ts

# Debug mode (slow motion + inspector)
npx playwright test --debug
```

### Python Tests (Training module)

```bash
cd training
pip install -r requirements.txt
pip install pytest  # If not already installed

# Run pytest
python -m pytest tests/ -v

# Run with markers
python -m pytest tests/ -m "not slow" -v
```

### Complete CI Pipeline (Local)

```bash
# Run everything (unit + coverage + e2e)
npm run test:ci
```

---

## 📁 Test File Structure

```
duelo/
├── src/
│   ├── lib/
│   │   ├── gameEngine.test.ts         ✅ Card combination matrix (25 combos)
│   │   ├── botAI.test.ts              ⚠️  Persona + decision determinism (WIP)
│   │   ├── progression.test.ts        ⚠️  XP/level/trophy calculations (WIP)
│   │   ├── achievements.test.ts       ⚠️  Unlock conditions (WIP)
│   ├── store/
│   │   ├── authStore.test.ts          ✅ Auth state, profile bootstrap
│   │   ├── gameStore.test.ts          ✅ Turn flow, phases, persistence
│   │   ├── friendsStore.test.ts       📋 (todo)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginScreen.test.tsx   ✅ Existing mocked tests
│   │   │   └── LoginScreen.integration.test.tsx ✅ RTL + validation
│   │   └── (other components to be tested in later phases)
│   └── test/
│       ├── setup.ts                   ✅ Global test configuration
│       ├── factories.ts               ✅ Deterministic test data builders
│       └── matchers.ts                ✅ Custom assertions
├── tests/
│   └── integration/
│       └── firestore.rules.test.ts    ✅ Firestore/RTDB rules validation (Emulator)
├── e2e/
│   └── smoke.spec.ts                  ✅ Critical user flows (Playwright)
├── training/
│   ├── tests/
│   │   └── test_game_engine.py        ✅ MVP invariants + config checks
│   └── pytest.ini                     ✅ Pytest configuration
├── vitest.config.ts                   ✅ Vitest + coverage config
├── playwright.config.ts               ✅ Playwright config with retries
└── README.md                          📍 You are here
```

**Legend:** ✅ Implemented | ⚠️ In Progress | 📋 Todo | 🔧 Setup

---

## 🎯 MVP Test Coverage (Phase 1)

### What's Tested (MVP)

- ✅ Game engine resolution matrix (25 card combinations)
- ✅ AuthStore state management (login, logout, preferences)
- ✅ GameStore phase transitions and turn flow
- ✅ LoginScreen form validation and error handling
- ✅ Firestore security rules (ownership, unauthorized writes)
- ✅ Match history CRUD and cleanup logic
- ✅ Leaderboard updates (write restrictions)
- ✅ Friend request lifecycle (send, accept, reject)
- ✅ E2E critical flows: auth → solo game → history, online multiplayer, leaderboard

### What's NOT Tested Yet (Phase 2+)

- ⏳ BotAI decision trees (complex logic requires refactoring tests)
- ⏳ Progression calculations (XP/level boundary tests)
- ⏳ Achievement unlock engine (condition evaluation matrix)
- ⏳ RTDB real-time listeners (timing/race conditions)
- ⏳ Offline persistence (IndexedDB)
- ⏳ Cross-browser E2E tests
- ⏳ Performance benchmarks
- ⏳ Visual regression tests

---

## 🔍 Test Data & Factories

All tests use deterministic test data via factories in `src/test/factories.ts`:

```typescript
// Create any test data with defaults + overrides
const user = createTestUser({ uid: "test-uid", level: 5 });
const room = createTestRoom({ isPublic: true });
const match = createTestMatchSummary({ result: "win" });

// Seed-based generation for reproducible data
const seededUser = createDeterministicUser((seed = 42));
```

Factories ensure:

- Tests don't depend on random data
- Easy to create complex nested objects
- Reusable across all test suites

---

## 🛡️ Firebase Emulator Setup

Integration tests use Firebase Emulator Suite running locally. To run:

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start --project bigbangduel --help

# Terminal 2: Run tests (automatically connects to emulator)
npm run test:integration
```

**Key Points:**

- Emulator is isolated from production Firebase
- Tests create/destroy data per test file
- Rules are validated against actual firestore.rules
- RTDB state sync is fully simulated

---

## 📋 Quality Gates (MVP Thresholds)

Tests must pass these gates before merge:

| Metric                | Threshold                   | Module                      |
| --------------------- | --------------------------- | --------------------------- |
| Unit Tests            | ✅ All pass                 | gameEngine, stores          |
| Integration Tests     | ✅ All pass (with emulator) | Firebase rules, CRUD        |
| E2E Smoke             | ✅ All pass (no flakes)     | Auth, Solo, Online, History |
| Coverage (LOC)        | ≥50%                        | src/lib, src/store          |
| Coverage (gameEngine) | ≥90%                        | src/lib/gameEngine.ts       |

---

## 🐛 Debugging Failed Tests

### Unit Test Failures

```bash
# Run single failing test with verbose output
npm run test:unit -- --reporter=verbose src/lib/gameEngine.test.ts

# Run with debugging breakpoints (if using VS Code)
node --inspect-brk ./node_modules/vitest/vitest.mjs run src/lib/gameEngine.test.ts
```

### E2E Test Failures

```bash
# Generate trace for failed test (auto-captured on failure)
npx playwright show-trace trace.zip

# Run with headed mode to see browser
npx playwright test e2e/smoke.spec.ts --headed

# Slow down execution (1000ms between actions)
npx playwright test e2e/smoke.spec.ts --headed --slow-mo=1000
```

### Firebase Emulator Issues

```bash
# Clear emulator state completely
firebase emulators:start --project bigbangduel --import=./emulator-seed-data

# View emulator logs
firebase emulators:start --debug --project bigbangduel
```

---

## 🚢 CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
        python-version: [3.10, 3.11]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      # Node tests
      - run: cd duelo && npm install
      - run: cd duelo && npm run test:unit
      - run: cd duelo && npm run test:coverage
      - run: cd duelo && npm run test:e2e

      # Python tests
      - run: cd duelo/training && pip install -r requirements.txt pytest
      - run: cd duelo/training && python -m pytest tests/ -v

  # Upload coverage reports
  coverage:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: codecov/codecov-action@v3
        with:
          files: ./duelo/coverage/coverage-final.json
```

---

## 📖 Writing New Tests

### Example: Unit Test (Vitest)

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myModule";

describe("myModule", () => {
  it("should do X when given Y", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });
});
```

### Example: Integration Test (Firebase Emulator)

```typescript
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";

describe("Firestore rules", () => {
  it("should allow write to own collection", async () => {
    const db = testEnv.authenticatedContext(userId).firestore();
    await assertSucceeds(setDoc(doc(db, "users", userId), data));
  });

  it("should prevent write to other's collection", async () => {
    const db = testEnv.authenticatedContext(userId).firestore();
    await assertFails(setDoc(doc(db, "users", otherId), data));
  });
});
```

### Example: E2E Test (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test("user can login and see game menu", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.fill('input[type="email"]', "test@example.com");
  await page.fill('input[type="password"]', "testpass123");
  await page.click("button:text('Login')");

  await expect(page).toHaveURL(/\/menu|\/online/);
  await expect(page.locator("text='Play Solo'")).toBeVisible();
});
```

---

## 🔄 Test Maintenance & Flakiness

### Common E2E Flakes & Fixes

| Issue                | Cause             | Fix                                                |
| -------------------- | ----------------- | -------------------------------------------------- |
| "Element not found"  | Timing issue      | Use `waitForSelector` + longer timeout             |
| "Button click fails" | Element not ready | Add `waitForLoadState('networkidle')`              |
| "Data mismatch"      | Stale data        | Clear storage with `page.context().clearCookies()` |

### Test Quarantine

Tests that flake intermittently can be skipped:

```typescript
test.skip("flaky test", async ({ page }) => {
  // TODO: Fix race condition
});
```

Create GitHub issue to track and fix before release.

---

## 📊 Coverage Reports

After running tests:

```bash
# Open HTML coverage report
open coverage/index.html

# Check specific module coverage
cat coverage/coverage-summary.json | grep gameEngine
```

---

## 🎓 Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Firebase Emulator Testing](https://firebase.google.com/docs/emulator-suite)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Pytest Documentation](https://docs.pytest.org/)

---

## 📝 Contributing

When adding new features:

1. Write tests FIRST (TDD approach)
2. Ensure Unit Tests pass: `npm run test:unit`
3. Add Integration Tests for Firebase interactions
4. Add E2E smoke test for critical user flows
5. Check coverage: `npm run test:coverage`
6. Submit PR with test results

---

**Last Updated:** March 18, 2026  
**Maintainer:** Hugo (QA Lead)  
**Status:** Phase 1 MVP Complete ✅
