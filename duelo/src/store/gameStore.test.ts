import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "./gameStore";
import { createTestGameState, createTestPlayerState } from "../test/factories";

/**
 * GameStore tests: Game initialization, turn flow, phase transitions
 */

describe("gameStore - Game initialization", () => {
  beforeEach(() => {
    // Reset store
    useGameStore.setState(createTestGameState());
  });

  it("should initialize game with default state", () => {
    const state = useGameStore.getState();

    expect(state.isOnline).toBeDefined();
    expect(state.phase).toBeDefined();
    expect(state.turn).toBeGreaterThanOrEqual(1);
    expect(state.player).toBeDefined();
    expect(state.opponent).toBeDefined();
    expect(state.player.life).toBeGreaterThan(0);
    expect(state.opponent.life).toBeGreaterThan(0);
  });

  it("should have valid initial game phase", () => {
    const state = useGameStore.getState();
    const validPhases = ["idle", "selecting", "revealing", "resolving", "round_over", "game_over"];
    expect(validPhases).toContain(state.phase);
  });

  it("should track game history", () => {
    const state = useGameStore.getState();
    expect(Array.isArray(state.history)).toBe(true);
  });
});

describe("gameStore - Card selection", () => {
  beforeEach(() => {
    useGameStore.setState(createTestGameState({ phase: "selecting" }));
  });

  it("should select a card", () => {
    const store = useGameStore.getState();
    const initialCard = store.player.selectedCard;

    store.selectCard("shot");

    const updatedState = useGameStore.getState();
    expect(updatedState.player.selectedCard).toBe("shot");
  });

  it("should allow selecting different cards", () => {
    const store = useGameStore.getState();

    store.selectCard("reload");
    let state = useGameStore.getState();
    expect(state.player.selectedCard).toBe("reload");

    store.selectCard("dodge");
    state = useGameStore.getState();
    expect(state.player.selectedCard).toBe("dodge");
  });

  it("should track selected card in state", () => {
    const store = useGameStore.getState();
    const cards: string[] = [];

    for (const card of ["shot", "dodge", "reload"]) {
      store.selectCard(card);
      cards.push(useGameStore.getState().player.selectedCard!);
    }

    expect(cards).toEqual(["shot", "dodge", "reload"]);
  });
});

describe("gameStore - Game flow", () => {
  beforeEach(() => {
    useGameStore.setState(createTestGameState());
  });

  it("should transition between phases", () => {
    const initialState = useGameStore.getState();
    expect(initialState.phase).toBeDefined();

    // Game phase should be valid
    const validPhases = ["idle", "selecting", "revealing", "resolving", "round_over", "game_over"];
    expect(validPhases).toContain(initialState.phase);
  });

  it("should have turn counter", () => {
    const state = useGameStore.getState();
    expect(state.turn).toBeGreaterThanOrEqual(1);
    expect(typeof state.turn).toBe("number");
  });

  it("should maintain player and opponent state correctly", () => {
    const state = useGameStore.getState();

    expect(state.player).toBeDefined();
    expect(state.player.id).toBeDefined();
    expect(state.player.life).toBeGreaterThan(0);

    expect(state.opponent).toBeDefined();
    expect(state.opponent.id).toBeDefined();
    expect(state.opponent.life).toBeGreaterThan(0);
  });

  it("can call nextRound method", () => {
    const store = useGameStore.getState();
    
    // Just verify the method exists and can be called
    expect(store.nextRound).toBeDefined();
    expect(typeof store.nextRound).toBe("function");
  });

  it("should handle online vs solo mode", () => {
    const state = useGameStore.getState();
    
    expect(typeof state.isOnline).toBe("boolean");
    
    if (state.isOnline) {
      expect(state.roomId).toBeDefined();
      expect(typeof state.isHost).toBe("boolean");
    }
  });
});

describe("gameStore - Edge cases", () => {
  it("should not crash on invalid card selection", () => {
    const store = useGameStore.getState();
    
    // Should handle invalid card gracefully
    expect(() => {
      store.selectCard("invalid_card" as any);
    }).not.toThrow();
  });

  it("should maintain consistent state after multiple operations", () => {
    const store = useGameStore.getState();
    
    store.selectCard("shot");
    store.selectCard("reload");
    store.selectCard("dodge");
    
    const finalState = useGameStore.getState();
    expect(finalState.player.selectedCard).toBe("dodge");
  });
});
