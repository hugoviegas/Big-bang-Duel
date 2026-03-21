/**
 * Bot AI — Strategy System v5.2 — Mechanics-Aware Adaptive Intelligence
 *
 * CRITICAL RULES & GAME MECHANICS:
 * ──────────────────────────────────────────────────────────────────────
 *
 * [MANDATORY RULES]
 *  • Turn 1: Always reload (never dodge) — ensures sane opening
 *  • Ammo=3: Never reload — forces smart offense/defense decision
 *
 * [GAME MECHANICS AWARENESS]
 *  • Opponent Ammo=0: Cannot attack → Dodge/Counter 100% wasted → Attack/Reload
 *  • Opponent Ammo=1-2: Mixed threat → Ready defensive options
 *  • Opponent Ammo=3: Max threat → Strong defense or preemptive attack
 *  • RELOAD during attack: Still gains +1 ammo (safe defensive play)
 *  • DODGE vs double_shot: Only blocks 1 shot (still takes 1 dmg)
 *  • COUNTER: Costs 1 ammo, beats shot/double_shot, 1 dmg output
 *
 * [STRATEGIC AMMO ANALYSIS]
 *  • analyzeAmmoContext(): Determines if opponent likely to attack/reload/defend
 *  • estimateOpponentIntent(): Predicts next move from:
 *      - Current ammo level
 *      - Recent play patterns
 *      - Life/health pressure
 *  • calculateSafeDefense(): Chooses dodge vs counter based on ammo patterns
 *
 * [PREDICTIVE INTELLIGENCE]
 *  • predictOpponentMove(): Forecast opponent's next play from last 3 moves
 *  • estimateOpponentAmmo(): Infer ammo using fuzzy logic (±1 variance)
 *  • detectAdvancedPattern(): 12+ pattern types
 *
 * [ADAPTIVE STRATEGY]
 *  • Personas shift micro-tactics based on opponent ammo state
 *  • Punisher: Exploits patterns relentlessly
 *  • Aggressor: Capitalizes on opponent's low ammo
 *  • Counter_trap: Reads ammo, sets traps
 *  • Ammo_hoarder: Manages ammo economies strategically
 *  • Phantom: Random but ammo-aware safety checks
 *
 * [MATH: Boltzmann Sampling + Context-Aware Persona Bias + Ammo Weights]
 *  p'(card) = (p_q_table(card) ^ (1/T)) × (1 + bias[card] + contextBonus + ammoWeight)
 */

import type { PlayerState, CardType, GameMode } from "../types";
import { getAvailableCards, MAX_DOUBLE_SHOT_USES } from "./gameEngine";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BotPersona =
  | "aggressor" // Pressiona sem parar; prefere tiros e tiro duplo
  | "counter_trap" // Espera o adversário atacar para responder com contra-golpe
  | "ammo_hoarder" // Acumula munição e ataca pesado no momento certo
  | "punisher" // Detecta e pune padrões repetitivos com precisão máxima
  | "phantom"; // Alta entropia — difícil de ler, mistura estilos livremente

interface PersonaConfig {
  temperature: number; // Boltzmann T ∈ [0.5, 2.0]
  bluffChance: number; // Probability of surprise move
  cardBias: Partial<Record<CardType, number>>; // Card preference biases
  antiPatternStrength: number; // How aggressively to counter (0–1)
}

interface OpponentAnalysis {
  estimatedAmmo: number; // Fuzzy estimate ±1
  lastMoveType: "aggressive" | "defensive" | "neutral" | null;
  predictedNextMove: CardType | null;
  isFollowingPattern: boolean;
  consistencyScore: number; // 0–1: how predictable opponent is
}

export interface BotRuntimeState {
  activePersona: BotPersona;
  matchTurnCount: number;
  opponentAnalysis: OpponentAnalysis;
}

interface CardOutcome {
  dmgTaken: number; // Damage bot receives (0–2)
  dmgDealt: number; // Damage bot deals (0–2)
  ammoChgBot: number; // Ammo change for bot (-2 to +1)
  ammoChgOpp: number; // Ammo change for opponent (-2 to +1)
  netDamage: number; // dmgDealt - dmgTaken (heuristic value)
}

interface OpponentDistribution {
  cards: Array<{ card: CardType; probability: number }>;
  confidence: number; // 0–1: how certain we are about this distribution
}

// ─── Persona Configs ──────────────────────────────────────────────────────────

const PERSONAS: Record<BotPersona, PersonaConfig> = {
  aggressor: {
    temperature: 0.6,
    bluffChance: 0.05,
    cardBias: { shot: 0.15, double_shot: 0.18, reload: -0.12, dodge: -0.08 },
    antiPatternStrength: 0.5,
  },
  counter_trap: {
    temperature: 0.85,
    bluffChance: 0.1,
    cardBias: { counter: 0.3, dodge: 0.12, shot: -0.12, reload: 0.05 },
    antiPatternStrength: 0.8,
  },
  ammo_hoarder: {
    temperature: 0.7,
    bluffChance: 0.08,
    cardBias: { reload: 0.18, double_shot: 0.25, shot: -0.08 },
    antiPatternStrength: 0.4,
  },
  punisher: {
    temperature: 0.5,
    bluffChance: 0.12,
    cardBias: {},
    antiPatternStrength: 1.0,
  },
  phantom: {
    temperature: 2.0,
    bluffChance: 0.22,
    cardBias: {},
    antiPatternStrength: 0.2,
  },
};

// ─── Global State ────────────────────────────────────────────────────────────

let _activePersona: BotPersona = "punisher";
let _matchTurnCount = 0; // Track turn within match
let _opponentAnalysis: OpponentAnalysis = {
  estimatedAmmo: 0,
  lastMoveType: null,
  predictedNextMove: null,
  isFollowingPattern: false,
  consistencyScore: 0,
};

export function exportBotRuntimeState(): BotRuntimeState {
  return {
    activePersona: _activePersona,
    matchTurnCount: _matchTurnCount,
    opponentAnalysis: { ..._opponentAnalysis },
  };
}

export function restoreBotRuntimeState(state: Partial<BotRuntimeState>): void {
  if (state.activePersona && state.activePersona in PERSONAS) {
    _activePersona = state.activePersona;
  }
  if (typeof state.matchTurnCount === "number" && state.matchTurnCount >= 0) {
    _matchTurnCount = Math.floor(state.matchTurnCount);
  }
  if (state.opponentAnalysis) {
    _opponentAnalysis = {
      estimatedAmmo: state.opponentAnalysis.estimatedAmmo ?? 0,
      lastMoveType: state.opponentAnalysis.lastMoveType ?? null,
      predictedNextMove: state.opponentAnalysis.predictedNextMove ?? null,
      isFollowingPattern: state.opponentAnalysis.isFollowingPattern ?? false,
      consistencyScore: state.opponentAnalysis.consistencyScore ?? 0,
    };
  }
}

