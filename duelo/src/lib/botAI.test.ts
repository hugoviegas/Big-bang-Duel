import { describe, it, expect } from "vitest";
import { botChooseCard, calculateBotThinkTime } from "./botAI";
import type { CardType, GameMode } from "../types";

/**
 * Tests for Bot AI decision-making determinism and behavior by mode
 */

describe("botAI - card selection by mode", () => {
  it("should return valid card in beginner mode (reload, shot, dodge only)", () => {
    const modes: GameMode[] = ["beginner", "normal", "advanced"];

    for (let i = 0; i < 10; i++) {
      const card = botChooseCard(
        { life: 3, ammo: 2, dodgeStreak: 0 },
        "beginner",
      );

      expect(["reload", "shot", "dodge"]).toContain(card);
    }
  });

  it("should return valid card in normal mode (reload, shot, dodge, double_shot)", () => {
    for (let i = 0; i < 10; i++) {
      const card = botChooseCard(
        { life: 4, ammo: 2, dodgeStreak: 1 },
        "normal",
      );

      expect(["reload", "shot", "dodge", "double_shot"]).toContain(card);
    }
  });

  it("should return valid card in advanced mode (all 5 cards)", () => {
    const validCards: CardType[] = [
      "reload",
      "shot",
      "dodge",
      "double_shot",
      "counter",
    ];

    for (let i = 0; i < 10; i++) {
      const card = botChooseCard(
        { life: 4, ammo: 2, dodgeStreak: 0 },
        "advanced",
      );

      expect(validCards).toContain(card);
    }
  });

  it("should respect ammo constraints (no shots when ammo=0)", () => {
    // Run multiple times to increase likelihood of catching a violation
    for (let i = 0; i < 20; i++) {
      const card = botChooseCard(
        { life: 4, ammo: 0, dodgeStreak: 0 },
        "normal",
      );

      // With ammo=0, bot should only be able to choose reload or dodge (no shots)
      expect(["reload", "dodge", "counter"]).toContain(card);
    }
  });

  it("should respect dodge streak limit (no dodge when streak >= 3)", () => {
    for (let i = 0; i < 20; i++) {
      const card = botChooseCard(
        { life: 4, ammo: 1, dodgeStreak: 3 },
        "advanced",
      );

      // When dodge streak at limit, should not return dodge
      expect(card).not.toBe("dodge");
    }
  });

  it("should favor reload when ammo is low", () => {
    // At low ammo, bot should tend toward reload
    const cards: CardType[] = [];
    for (let i = 0; i < 50; i++) {
      cards.push(
        botChooseCard({ life: 4, ammo: 0, dodgeStreak: 0 }, "advanced"),
      );
    }

    const reloadCount = cards.filter((c) => c === "reload").length;
    // Expect at least 25% of decisions to be reload when ammo=0
    expect(reloadCount).toBeGreaterThan(10);
  });

  it("should favor defensive cards when life is low", () => {
    // At low life, bot should tend toward dodge/counter
    const cards: CardType[] = [];
    for (let i = 0; i < 50; i++) {
      cards.push(
        botChooseCard({ life: 1, ammo: 2, dodgeStreak: 0 }, "advanced"),
      );
    }

    const defensiveCount = cards.filter((c) =>
      ["dodge", "counter", "reload"].includes(c),
    ).length;

    // Expect majority to be defensive when life=1
    expect(defensiveCount).toBeGreaterThan(25);
  });
});

describe("botAI - think time calculations", () => {
  it("should return valid think time in range for beginner mode", () => {
    for (let i = 0; i < 10; i++) {
      const time = calculateBotThinkTime("beginner");
      expect(time).toBeGreaterThanOrEqual(1200);
      expect(time).toBeLessThanOrEqual(1800); // Beginner slower
    }
  });

  it("should return valid think time in range for normal mode", () => {
    for (let i = 0; i < 10; i++) {
      const time = calculateBotThinkTime("normal");
      expect(time).toBeGreaterThanOrEqual(1000);
      expect(time).toBeLessThanOrEqual(1500);
    }
  });

  it("should return valid think time in range for advanced mode", () => {
    for (let i = 0; i < 10; i++) {
      const time = calculateBotThinkTime("advanced");
      expect(time).toBeGreaterThanOrEqual(600);
      expect(time).toBeLessThanOrEqual(1200); // Advanced faster (tricky)
    }
  });

  it("should produce different times due to randomization", () => {
    const times = Array.from({ length: 20 }, () =>
      calculateBotThinkTime("normal"),
    );

    // Should not all be identical
    const unique = new Set(times).size;
    expect(unique).toBeGreaterThan(1);
  });
});

describe("botAI - edge cases", () => {
  it("should survive state with zero life (should still pick valid card)", () => {
    // Even with 0 life (unusual state), bot should return a valid card
    const card = botChooseCard({ life: 0, ammo: 1, dodgeStreak: 0 }, "normal");
    expect(["reload", "shot", "dodge", "double_shot"]).toContain(card);
  });

  it("should survive high ammo values", () => {
    const card = botChooseCard(
      { life: 4, ammo: 999, dodgeStreak: 0 },
      "advanced",
    );
    expect(["reload", "shot", "dodge", "double_shot", "counter"]).toContain(
      card,
    );
  });

  it("should survive high dodge streak values", () => {
    const card = botChooseCard(
      { life: 4, ammo: 2, dodgeStreak: 10 },
      "advanced",
    );
    expect(card).not.toBe("dodge"); // Dodge should never be picked
  });
});
