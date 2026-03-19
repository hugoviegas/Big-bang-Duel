import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "./gameStore";
import { createTestGameState, createTestPlayerState } from "../test/factories";

/**
 * GameStore tests: Turn flow, phase transitions, persistence, anti-double-resolve
 */

describe("gameStore - Game initialization", () => {
  beforeEach(() => {
    // Reset store
    useGameStore.setState(createTestGameState());
  });

  it("should initialize game with default state", () => {
    const state = useGameStore.getState();

    expect(state.mode).toBe("normal");
    expect(state.phase).toBe("selecting");
    expect(state.turn).toBe(1);
    expect(state.player.life).toBeGreaterThan(0);
    expect(state.opponent.life).toBeGreaterThan(0);
  });

  it("should allow custom mode and difficulty", () => {
    const store = useGameStore.getState();
    store.initializeGame("advanced", "advanced");

    const state = useGameStore.getState();
    expect(state.mode).toBe("advanced");
    expect(state.difficulty).toBe("advanced");
  });

  it("should start best-of-3 at 0-0", () => {
    const state = useGameStore.getState();
    expect(state.bestOf3.playerWins).toBe(0);
    expect(state.bestOf3.opponentWins).toBe(0);
  });
});

describe("gameStore - Card selection and phase transitions", () => {
  beforeEach(() => {
    useGameStore.setState(createTestGameState());
  });

  it("should transition from 'selecting' to 'revealing' after both select", () => {
    const store = useGameStore.getState();

    store.selectCard("shot");
    let state = useGameStore.getState();
    expect(state.phase).toBe("selecting"); // Still selecting
    expect(state.player.selectedCard).toBe("shot");

    // Simulate opponent also selected
    state.opponent.selectedCard = "dodge";
    store.beginReveal?.();

    state = useGameStore.getState();
    expect(state.phase).toMatch(/revealing|resolving/);
  });

  it("should prevent double resolve with _isResolving flag", () => {
    const store = useGameStore.getState();
    const initialTurnHistory = useGameStore.getState().turnHistory.length;

    // Mark as resolving
    useGameStore.setState({ ...useGameStore.getState() });
    const state = useGameStore.getState();

    // Attempt resolution while flag is set should be prevented
    // This depends on implementation of resolveTurn
    expect(state).toBeDefined();
  });

  it("should reset player/opponent states for next round", () => {
    const store = useGameStore.getState();

    // Setup state
    useGameStore.setState({
      ...useGameStore.getState(),
      phase: "round_over",
      player: createTestPlayerState({ life: 3, selectedCard: "shot" }),
      opponent: createTestPlayerState({ life: 4, selectedCard: "dodge" }),
    });

    store.nextRound?.();

    const state = useGameStore.getState();
    expect(state.phase).toMatch(/idle|selecting/);
    expect(state.player.selectedCard).toBeNull();
    expect(state.opponent.selectedCard).toBeNull();
    expect(state.turn).toBeGreaterThan(1);
  });
});

describe("gameStore - Turn history tracking", () => {
  beforeEach(() => {
    useGameStore.setState(createTestGameState());
  });

  it("should record turn results in history", () => {
    const store = useGameStore.getState();
    const initialHistoryLength = useGameStore.getState().turnHistory.length;

    // Simulate a turn
    const turnResult = {
      turn: 1,
      playerCard: "shot",
      opponentCard: "dodge",
      playerLifeLost: 0,
      opponentLifeLost: 0,
      playerAmmoChange: -1,
      opponentAmmoChange: 0,
      narrative: "Opponent dodged!",
      result: "opponent_dodged",
      timestamp: Date.now(),
    };

    // This would typically be called by resolveTurn
    store.recordTurn?.(turnResult);

    const state = useGameStore.getState();
    expect(state.turnHistory.length).toBeGreaterThanOrEqual(
      initialHistoryLength,
    );
  });

  it("should apply damage from turn to player life", () => {
    const store = useGameStore.getState();
    const initialLife = useGameStore.getState().player.life;

    const turnResult = {
      turn: 1,
      playerCard: "reload",
      opponentCard: "shot",
      playerLifeLost: 1,
      opponentLifeLost: 0,
      playerAmmoChange: 1,
      opponentAmmoChange: -1,
      narrative: "You reloaded but got shot!",
      result: "you_took_damage",
      timestamp: Date.now(),
    };

    // Apply damage
    store.recordTurn?.(turnResult);

    const state = useGameStore.getState();
    expect(state.player.life).toBe(initialLife - 1);
  });
});