export function rebuildBotRuntimeFromHistory(
  turn: number,
  playerHistory: CardType[],
): void {
  _matchTurnCount = Math.max(0, turn - 1);
  if (playerHistory.length > 0) {
    analyzeOpponent(playerHistory, {
      id: "player",
      displayName: "player",
      avatar: "marshal",
      life: 3,
      maxLife: 3,
      ammo: 0,
      maxAmmo: 3,
      selectedCard: null,
      choiceRevealed: false,
      isAnimating: false,
      currentAnimation: "idle",
      wins: 0,
      dodgeStreak: 0,
      doubleShotsLeft: MAX_DOUBLE_SHOT_USES,
      characterClass: "atirador",
      classMasteryLevel: 1,
      shieldUsesLeft: 2,
    });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initializes the bot's persona for a new match.
 * Selects a random persona with mode-weighted distribution.
 * Resets match turn counter.
 */
export function initBotPersona(mode: GameMode): BotPersona {
  _matchTurnCount = 0;
  _opponentAnalysis = {
    estimatedAmmo: 0,
    lastMoveType: null,
    predictedNextMove: null,
    isFollowingPattern: false,
    consistencyScore: 0,
  };

  const weights: Record<BotPersona, number> = {
    aggressor: mode === "advanced" ? 1.6 : mode === "normal" ? 1.1 : 0.8,
    counter_trap: mode === "advanced" ? 1.5 : mode === "normal" ? 1.2 : 0.7,
    ammo_hoarder: mode === "normal" ? 1.3 : 1.0,
    punisher: 1.0,
    phantom: mode === "beginner" ? 0.4 : 1.0,
  };

  const personas = Object.keys(PERSONAS) as BotPersona[];
  const total = personas.reduce((s, p) => s + weights[p], 0);
  let r = Math.random() * total;

  for (const p of personas) {
    r -= weights[p];
    if (r <= 0) {
      _activePersona = p;
      console.log(
        `%c[Bot Persona]%c ${p.toUpperCase()} | mode=${mode} | temp=${PERSONAS[p].temperature}`,
        "color: #9b59b6; font-weight: bold",
        "color: #e74c3c; font-weight: bold",
      );
      return p;
    }
  }

  _activePersona = "punisher";
  return "punisher";
}

/**
 * Main decision function: chooses bot's next card.
 * NOW: EV-based (Expected Value) primary decision.
 * Falls back to persona-aware logic if EV insufficient.
 */
export function botChooseCard(
  botState: PlayerState,
  playerHistory: CardType[],
  mode: GameMode,
  playerState: PlayerState,
): CardType {
  _matchTurnCount++;

  const available = getAvailableCards(
    mode,
    botState.ammo,
    botState.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
    botState.dodgeStreak ?? 0,
  );

  if (available.length === 1) return available[0];

  const persona = PERSONAS[_activePersona];

  // ─── APPLY CRITICAL RULES FIRST ────────────────────────────────────────
  // RULE 1: Turn 1 always reload
  if (_matchTurnCount === 1) {
    const card = available.includes("reload") ? "reload" : available[0];
    return applyCriticalRules(card, botState, available, _matchTurnCount);
  }

  // RULE 2: Ammo=3 never reload
  if (botState.ammo === 3) {
    const nonReload = available.filter((c) => c !== "reload");
    if (nonReload.length > 0) {
      // Use EV-based with filtered set
      const card = selectOptimalCardByEV(
        botState,
        playerHistory,
        playerState,
        nonReload,
        persona,
      );
      return card;
    }
  }

  // ─── PRIMARY: EV-BASED DECISION ────────────────────────────────────────
  try {
    const card = selectOptimalCardByEV(
      botState,
      playerHistory,
      playerState,
      available,
      persona,
    );

    return card;
  } catch (e) {
    console.error(`[EV calculation error] ${e}, falling back to persona logic`);
  }

  // ─── FALLBACK: ENHANCED PERSONA-AWARE LOGIC ────────────────────────────
  const fallbackCard = fallbackWithPersonaV2(
    botState,
    playerHistory,
    mode,
    available,
    persona,
    playerState,
  );

  // Log fallback decision thought
  try {
    const oppDist = predictOpponentDistributionMulti(
      playerHistory,
      estimateOpponentAmmo(playerHistory),
      playerState.life,
      botState.life,
    );
    logDecisionDetailed(
      fallbackCard,
      null,
      oppDist,
      persona,
      _activePersona,
      botState,
      playerState,
      "fallback",
      "persona fallback",
    );
  } catch (err) {}

  return fallbackCard;
}

/**
 * Decide for a given persona without mutating global match counters.
 * Useful for simulations between two bots where both must be evaluated
 * within the same round without advancing `_matchTurnCount` twice.
 */
export function decideForPersona(
  personaName: BotPersona,
  botState: PlayerState,
  playerHistory: CardType[],
  mode: GameMode,
  opponentState: PlayerState,
): CardType {
  const persona = PERSONAS[personaName];
  const available = getAvailableCards(
    mode,
    botState.ammo,
    botState.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
    botState.dodgeStreak ?? 0,
  );

  return selectOptimalCardByEV(
    botState,
    playerHistory,
    opponentState,
    available,
    persona,
  );
}

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * RULE 1: Turn 1 always reload
 * RULE 2: Ammo=3 never reload
 * These are enforced before any persona logic.
 */
function applyCriticalRules(
  card: CardType,
  botState: PlayerState,
  available: CardType[],
  turn: number,
): CardType {
  // RULE 1: First turn must reload
  if (turn === 1) {
    if (card === "dodge") {
      return available.includes("reload") ? "reload" : available[0];
    }
  }

  // RULE 2: At 3 ammo, never reload (must attack or defend)
  if (botState.ammo === 3) {
    if (card === "reload") {
      const alternatives = available.filter((c) => c !== "reload");
      if (alternatives.length > 0) {
        return alternatives[Math.floor(Math.random() * alternatives.length)];
      }
    }
  }

  return card;
}

/**
 * GAME MECHANICS ANALYSIS: Determines opponent's likely move based on ammo level.
 *
 * Opponent Ammo Context:
 * - 0 ammo: CANNOT attack → dodge/counter are wasted → must attack or reload
 * - 1 ammo: Can shot OR counter (pick one) → moderate threat
 * - 2 ammo: Can shot + double_shot OR counter → high threat, likely to attack
 * - 3 ammo: Full arsenal → very likely to attack with double_shot
 *
 * Returns strategy recommendation for bot.
 */
function analyzeAmmoContext(
  opponentAmmo: number,
): "force_attack" | "ready_defense" | "prepare_counter" | "mixed" {
  if (opponentAmmo === 0) {
    // Opponent has NO ammo → cannot attack → wasted moves
    // Bot should: attack or reload (NOT dodge/counter)
    return "force_attack";
  } else if (opponentAmmo === 1) {
    // Opponent might shot or counter next
    // Bot: be ready but not guaranteed
    return "mixed";
  } else if (opponentAmmo === 2) {
    // Opponent likely to attack (shot or double_shot)
    // Bot: prepare defense
    return "ready_defense";
  } else {
    // opponentAmmo === 3 (MAX)
    // Very likely to attack with shot/double_shot or counter
    // Bot: strong defense or preemptive attack
    return "prepare_counter";
  }
}

/**
 * Hard-filter cards that are strategically invalid for the current opponent ammo.
 * This prevents wasted turns like dodge/counter when opponent cannot attack.
 */
function sanitizeCardsForOpponentAmmo(
  available: CardType[],
  opponentAmmo: number,
): CardType[] {
  if (opponentAmmo !== 0) return available;

  const filtered = available.filter((c) => c !== "dodge" && c !== "counter");
  return filtered.length > 0 ? filtered : available;
}

/**
 * Determines if bot should dodge or counter based on opponent patterns and ammo.
 * Avoids wasting defensive moves when opponent cannot attack.
 */
function calculateSafeDefense(
  opponentAmmo: number,
  opponentHistory: CardType[],
  botAmmo: number,
  _botHealth: number,
  available: CardType[],
): "dodge" | "counter" | "reload" | null {
  // If opponent has 0 ammo: dodge and counter are 100% wasted
  if (opponentAmmo === 0) {
    return null; // Don't use defensive moves
  }

  // If opponent likely to shoot (high ammo) → prefer dodge/counter
  if (opponentAmmo >= 2) {
    // Has counter ammo available?
    if (botAmmo >= 1 && available.includes("counter")) {
      // Counter works vs any attack and costs ammo efficiently
      return "counter";
    }
    // Otherwise dodge (free) vs shots
    if (available.includes("dodge")) {
      return "dodge";
    }
  }

  // If opponent at medium ammo (1) → mixed threat
  if (opponentAmmo === 1) {
    // Check history: is opponent more aggressive or defensive?
    const lastCard = opponentHistory[opponentHistory.length - 1];
    if (lastCard === "shot" || lastCard === "double_shot") {
      // Opponent just attacked → likely will reload or attack again
      if (available.includes("dodge")) return "dodge";
      if (botAmmo >= 1 && available.includes("counter")) return "counter";
    }
  }

  return null;
}

/**
 * Estimates if opponent will likely ATTACK next or RELOAD/DEFEND.
 * Combines ammo level with recent pattern.
 */
function estimateOpponentIntent(
  opponentAmmo: number,
  opponentHealth: number,
  opponentHistory: CardType[],
): "likely_attack" | "likely_reload" | "likely_defense" | "uncertain" {
  // If recently reloaded → will attack soon
  const last2 = opponentHistory.slice(-2);
  const recentReload = last2.some((c) => c === "reload");

  // If at max ammo → high likelihood of attack
  if (opponentAmmo === 3) {
    return "likely_attack";
  }

  // If 2 ammo and just reloaded → will attack (has resources)
  if (opponentAmmo === 2 && recentReload) {
    return "likely_attack";
  }

  // If 0 ammo → will reload or defend, NOT attack
  if (opponentAmmo === 0) {
    return "likely_reload";
  }

  // If low health → likely defensive
  if (opponentHealth <= 1) {
    return "likely_defense";
  }

  // Default: uncertain
  return "uncertain";
}

/**
 * Predicts opponent's next move based on last 3 cards.
 * Uses pattern recognition and personality detection.
 */
function predictOpponentMove(playerHistory: CardType[]): CardType | null {
  if (playerHistory.length < 1) return null;

  const last3 = playerHistory.slice(-3);
  const last2 = playerHistory.slice(-2);
  const last1 = playerHistory.slice(-1)[0];

  // Pattern: immediate repeat
  if (last2.length === 2 && last2[0] === last2[1]) {
    // 40% chance they repeat again
    if (Math.random() < 0.4) return last1;
    // 60% chance they switch
  }

  // Alternating pattern detection
  if (last3.length === 3) {
    const [a, b, c] = last3;
    if (a === c && a !== b) {
      // Alternating: very likely to repeat C again
      if (Math.random() < 0.65) return c;
    }
  }

  // Basic cycle: reload → shot, shot → dodge, dodge → reload
  if (last1 === "reload") {
    if (Math.random() < 0.5) return "shot";
  } else if (last1 === "shot" || last1 === "double_shot") {
    if (Math.random() < 0.45) return "dodge";
  } else if (last1 === "dodge") {
    if (Math.random() < 0.4) return "reload";
  }

  return null;
}

/**
 * Estimates opponent ammo from 5-turn history.
 * Uses fuzzy logic: estimates reload count but adds ±1 uncertainty
 * to prevent perfect knowledge of opponent state.
 */
function estimateOpponentAmmo(playerHistory: CardType[]): number {
  const maxAmmo = 3;
  const last5 = playerHistory.slice(-5);

  // Count reloads in recent history
  const reloadCount = last5.filter((c) => c === "reload").length;
  // Count shots in recent history
  const shotCount = last5.filter(
    (c) => c === "shot" || c === "double_shot",
  ).length;

  // Estimate current ammo as: current - shots + reloads
  // Start with assumption of 0 ammo (conservative)
  let estimate = reloadCount - shotCount;

  // Fuzzy noise: preserve uncertainty, but keep stronger confidence near 0 ammo.
  let noise = 0;
  if (estimate <= 0) {
    // Opponent likely dry: only occasionally push estimate upward.
    noise = Math.random() < 0.8 ? 0 : 1;
  } else {
    noise = Math.random() < 0.5 ? -1 : Math.random() < 0.5 ? 0 : 1;
  }
  estimate += noise;

  // Clamp to [0, maxAmmo]
  return Math.max(0, Math.min(maxAmmo, estimate));
}

/**
 * Analyzes opponent behavior and updates internal analysis state.
 */
function analyzeOpponent(
  playerHistory: CardType[],
  _playerState: PlayerState,
): void {
  const lastCard =
    playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  // Classify last move type
  let lastMoveType: "aggressive" | "defensive" | "neutral" = "neutral";
  if (
    lastCard === "shot" ||
    lastCard === "double_shot" ||
    lastCard === "counter"
  ) {
    lastMoveType = "aggressive";
  } else if (lastCard === "dodge" || lastCard === "reload") {
    lastMoveType = "defensive";
  }

  // Check consistency (is opponent following patterns?)
  const isFollowingPattern = !!detectAdvancedPattern(playerHistory);
  const consistencyScore =
    playerHistory.length > 0
      ? Math.min(
          1,
          playerHistory.filter((_, i) => {
            if (i === 0) return false;
            // Count how often same move repeats
            return playerHistory[i] === playerHistory[i - 1];
          }).length / Math.max(1, playerHistory.length - 1),
        )
      : 0;

  _opponentAnalysis = {
    estimatedAmmo: estimateOpponentAmmo(playerHistory),
    lastMoveType,
    predictedNextMove: predictOpponentMove(playerHistory),
    isFollowingPattern,
    consistencyScore,
  };

  // Heuristic fallback for early turns: when history is short the pattern
  // detector may return null. Provide a simple heuristic prediction so the
  // UI/logs show a plausible next-move (and tactics that rely on
  // `predictedNextMove` have something to act upon).
  if (!_opponentAnalysis.predictedNextMove) {
    const histLen = playerHistory.length;
    const estAmmo = _opponentAnalysis.estimatedAmmo;
    if (histLen === 0) {
      // Opening heuristic: dry opponents likely reload, ammoful opponents likely attack
      _opponentAnalysis.predictedNextMove =
        estAmmo === 0 ? "reload" : estAmmo >= 2 ? "double_shot" : "shot";
    } else if (histLen < 3) {
      // With minimal history, bias towards reload if dry, otherwise moderate attack
      _opponentAnalysis.predictedNextMove = estAmmo === 0 ? "reload" : "shot";
    }
  }
}

/**
 * Enhanced pattern detection with 12+ pattern types.
 */
function detectAdvancedPattern(
  history: CardType[],
): { pattern: string; counter: string[]; confidence: number } | null {
  if (history.length < 2) return null;

  const last5 = history.slice(-5);
  const last3 = history.slice(-3);

  // [SIMPLE REPEATS]
  if (last3.length === 3 && last3.every((c) => c === "reload")) {
    return {
      pattern: "reload_spam",
      counter: ["double_shot", "shot"],
      confidence: 0.9,
    };
  }
  if (last3.length === 3 && last3.every((c) => c === "dodge")) {
    return {
      pattern: "dodge_spam",
      counter: ["shot", "double_shot"],
      confidence: 0.9,
    };
  }

  // [PRESSURE CYCLES]
  const attackCount = last5.filter(
    (c) => c === "shot" || c === "double_shot",
  ).length;
  if (attackCount >= 3) {
    return {
      pattern: "shot_heavy",
      counter: ["dodge", "counter"],
      confidence: 0.8,
    };
  }

  const counterCount = last5.filter((c) => c === "counter").length;
  if (counterCount >= 2) {
    return {
      pattern: "counter_farm",
      counter: ["reload", "dodge"],
      confidence: 0.75,
    };
  }

  // [TRANSITIONS]
  const dodgeCount = last5.filter((c) => c === "dodge").length;
  if (dodgeCount >= 4) {
    return {
      pattern: "dodge_heavy",
      counter: ["shot", "double_shot"],
      confidence: 0.85,
    };
  }

  // [ALTERNATING PATTERNS]
  if (last3.length === 3) {
    const [a, , c] = last3;

    if (a === "reload" && c === "reload") {
      return {
        pattern: "reload_alt",
        counter: ["double_shot", "shot"],
        confidence: 0.7,
      };
    }
    if (a === "shot" && c === "shot") {
      return {
        pattern: "shot_alt",
        counter: ["counter", "dodge"],
        confidence: 0.7,
      };
    }
    if (a === "dodge" && c === "dodge") {
      return {
        pattern: "dodge_alt",
        counter: ["shot", "double_shot"],
        confidence: 0.7,
      };
    }

    // Rhythm change: defense→offense transition
    if (
      (a === "reload" || a === "dodge") &&
      (c === "shot" || c === "double_shot")
    ) {
      return {
        pattern: "defense_to_offense",
        counter: ["counter", "dodge"],
        confidence: 0.65,
      };
    }

    // Rhythm change: offense→defense transition
    if (
      (a === "shot" || a === "double_shot") &&
      (c === "reload" || c === "dodge")
    ) {
      return {
        pattern: "offense_to_defense",
        counter: ["shot", "double_shot"],
        confidence: 0.65,
      };
    }
  }

  // [STAGNATION DETECTION]
  if (last5.length > 0) {
    const uniqueCards = new Set(last5).size;
    if (uniqueCards === 1) {
      return {
        pattern: "total_stagnation",
        counter: ["shot", "double_shot"],
        confidence: 0.95,
      };
    }
  }

  return null;
}

/**
 * OUTCOME MATRIX: Pre-computed results for all 5x5 card combinations.
 * Returns the outcome when botCard is played vs oppCard.
 *
 * Returns: { dmgTaken, dmgDealt, ammoChgBot, ammoChgOpp, netDamage }
 */
function getCardOutcome(botCard: CardType, oppCard: CardType): CardOutcome {
  // Baseline
  let dmgTaken = 0,
    dmgDealt = 0,
    ammoChgBot = 0,
    ammoChgOpp = 0;

  // ─── RELOAD outcomes ───────────────────────────────────────────────────────
  if (botCard === "reload") {
    ammoChgBot = 1;
    if (oppCard === "reload") {
      ammoChgOpp = 1; // Both reload
    } else if (oppCard === "shot") {
      dmgTaken = 1;
      ammoChgOpp = -1;
    } else if (oppCard === "double_shot") {
      dmgTaken = 2;
      ammoChgOpp = -2;
    }
    // DODGE & COUNTER: no effect on reload
  }

  // ─── SHOT outcomes ───────────────────────────────────────────────────────
  else if (botCard === "shot") {
    ammoChgBot = -1;

    if (oppCard === "reload") {
      dmgDealt = 1;
      ammoChgOpp = 1;
    } else if (oppCard === "shot") {
      dmgDealt = 1;
      dmgTaken = 1;
      ammoChgOpp = -1;
    } else if (oppCard === "double_shot") {
      dmgDealt = 1;
      dmgTaken = 2;
      ammoChgOpp = -2;
    } else if (oppCard === "dodge") {
      // SHOT blocked
      ammoChgOpp = 0;
    } else if (oppCard === "counter") {
      dmgTaken = 1; // Counter reflects 1 dmg
      ammoChgOpp = -1;
    }
  }

  // ─── DOUBLE_SHOT outcomes ───────────────────────────────────────────────────
  else if (botCard === "double_shot") {
    ammoChgBot = -2;

    if (oppCard === "reload") {
      dmgDealt = 2;
      ammoChgOpp = 1;
    } else if (oppCard === "shot") {
      dmgDealt = 2;
      dmgTaken = 1;
      ammoChgOpp = -1;
    } else if (oppCard === "double_shot") {
      dmgDealt = 2;
      dmgTaken = 2;
      ammoChgOpp = -2;
    } else if (oppCard === "dodge") {
      // DOUBLE_SHOT vs DODGE: 1 dmg penetrates (NOVA REGRA)
      dmgDealt = 1;
      ammoChgOpp = 0;
    } else if (oppCard === "counter") {
      dmgTaken = 1; // Counter reflects 1 of the 2
      dmgDealt = 1;
      ammoChgOpp = -1;
    }
  }

  // ─── DODGE outcomes ───────────────────────────────────────────────────────
  else if (botCard === "dodge") {
    if (oppCard === "reload") {
      // DODGE vs RELOAD: nothing
      ammoChgOpp = 1;
    } else if (oppCard === "shot") {
      // DODGE blocks SHOT
      ammoChgOpp = -1;
    } else if (oppCard === "double_shot") {
      // DODGE vs DOUBLE: 1 dmg penetrates
      dmgTaken = 1;
      ammoChgOpp = -2;
    } else if (oppCard === "dodge") {
      // Both dodge: nothing
    } else if (oppCard === "counter") {
      // COUNTER vs DODGE: nothing
      ammoChgOpp = -1;
    }
  }

  // ─── COUNTER outcomes ───────────────────────────────────────────────────────
  else if (botCard === "counter") {
    ammoChgBot = -1;

    if (oppCard === "reload") {
      // COUNTER vs RELOAD: nothing
      ammoChgOpp = 1;
    } else if (oppCard === "shot") {
      // COUNTER beats SHOT: reflects 1 dmg
      dmgDealt = 1;
      ammoChgOpp = -1;
    } else if (oppCard === "double_shot") {
      // COUNTER vs DOUBLE: reflects 1 (partial block)
      dmgDealt = 1;
      ammoChgOpp = -2;
    } else if (oppCard === "dodge") {
      // COUNTER vs DODGE: nothing
      ammoChgOpp = 0;
    } else if (oppCard === "counter") {
      // Both counter: mutual impasse
      ammoChgOpp = -1;
    }
  }

  return {
    dmgTaken,
    dmgDealt,
    ammoChgBot,
    ammoChgOpp,
    netDamage: dmgDealt - dmgTaken,
  };
}

/**
 * Multi-option opponent prediction: Returns probability distribution over next move.
 * Considers: opponent ammo, recent history, patterns, game state.
 *
 * Returns: { cards: [{ card, probability }], confidence }
 */
export function predictOpponentDistributionMulti(
  opponentHistory: CardType[],
  estimatedOppAmmo: number,
  opponentHealth: number,
  botHealth: number,
): OpponentDistribution {
  const distribution: Array<{ card: CardType; probability: number }> = [];

  // Get available cards for opponent at current ammo
  const oppAvailable = getAvailableCards("advanced", estimatedOppAmmo, 2, 0);

  // Baseline: equal distribution over available
  const baseProb = 1.0 / oppAvailable.length;
  for (const card of oppAvailable) {
    distribution.push({ card, probability: baseProb });
  }

  // ─── AMMO STATE ADJUSTMENTS ───────────────────────────────────────────────
  let totalProb = 0;

  if (estimatedOppAmmo === 0) {
    // Can't attack: RELOAD most likely (60%), DODGE (25%), COUNTER (15%)
    for (const d of distribution) {
      if (d.card === "reload") d.probability = 0.6;
      else if (d.card === "dodge") d.probability = 0.25;
      else if (d.card === "counter") d.probability = 0.15;
      else d.probability = 0.0; // Not available
    }
  } else if (estimatedOppAmmo === 1) {
    // Medium threat: RELOAD (40%), SHOT (35%), DODGE (15%), COUNTER (10%)
    for (const d of distribution) {
      if (d.card === "reload") d.probability = 0.4;
      else if (d.card === "shot") d.probability = 0.35;
      else if (d.card === "dodge") d.probability = 0.15;
      else if (d.card === "counter") d.probability = 0.1;
      else d.probability = 0.0;
    }
  } else if (estimatedOppAmmo === 2) {
    // High threat: SHOT (25%), DOUBLE_SHOT (30%), RELOAD (25%), DODGE (10%), COUNTER (10%)
    for (const d of distribution) {
      if (d.card === "reload") d.probability = 0.25;
      else if (d.card === "shot") d.probability = 0.25;
      else if (d.card === "double_shot") d.probability = 0.3;
      else if (d.card === "dodge") d.probability = 0.1;
      else if (d.card === "counter") d.probability = 0.1;
      else d.probability = 0.0;
    }
  } else if (estimatedOppAmmo === 3) {
    // Max threat: SHOT (30%), DOUBLE_SHOT (45%), DODGE (10%), COUNTER (15%)
    // NO RELOAD at max ammo
    for (const d of distribution) {
      if (d.card === "shot") d.probability = 0.3;
      else if (d.card === "double_shot") d.probability = 0.45;
      else if (d.card === "dodge") d.probability = 0.1;
      else if (d.card === "counter") d.probability = 0.15;
      else d.probability = 0.0;
    }
  }

  // ─── HEALTH PRESSURE ADJUSTMENTS ───────────────────────────────────────────
  if (opponentHealth <= 1) {
    // Low health: defensive moves boosted (DODGE +30%, RELOAD +20%)
    for (const d of distribution) {
      if (d.card === "dodge") d.probability *= 1.3;
      else if (d.card === "reload") d.probability *= 1.2;
      else if (d.card === "shot") d.probability *= 0.8;
      else if (d.card === "double_shot") d.probability *= 0.7;
    }
    totalProb = distribution.reduce((s, d) => s + d.probability, 0);
  }

  if (botHealth <= 1) {
    // Bot in danger: opp likely to attack (SHOT +40%, DOUBLE_SHOT +50%)
    for (const d of distribution) {
      if (d.card === "shot") d.probability *= 1.4;
      else if (d.card === "double_shot") d.probability *= 1.5;
      else if (d.card === "dodge") d.probability *= 0.9;
      else if (d.card === "reload") d.probability *= 0.7;
    }
    totalProb = distribution.reduce((s, d) => s + d.probability, 0);
  }

  // ─── RECENCY BIAS: Boost probability of recent cards ─────────────────────
  const last3 = opponentHistory.slice(-3);
  for (const card of last3) {
    const idx = distribution.findIndex((d) => d.card === card);
    if (idx !== -1) {
      distribution[idx].probability *= 1.2;
    }
  }

  // ─── PATTERN BONUS ───────────────────────────────────────────────────────
  const pattern = detectAdvancedPattern(opponentHistory);
  if (pattern && pattern.confidence > 0.5) {
    // Slightly boost any card in opp's pattern that's available
    for (const patternCard of pattern.counter) {
      const idx = distribution.findIndex(
        (d) => d.card === (patternCard as CardType),
      );
      if (idx !== -1) {
        distribution[idx].probability *= 0.9; // Opp AVOIDS our counter
      }
    }
  }

  // ─── NORMALIZE ─────────────────────────────────────────────────────────────
  totalProb = distribution.reduce((s, d) => s + d.probability, 0);
  const normalized: Array<{ card: CardType; probability: number }> = [];
  for (const d of distribution) {
    if (totalProb > 0 && d.probability > 0) {
      normalized.push({
        card: d.card,
        probability: d.probability / totalProb,
      });
    }
  }

  const confidence = Math.min(1.0, opponentHistory.length * 0.15); // Confidence grows with history

  return {
    cards: normalized,
    confidence,
  };
}

/**
 * EXPECTED VALUE CALCULATION:
 * EV(botCard) = Σ P(oppCard) × outcome(botCard, oppCard)
 *
 * Considers:
 * - Net damage (primary objective)
 * - Ammo efficiency (secondary)
 * - Health preservation (tertiary for low-health states)
 * - Win conditions (bonus for kills)
 */
function calculateExpectedValue(
  botCard: CardType,
  oppDistribution: OpponentDistribution,
  botState: PlayerState,
  opponentState: PlayerState,
): number {
  let ev = 0.0;

  for (const { card: oppCard, probability: p } of oppDistribution.cards) {
    const outcome = getCardOutcome(botCard, oppCard);

    // ─── PRIMARY: Net damage (cumulative payoff) ──────────────────────────
    const immediateDmg = outcome.netDamage; // dmgDealt - dmgTaken

    // ─── SECONDARY: Ammo efficiency (normalized -2..+1) ──────────────────
    const ammoScore = (outcome.ammoChgBot - outcome.ammoChgOpp) * 0.15;

    // ─── TERTIARY: Life preservation (penalize risky when low health) ────
    let defensiveMod = 0.0;
    if (outcome.dmgTaken > 0 && botState.life <= 2) {
      defensiveMod = -0.5 * outcome.dmgTaken; // Penalize damage taken
    }

    // ─── QUATERNARY: Win condition bonus ────────────────────────────────
    let winBonus = 0.0;
    const oppNewLife = opponentState.life - outcome.dmgDealt;
    if (oppNewLife <= 0) {
      winBonus = 50.0; // Near-guaranteed win bonus
    } else if (oppNewLife === 1) {
      winBonus = 5.0; // Kill shot bonus
    }

    const turnValue = immediateDmg + ammoScore + defensiveMod + winBonus;
    ev += p * turnValue;
  }

  return ev;
}

/**
 * Helper: compute EV scores for each available card and return the
 * opponent distribution used. Exported for testing and simulation.
 */
export function getEVScores(
  botState: PlayerState,
  playerHistory: CardType[],
  oppState: PlayerState,
  available: CardType[],
): {
  evScores: Partial<Record<CardType, number>>;
  oppDistribution: OpponentDistribution;
} {
  const estimatedOppAmmo = estimateOpponentAmmo(playerHistory);
  const oppDistribution = predictOpponentDistributionMulti(
    playerHistory,
    estimatedOppAmmo,
    oppState.life,
    botState.life,
  );

  const evScores: Partial<Record<CardType, number>> = {};
  for (const card of available) {
    evScores[card] = calculateExpectedValue(
      card,
      oppDistribution,
      botState,
      oppState,
    );
  }

  return { evScores, oppDistribution };
}

/**
 * Structured decision logger — prints decision and 'thought' in one place.
 */
function logDecisionDetailed(
  decision: CardType,
  evScores: Partial<Record<CardType, number>> | null,
  oppDistribution: OpponentDistribution | null,
  persona: PersonaConfig,
  personaName: BotPersona,
  botState: PlayerState,
  opponentState: PlayerState,
  source: string,
  reason?: string,
) {
  try {
    console.groupCollapsed(
      `%c[BOT AI] Decision: ${decision.toUpperCase()} — ${source}`,
      "color: #2c3e50; font-weight: bold",
    );

    console.log("Decision:", decision);
    console.log("Source:", source, reason ?? "");
    console.log("Persona:", personaName, persona);

    if (evScores) console.log("EV Scores:", evScores);
    if (oppDistribution) console.log("Opponent Distribution:", oppDistribution);

    console.log("Opponent Analysis:", _opponentAnalysis);
    console.log("Bot State:", {
      life: botState.life,
      ammo: botState.ammo,
      dodgeStreak: botState.dodgeStreak,
    });
    console.log("Opponent State:", {
      life: opponentState.life,
      ammo: opponentState.ammo,
    });

    console.groupEnd();
  } catch (err) {
    // Logging must never throw
    console.log("[BOT AI] decision log error", err);
  }
}

/**
 * SELECT OPTIMAL CARD: Chooses card with best EV + persona bias + Boltzmann sampling.
 *
 * Applies:
 * 1. EV calculation for each available card
 * 2. Persona-based adjustments
 * 3. Boltzmann sampling for soft randomization
 */
function selectOptimalCardByEV(
  botState: PlayerState,
  playerHistory: CardType[],
  oppState: PlayerState,
  available: CardType[],
  persona: PersonaConfig,
): CardType {
  // Ensure internal opponent analysis is up-to-date so logs and any
  // context-sensitive bonuses relying on `_opponentAnalysis` are accurate.
  analyzeOpponent(playerHistory, oppState);

  const estimatedOppAmmo = estimateOpponentAmmo(playerHistory);
  const oppDistribution = predictOpponentDistributionMulti(
    playerHistory,
    estimatedOppAmmo,
    oppState.life,
    botState.life,
  );
  // Prevent choosing defensive moves when opponent cannot attack
  const sanitizedAvailable = sanitizeCardsForOpponentAmmo(
    available,
    estimatedOppAmmo,
  );

  const evScores: Partial<Record<CardType, number>> = {};
  // Calculate EV for each available card (use sanitized set)
  for (const card of sanitizedAvailable) {
    evScores[card] = calculateExpectedValue(
      card,
      oppDistribution,
      botState,
      oppState,
    );
  }

  console.log(
    `%c[EV-BASED SELECTION]%c Cards: ${Object.keys(evScores).join(", ")} | EV: ${Object.entries(
      evScores,
    )
      .map(([c, ev]) => `${c}=${ev.toFixed(2)}`)
      .join(", ")}`,
    "color: #f39c12; font-weight: bold",
    "color: #34495e",
  );

  // ─── APPLY PERSONA CONTEXT ADJUSTMENTS ─────────────────────────────────
  const adjustedEV: Partial<Record<CardType, number>> = { ...evScores };

  // Aggressive persona: boost offensive cards
  if (persona === PERSONAS.aggressor) {
    for (const card of available) {
      if (card === "shot" || card === "double_shot") {
        adjustedEV[card] = (adjustedEV[card] ?? 0) * 1.2;
      } else if (card === "dodge" || card === "reload") {
        adjustedEV[card] = (adjustedEV[card] ?? 0) * 0.85;
      }
    }
  }

  // Counter trap: boost defensive/counter cards
  if (persona === PERSONAS.counter_trap) {
    for (const card of available) {
      if (card === "counter" || card === "dodge") {
        adjustedEV[card] = (adjustedEV[card] ?? 0) * 1.3;
      } else if (card === "double_shot") {
        adjustedEV[card] = (adjustedEV[card] ?? 0) * 0.9;
      }
    }
  }

  // Ammo hoarder: boost reload when ammo low, double when high
  if (persona === PERSONAS.ammo_hoarder) {
    if (botState.ammo <= 1) {
      adjustedEV.reload = (adjustedEV.reload ?? 0) * 1.4;
    }
    if (botState.ammo === 3) {
      adjustedEV.double_shot = (adjustedEV.double_shot ?? 0) * 1.3;
    }
  }

  // Punisher: already boosted by pattern detection above

  // Phantom: add random noise
  if (persona === PERSONAS.phantom) {
    for (const card of available) {
      const noise = 1.0 + (Math.random() - 0.5) * 0.4; // ±20%
      adjustedEV[card] = (adjustedEV[card] ?? 0) * noise;
    }
  }

  // ─── BOLTZMANN SAMPLING ────────────────────────────────────────────────
  const temperature = persona.temperature;
  const distribution: Partial<Record<CardType, number>> = {};

  const evValues = Object.values(adjustedEV).filter(
    (v) => v !== undefined,
  ) as number[];
  let maxEV = evValues.length > 0 ? Math.max(...evValues) : 0;
  let sum = 0;

  for (const card of available) {
    const shifted = (adjustedEV[card] ?? 0) - maxEV; // Now ≤ 0
    const prob = Math.exp(shifted / temperature);
    distribution[card] = prob;
    sum += prob;
  }

  // Normalize probabilities
  for (const card of available) {
    const prob = distribution[card] ?? 0;
    distribution[card] = sum > 0 ? prob / sum : 1 / available.length;
  }

  // Sample according to distribution
  const rand = Math.random();
  let cumulative = 0;
  let chosen: CardType | null = null;
  for (const card of available) {
    cumulative += distribution[card] ?? 0;
    if (rand <= cumulative) {
      chosen = card;
      break;
    }
  }

  if (!chosen) chosen = available[0];

  // If top EV is much larger than the next best, choose it deterministically
  try {
    const evEntries = Object.entries(adjustedEV)
      .map(([c, v]) => ({ card: c as CardType, ev: v ?? 0 }))
      .sort((a, b) => b.ev - a.ev);
    if (evEntries.length >= 2) {
      const top = evEntries[0];
      const second = evEntries[1];
      if (top.ev - second.ev >= 5.0) {
        chosen = top.card;
      }
    }
  } catch (err) {
    // ignore
  }

  // Log the detailed decision and thought process
  try {
    logDecisionDetailed(
      chosen,
      adjustedEV,
      oppDistribution,
      persona,
      _activePersona,
      botState,
      oppState,
      "EV",
      `maxEV=${maxEV.toFixed(2)}`,
    );
  } catch (err) {
    // swallow
  }

  return chosen;
}

/**
 * Enhanced Boltzmann sampling with predictive bonuses and ammo-aware weights.
 * Applies persona bias + adaptive context-aware adjustments + opponent ammo weighting.
 * @deprecated: Kept for fallback compatibility. Primary decision uses selectOptimalCardByEV().
 */
// @ts-expect-error - Function kept for backward compatibility
function sampleWithPersonaV2(
  probs: Record<string, number>,
  available: CardType[],
  persona: PersonaConfig,
  playerHistory: CardType[],
  botState: PlayerState,
  playerState: PlayerState,
): CardType {
  analyzeOpponent(playerHistory, playerState);

  // ─── AMMO CONTEXT ANALYSIS ─────────────────────────────────────────────────
  const opponentAmmo = estimateOpponentAmmo(playerHistory);
  const ammoContext = analyzeAmmoContext(opponentAmmo);
  const opponentIntent = estimateOpponentIntent(
    opponentAmmo,
    playerState.life,
    playerHistory,
  );
  const strategyAvailable = sanitizeCardsForOpponentAmmo(
    available,
    opponentAmmo,
  );

  // Log ammo analysis for debugging
  console.log(
    `%c[Ammo Analysis]%c oppAmmo=${opponentAmmo}, context=${ammoContext}, intent=${opponentIntent}`,
    "color: #3498db; font-weight: bold",
    "color: #2c3e50",
  );

  // Early bluff for unpredictability
  if (Math.random() < persona.bluffChance && strategyAvailable.length > 1) {
    const sorted = [...strategyAvailable].sort(
      (a, b) => (probs[a] ?? 0) - (probs[b] ?? 0),
    );
    const lowerHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    return applyCriticalRules(
      lowerHalf[Math.floor(Math.random() * lowerHalf.length)],
      botState,
      strategyAvailable,
      _matchTurnCount,
    );
  }

  // Pattern counter with confidence
  const pattern = detectAdvancedPattern(playerHistory);
  if (
    pattern &&
    Math.random() < persona.antiPatternStrength * pattern.confidence
  ) {
    const counters = pattern.counter.filter((c) =>
      strategyAvailable.includes(c as CardType),
    );
    if (counters.length > 0) {
      return applyCriticalRules(
        counters[Math.floor(Math.random() * counters.length)] as CardType,
        botState,
        strategyAvailable,
        _matchTurnCount,
      );
    }
  }

  // ─── AMMO-AWARE STRATEGY ENFORCEMENT ────────────────────────────────────────
  // Hard policy: if opponent has 0 ammo, defensive cards are already filtered out.

  // If opponent likely to attack (high ammo): prioritize defense
  if (ammoContext === "prepare_counter" || opponentIntent === "likely_attack") {
    // Prefer dodge/counter when facing likely attack
    for (const card of strategyAvailable) {
      if (card === "counter" || card === "dodge") {
        probs[card] = (probs[card] ?? 0) * 1.5; // Boost defensive moves
      } else if (card === "reload") {
        probs[card] = (probs[card] ?? 0) * 0.5; // Reduce reload risk during attack window
      }
    }
  }

  // Boltzmann temperature + adaptive bias
  const T = persona.temperature;
  const scaled: Record<string, number> = {};
  let sum = 0;

  for (const card of strategyAvailable) {
    const baseProb = Math.max(probs[card] ?? 0.001, 0.001);
    const persBias = persona.cardBias[card] ?? 0;

    // Adaptive bonus based on opponent analysis
    let contextBonus = 0;
    if (
      _opponentAnalysis.consistencyScore > 0.6 &&
      card === _opponentAnalysis.predictedNextMove
    ) {
      contextBonus = 0.15; // Bonus for predicted counter
    }
    if (botState.ammo === 0 && card === "reload") {
      contextBonus = 0.2; // Strong reload when out of ammo
    }
    if (botState.ammo === 3 && card !== "reload") {
      contextBonus = 0.1; // Small bonus for non-reload at max ammo
    }

    // Ammo-safe weighting: avoid dangerous moves
    let ammoWeight = 0;
    if (
      opponentIntent === "likely_attack" &&
      card === "reload" &&
      botState.life <= 2
    ) {
      ammoWeight = -0.25; // Avoid reload when about to be attacked and low health
    }

    const s =
      Math.pow(baseProb, 1 / T) +
      Math.max(0, (persBias + contextBonus + ammoWeight) * 0.5);
    scaled[card] = s;
    sum += s;
  }

  const rand = Math.random() * sum;
  let cumulative = 0;

  for (const card of strategyAvailable) {
    cumulative += scaled[card];
    if (rand <= cumulative) {
      return applyCriticalRules(
        card,
        botState,
        strategyAvailable,
        _matchTurnCount,
      );
    }
  }

  return applyCriticalRules(
    strategyAvailable[strategyAvailable.length - 1],
    botState,
    strategyAvailable,
    _matchTurnCount,
  );
}

/**
 * Enhanced fallback logic with ammo-aware decisions and persona adaptation.
 * Used when trained strategy não está disponível.
 */
function fallbackWithPersonaV2(
  botState: PlayerState,
  playerHistory: CardType[],
  _mode: GameMode,
  available: CardType[],
  persona: PersonaConfig,
  playerState: PlayerState,
): CardType {
  analyzeOpponent(playerHistory, playerState);

  // ─── OPPONENT AMMO ANALYSIS ────────────────────────────────────────────────
  const opponentAmmo = estimateOpponentAmmo(playerHistory);
  const ammoContext = analyzeAmmoContext(opponentAmmo);
  const safeDefense = calculateSafeDefense(
    opponentAmmo,
    playerHistory,
    botState.ammo,
    botState.life,
    available,
  );
  const strategyAvailable = sanitizeCardsForOpponentAmmo(
    available,
    opponentAmmo,
  );

  // ─── CRITICAL RULES ────────────────────────────────────────────────────────

  // RULE 1: Turn 1 always reload
  if (_matchTurnCount === 1) {
    return strategyAvailable.includes("reload")
      ? "reload"
      : strategyAvailable[0];
  }

  // RULE 2: Ammo=3 never reload
  if (botState.ammo === 3) {
    const nonReloadCards = strategyAvailable.filter((c) => c !== "reload");
    if (nonReloadCards.length > 0) {
      // Use strategic decision based on opponent state AND ammo
      return selectStrategyForAmmo3(
        nonReloadCards,
        botState,
        playerHistory,
        opponentAmmo,
      );
    }
  }

  // ─── AMMO=0 EMERGENCY ──────────────────────────────────────────────────────

  if (botState.ammo === 0) {
    const rand = Math.random();
    if (strategyAvailable.includes("reload")) {
      return rand < 0.85 ? "reload" : "dodge";
    }
    return "dodge";
  }

  // ─── OPPONENT AMMO=0 SPECIAL CASE ──────────────────────────────────────────
  // Opponent has 0 ammo: dodge/counter are wasted → focus on attack or reload

  if (ammoContext === "force_attack") {
    // Opponent cannot attack → don't waste defensive moves
    if (
      strategyAvailable.includes("shot") ||
      strategyAvailable.includes("double_shot")
    ) {
      // Prefer attacking
      if (strategyAvailable.includes("double_shot") && botState.ammo >= 2) {
        return "double_shot";
      }
      if (strategyAvailable.includes("shot")) {
        return "shot";
      }
    }
    // If no attack available, reload to prepare
    if (strategyAvailable.includes("reload")) {
      return "reload";
    }
  }

  // ─── PATTERN DETECTION & COUNTER ────────────────────────────────────────────

  const pattern = detectAdvancedPattern(playerHistory);
  if (
    pattern &&
    Math.random() < persona.antiPatternStrength * pattern.confidence
  ) {
    const counters = pattern.counter.filter((c) =>
      strategyAvailable.includes(c as CardType),
    );
    if (counters.length > 0) {
      return counters[0] as CardType;
    }
  }

  // ─── SAFE DEFENSE IF OPPONENT LIKELY TO ATTACK ────────────────────────────
  if (safeDefense && strategyAvailable.includes(safeDefense)) {
    // Only use it if it makes strategic sense
    if (Math.random() < 0.65) {
      return safeDefense as CardType;
    }
  }

  // ─── PERSONA-SPECIFIC LOGIC ────────────────────────────────────────────────

  const rand = Math.random() * 100;
  const lastCard =
    playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  switch (_activePersona) {
    case "aggressor":
      return aggressorStrategy(
        rand,
        strategyAvailable,
        botState,
        lastCard,
        _opponentAnalysis,
        opponentAmmo,
      );

    case "counter_trap":
      return counterTrapStrategy(
        rand,
        strategyAvailable,
        botState,
        lastCard,
        _opponentAnalysis,
        opponentAmmo,
      );

    case "ammo_hoarder":
      return ammoHoarderStrategy(
        rand,
        strategyAvailable,
        botState,
        lastCard,
        _opponentAnalysis,
        opponentAmmo,
      );

    case "punisher":
      return punisherStrategy(
        rand,
        strategyAvailable,
        botState,
        lastCard,
        _opponentAnalysis,
        opponentAmmo,
      );

    case "phantom":
    default:
      return strategyAvailable[
        Math.floor(Math.random() * strategyAvailable.length)
      ];
  }
}

/**
 * When ammo=3: choose between attack and defense intelligently.
 * NOW WITH OPPONENT AMMO AWARENESS!
 *
 * Decisions:
 * - Opponent ammo=0: Attack (opponent can't respond)
 * - Opponent ammo=3: Strong defense or counter-attack
 * - Opponent ammo=1-2: Mixed strategy based on health
 */
function selectStrategyForAmmo3(
  available: CardType[],
  botState: PlayerState,
  playerHistory: CardType[],
  opponentAmmo: number,
): CardType {
  const lastCard = playerHistory[playerHistory.length - 1] ?? null;
  const opponentIntent = estimateOpponentIntent(
    opponentAmmo,
    3, // Placeholder opponent health (would need from playerState)
    playerHistory,
  );

  // ─── IF OPPONENT HAS 0 AMMO: ATTACK AGGRESSIVELY ──────────────────────────
  if (opponentAmmo === 0) {
    // Opponent cannot counter our attack
    if (available.includes("double_shot")) return "double_shot";
    if (available.includes("shot")) return "shot";
  }

  // ─── IF OPPONENT AT MAX AMMO: PREPARE STRONG DEFENSE ─────────────────────
  if (opponentAmmo === 3) {
    // Very likely attack incoming
    if (available.includes("counter")) return "counter"; // Wins vs attacks
    if (available.includes("dodge")) return "dodge";
  }

  // ─── IF OPPONENT LIKELY TO ATTACK (MID AMMO): DEFENSIVE ──────────────────
  if (
    opponentIntent === "likely_attack" &&
    (opponentAmmo === 2 || opponentAmmo === 3)
  ) {
    if (available.includes("counter")) return "counter";
    if (available.includes("dodge")) return "dodge";
  }

  // ─── DEFAULT: HEALTH-BASED STRATEGY ────────────────────────────────────────

  // If we're healthy: be more aggressive
  if (botState.life > 2) {
    if (available.includes("double_shot")) return "double_shot";
    if (available.includes("shot")) return "shot";
  }

  // If we're low on health: play defensively
  if (botState.life <= 1) {
    if (available.includes("counter") && lastCard === "shot") return "counter";
    if (available.includes("dodge")) return "dodge";
  }

  // Default: balanced choice
  const filtered = available.filter((c) => c !== "reload");
  return filtered.length > 0
    ? filtered[Math.floor(Math.random() * filtered.length)]
    : available[0];
}

function aggressorStrategy(
  rand: number,
  available: CardType[],
  _botState: PlayerState,
  _lastCard: CardType | null,
  _oppAnalysis: OpponentAnalysis,
  opponentAmmo: number,
): CardType {
  if (opponentAmmo === 0) {
    if (available.includes("double_shot")) return "double_shot";
    if (available.includes("shot")) return "shot";
    if (available.includes("reload")) return "reload";
  }

  // Weighted toward shots and double shots
  if (rand < 45 && available.includes("double_shot")) return "double_shot";
  if (rand < 70 && available.includes("shot")) return "shot";
  if (rand < 85 && available.includes("dodge")) return "dodge";
  return available.includes("reload") ? "reload" : available[0];
}

function counterTrapStrategy(
  rand: number,
  available: CardType[],
  _botState: PlayerState,
  lastCard: CardType | null,
  _oppAnalysis: OpponentAnalysis,
  opponentAmmo: number,
): CardType {
  if (opponentAmmo === 0) {
    if (available.includes("double_shot")) return "double_shot";
    if (available.includes("shot")) return "shot";
    if (available.includes("reload")) return "reload";
  }

  // Wait for opponent to attack, then counter
  if (lastCard === "shot" || lastCard === "double_shot") {
    if (available.includes("counter") && rand < 70) return "counter";
    if (available.includes("dodge")) return "dodge";
  }

  // Otherwise, stay reactive
  return available.includes("counter") ? "counter" : "dodge";
}

function ammoHoarderStrategy(
  rand: number,
  available: CardType[],
  botState: PlayerState,
  _lastCard: CardType | null,
  _oppAnalysis: OpponentAnalysis,
  opponentAmmo: number,
): CardType {
  if (opponentAmmo === 0) {
    if (botState.ammo >= 2 && available.includes("double_shot"))
      return "double_shot";
    if (available.includes("shot")) return "shot";
    if (available.includes("reload")) return "reload";
  }

  // Only attack when ammo >= 2
  if (botState.ammo >= 2) {
    if (available.includes("double_shot") && rand < 75) return "double_shot";
    if (available.includes("shot") && rand < 90) return "shot";
  }

  // Otherwise reload to build up ammo
  return available.includes("reload") ? "reload" : "dodge";
}

function punisherStrategy(
  rand: number,
  available: CardType[],
  _botState: PlayerState,
  lastCard: CardType | null,
  oppAnalysis: OpponentAnalysis,
  opponentAmmo: number,
): CardType {
  if (opponentAmmo === 0) {
    if (available.includes("double_shot") && rand < 70) return "double_shot";
    if (available.includes("shot")) return "shot";
    if (available.includes("reload")) return "reload";
  }

  // Escalate punishment when opponent is predictable
  if (oppAnalysis.consistencyScore > 0.6 && oppAnalysis.isFollowingPattern) {
    // Be very aggressive against predictable opponents
    if (available.includes("double_shot") && rand < 60) return "double_shot";
    if (available.includes("shot") && rand < 80) return "shot";
  }

  // Standard punisher logic
  if (lastCard === "shot" || lastCard === "double_shot") {
    if (available.includes("counter") && rand < 55) return "counter";
    if (available.includes("dodge")) return "dodge";
  }

  if (lastCard === "dodge" || lastCard === "reload") {
    if (available.includes("double_shot") && rand < 65) return "double_shot";
    if (available.includes("shot")) return "shot";
  }

  return available[Math.floor(Math.random() * available.length)];
}
