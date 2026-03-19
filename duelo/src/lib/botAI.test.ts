import { describe, it, expect } from "vitest";
import { botChooseCard, initBotPersona } from "./botAI";
import { getAvailableCards } from "./gameEngine";
import type { CardType, GameMode, PlayerState } from "../types";

/**
 * Tests for Bot AI decision-making determinism and behavior by mode
 */

describe("botAI - card selection by mode", () => {
  // Helper to create a minimal PlayerState
  const createPlayerState = (
    overrides?: Partial<PlayerState>,
  ): PlayerState => ({
    id: "bot",
    character: "skull",
    life: 4,
    maxLife: 4,
    ammo: 2,
    doubleShotsLeft: 2,
    dodgeStreak: 0,
    selectedCard: null,
    choiceRevealed: false,
    isAnimating: false,
    currentAnimation: "idle",
    ...overrides,
  });

  it("should return valid card in beginner mode (reload, shot, dodge only)", () => {
    initBotPersona("beginner");
    const botState = createPlayerState({ life: 3, ammo: 2, dodgeStreak: 0 });
    const playerState = createPlayerState();

    for (let i = 0; i < 5; i++) {
      const card = botChooseCard(botState, [], "beginner", playerState);
      expect(["reload", "shot", "dodge"]).toContain(card);
    }
  });

  it("should return valid card in normal mode (reload, shot, dodge, double_shot)", () => {
    initBotPersona("normal");
    const botState = createPlayerState({ life: 4, ammo: 2, dodgeStreak: 1 });
    const playerState = createPlayerState();

    for (let i = 0; i < 5; i++) {
      const card = botChooseCard(botState, [], "normal", playerState);
      expect(["reload", "shot", "dodge", "double_shot"]).toContain(card);
    }
  });

  it("should return valid card in advanced mode (all 5 cards)", () => {
    initBotPersona("advanced");
    const validCards: CardType[] = [
      "reload",
      "shot",
      "dodge",
      "double_shot",
      "counter",
    ];
    const botState = createPlayerState({ life: 4, ammo: 2, dodgeStreak: 0 });
    const playerState = createPlayerState();

    for (let i = 0; i < 5; i++) {
      const card = botChooseCard(botState, [], "advanced", playerState);
      expect(validCards).toContain(card);
    }
  });

  it("should respect ammo constraints (no shots when ammo=0)", () => {
    initBotPersona("normal");
    const botState = createPlayerState({ life: 4, ammo: 0, dodgeStreak: 0 });
    const playerState = createPlayerState();

    // With ammo=0, bot should only be able to choose from available cards
    for (let i = 0; i < 10; i++) {
      const card = botChooseCard(botState, [], "normal", playerState);
      const available = getAvailableCards("normal", 0, 2, 0);
      expect(available).toContain(card);
    }
  });

  it("should respect dodge streak limit (no dodge when streak >= 3)", () => {
    initBotPersona("advanced");
    const botState = createPlayerState({ life: 4, ammo: 1, dodgeStreak: 3 });
    const playerState = createPlayerState();

    // When dodge streak at limit, should not return dodge
    for (let i = 0; i < 10; i++) {
      const card = botChooseCard(botState, [], "advanced", playerState);
      expect(card).not.toBe("dodge");
    }
  });

  it("should return a card from available set", () => {
    initBotPersona("normal");
    const botState = createPlayerState({ life: 1, ammo: 2, dodgeStreak: 0 });
    const playerState = createPlayerState();

    // Aggressive state: low life should not crash
    for (let i = 0; i < 10; i++) {
      const card = botChooseCard(botState, [], "advanced", playerState);
      const available = getAvailableCards(
        "advanced",
        botState.ammo,
        botState.doubleShotsLeft ?? 2,
        botState.dodgeStreak ?? 0,
      );
      expect(available).toContain(card);
    }
  });
});