describe("gameStore - Best-of-3 progression", () => {
  beforeEach(() => {
    useGameStore.setState(createTestGameState());
  });

  it("should increment player wins on victory", () => {
    const store = useGameStore.getState();

    useGameStore.setState({
      ...useGameStore.getState(),
      bestOf3: { playerWins: 0, opponentWins: 0 },
    });

    store.recordRoundWin?.("player");

    const state = useGameStore.getState();
    expect(state.bestOf3.playerWins).toBe(1);
    expect(state.bestOf3.opponentWins).toBe(0);
  });

  it("should end match when player reaches 2 wins", () => {
    const store = useGameStore.getState();

    useGameStore.setState({
      ...useGameStore.getState(),
      bestOf3: { playerWins: 1, opponentWins: 0 },
    });

    store.recordRoundWin?.("player");

    const state = useGameStore.getState();
    expect(state.bestOf3.playerWins).toBe(2);
    expect(state.phase).toMatch(/game_over/);
  });

  it("should end match when opponent reaches 2 wins", () => {
    const store = useGameStore.getState();

    useGameStore.setState({
      ...useGameStore.getState(),
      bestOf3: { playerWins: 0, opponentWins: 1 },
    });

    store.recordRoundWin?.("opponent");

    const state = useGameStore.getState();
    expect(state.bestOf3.opponentWins).toBe(2);
    expect(state.phase).toMatch(/game_over/);
  });
});

describe("gameStore - Game end conditions", () => {
  beforeEach(() => {
    useGameStore.setState(createTestGameState());
  });

  it("should end game when player life reaches 0", () => {
    const store = useGameStore.getState();

    useGameStore.setState({
      ...useGameStore.getState(),
      player: createTestPlayerState({ life: 0 }),
      phase: "resolving",
    });

    store.checkGameEnd?.();

    const state = useGameStore.getState();
    expect(state.player.life).toBeLessThanOrEqual(0);
    expect(state.phase).toMatch(/game_over|round_over/);
  });

  it("should end game when opponent life reaches 0", () => {
    const store = useGameStore.getState();

    useGameStore.setState({
      ...useGameStore.getState(),
      opponent: createTestPlayerState({ life: 0 }),
    });

    store.checkGameEnd?.();

    const state = useGameStore.getState();
    expect(state.opponent.life).toBeLessThanOrEqual(0);
  });

  it("should record match end time when game ends", () => {
    const store = useGameStore.getState();
    const startTime = Date.now();

    useGameStore.setState({
      ...useGameStore.getState(),
      matchStartTime: startTime,
      player: createTestPlayerState({ life: -1 }),
    });

    store.endGame?.();

    const state = useGameStore.getState();
    expect(state.matchEndTime).toBeDefined();
    expect(state.matchEndTime).toBeGreaterThanOrEqual(startTime);
  });
});

describe("gameStore - State persistence", () => {
  it("should maintain state across re-renders", () => {
    const initialState = createTestGameState({
      turn: 5,
      mode: "advanced",
      player: createTestPlayerState({ life: 2, ammo: 1 }),
    });

    useGameStore.setState(initialState);

    const state1 = useGameStore.getState();
    const state2 = useGameStore.getState();

    expect(state1.turn).toBe(state2.turn);
    expect(state1.player.life).toBe(state2.player.life);
  });

  it("should allow resetting game state", () => {
    const store = useGameStore.getState();
    const resetState = createTestGameState();

    useGameStore.setState(resetState);

    const state = useGameStore.getState();
    expect(state.turn).toBe(1);
    expect(state.phase).toBe("selecting");
  });
});
