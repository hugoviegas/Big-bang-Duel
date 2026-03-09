/**
 * Bot AI — Strategy System v5.0
 *
 * Inspired by how strong game AIs prevent predictability:
 *
 *  Chess engines (Stockfish, Leela):
 *    - Randomize opening book choices so same position ≠ same reply.
 *    - Apply "contempt" factor to avoid repetitive play vs weaker players.
 *
 *  MCTS-based agents (AlphaGo/AlphaZero):
 *    - Temperature τ controls determinism: τ→0 = best move always;
 *      τ→∞ = uniform random; mid values blend both.
 *
 *  Our approach:
 *    - Q-table from trainer_v3.py is the foundation (2M-episode training).
 *    - At match start a random "persona" is selected. Each one adjusts:
 *        • Temperature:          determinism of Q-table sampling
 *        • Card biases:          additive shifts toward card families
 *        • Anti-pattern strength: how aggressively it counters patterns
 *        • Bluff chance:         probability of deliberate surprise moves
 *    - This ensures each match feels tactically different even against the
 *      same player because the bot's weighting and thresholds all shift.
 */

import type { PlayerState, CardType, GameMode } from "../types";
import { getAvailableCards, MAX_DOUBLE_SHOT_USES } from "./gameEngine";
import { getSmartBotCard, hasStrategy } from "./strategyLoader";

// Nomes dos buckets para debug legível no console
// ─── Persona Definitions ──────────────────────────────────────────────────────

/**
 * Each persona represents a different play philosophy.
 * Randomly selected at the start of each solo match so the bot behaves
 * differently every game — even if the player uses the exact same strategy.
 */
type BotPersona =
  | "aggressor" // Pressiona sem parar; prefere tiros e tiro duplo
  | "counter_trap" // Espera o adversário atacar para responder com contra-golpe
  | "ammo_hoarder" // Acumula munição e ataca pesado no momento certo
  | "punisher" // Detecta e pune padrões repetitivos com precisão máxima
  | "phantom"; // Alta entropia — difícil de ler, mistura estilos livremente

interface PersonaConfig {
  /** Boltzmann temperature for Q-table sampling.
   *  Low (≈0.5): near-deterministic — plays the statistically best move.
   *  High (≈2.0): more uniform — hard to predict, sometimes suboptimal. */
  temperature: number;
  /** Chance per turn of a deliberate "bluff" (intentional surprise move). */
  bluffChance: number;
  /** Additive probability bias toward specific card families.
   *  Applied after temperature scaling, before normalization. */
  cardBias: Partial<Record<CardType, number>>;
  /** 0–1: how heavily the bot counters detected player patterns. */
  antiPatternStrength: number;
}

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

// ─── Match-level state ────────────────────────────────────────────────────────

let _activePersona: BotPersona = "punisher";

const BUCKET_NAMES: Record<number, string> = {
  0: "defensive-low",
  1: "defensive-mid",
  2: "defensive-high",
  3: "defensive-max",
  4: "mixed-low",
  5: "mixed-mid",
  6: "mixed-high",
  7: "mixed-max",
  8: "aggressive-low",
  9: "aggressive-mid",
  10: "aggressive-high",
  11: "aggressive-max",
  12: "ultra-low",
  13: "ultra-mid",
  14: "ultra-high",
  15: "ultra-max",
};
// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialises the bot's persona for a new match.
 * Call this once from `initializeGame()` to ensure each game feels different.
 *
 * Mode biases the persona distribution without forcing a single archetype:
 *   - beginner: phantom less likely, aggressor a bit less
 *   - normal:   balanced distribution
 *   - advanced: aggressor / counter_trap weighted up
 */
export function initBotPersona(mode: GameMode): BotPersona {
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
 * Chooses the bot's next card using the active persona + Q-table.
 * No difficulty parameter — difficulty is now expressed through `mode`
 * and through the randomised persona selected at match start.
 */
export function botChooseCard(
  botState: PlayerState,
  playerHistory: CardType[],
  mode: GameMode,
  playerState: PlayerState,
): CardType {
  const available = getAvailableCards(
    mode,
    botState.ammo,
    botState.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
    botState.dodgeStreak ?? 0,
  );
  if (available.length === 1) return available[0];

  const persona = PERSONAS[_activePersona];

  if (hasStrategy(mode)) {
    const result = getSmartBotCard(
      mode,
      botState.life,
      botState.ammo,
      playerState.life,
      botState.dodgeStreak ?? 0,
      botState.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
      playerHistory,
      available,
    );
    if (result) {
      const card = sampleWithPersona(
        result.probs,
        available,
        persona,
        playerHistory,
        botState,
      );
      console.log(
        `%c[AI ${_activePersona.toUpperCase()}]%c ${card.toUpperCase()}`,
        "color: #ff6b35; font-weight: bold",
        "color: #2ecc71; font-weight: bold",
        {
          bucket: result.bucket,
          bucketName: BUCKET_NAMES[result.bucket] ?? "unknown",
          pattern: playerHistory.slice(-5),
          botAmmo: botState.ammo,
          botLife: botState.life,
          oppLife: playerState.life,
          temperature: persona.temperature,
        },
      );
      return card;
    }
  }

  // No trained strategy for this mode — use persona-aware fallback
  console.log(
    `%c[AI Fallback]%c ${_activePersona} | mode=${mode}`,
    "color: #e67e22; font-weight: bold",
    "color: #95a5a6",
    { available },
  );
  return fallbackWithPersona(botState, playerHistory, mode, available, persona);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Applies Boltzmann temperature + persona biases to the Q-table probability
 * distribution, with optional bluff or anti-pattern overrides.
 */
function sampleWithPersona(
  probs: Record<string, number>,
  available: CardType[],
  persona: PersonaConfig,
  playerHistory: CardType[],
  botState: PlayerState,
): CardType {
  // Bluff: intentional "bad" move to break predictability
  if (Math.random() < persona.bluffChance && available.length > 1) {
    const sorted = [...available].sort(
      (a, b) => (probs[a] ?? 0) - (probs[b] ?? 0),
    );
    const lowerHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    return lowerHalf[Math.floor(Math.random() * lowerHalf.length)];
  }

  // Anti-pattern counter: if the bot detects a repetitive pattern and this
  // persona is configured to exploit it, hard-bias toward the counter cards
  const pattern = detectPattern(playerHistory);
  if (pattern && Math.random() < persona.antiPatternStrength) {
    const counters = pattern.counter.filter((c) =>
      available.includes(c as CardType),
    );
    if (counters.length > 0)
      return counters[Math.floor(Math.random() * counters.length)] as CardType;
  }

  // Ammo guard: aggressive personas will reload if they run out
  if (botState.ammo === 0 && available.includes("reload")) {
    if (_activePersona === "aggressor" || _activePersona === "ammo_hoarder") {
      if (Math.random() < 0.75) return "reload";
    }
  }

  // Boltzmann temperature + bias weighted sampling
  const T = persona.temperature;
  const scaled: Record<string, number> = {};
  let sum = 0;
  for (const card of available) {
    const baseProb = Math.max(probs[card] ?? 0.001, 0.001);
    const bias = persona.cardBias[card] ?? 0;
    // p' = p^(1/T) + max(0, bias*0.5)  — higher T flattens distribution
    const s = Math.pow(baseProb, 1 / T) + Math.max(0, bias * 0.5);
    scaled[card] = s;
    sum += s;
  }

  const rand = Math.random() * sum;
  let cumulative = 0;
  for (const card of available) {
    cumulative += scaled[card];
    if (rand <= cumulative) return card;
  }
  return available[available.length - 1];
}

/**
 * Detects short-term repetitive patterns in the player's last 5 moves.
 * Returns the dominant pattern label and a set of cards that counter it.
 */
function detectPattern(
  history: CardType[],
): { pattern: string; counter: string[] } | null {
  if (history.length < 2) return null;
  const last5 = history.slice(-5);
  const last3 = history.slice(-3);

  if (last3.length === 3 && last3.every((c) => c === "reload"))
    return { pattern: "reload_spam", counter: ["double_shot", "shot"] };
  if (last3.length === 3 && last3.every((c) => c === "dodge"))
    return { pattern: "dodge_spam", counter: ["shot", "double_shot"] };

  const attackCount = last5.filter(
    (c) => c === "shot" || c === "double_shot",
  ).length;
  if (attackCount >= 3)
    return { pattern: "shot_heavy", counter: ["dodge", "counter"] };

  const counterCount = last5.filter((c) => c === "counter").length;
  if (counterCount >= 2)
    return { pattern: "counter_farm", counter: ["reload", "dodge"] };

  if (last3.length === 3) {
    const [a, , c] = last3;
    if (a === "reload" && c === "reload")
      return { pattern: "reload_shot_alt", counter: ["double_shot", "shot"] };
    if (a === "shot" && c === "shot")
      return { pattern: "shot_reload_alt", counter: ["counter", "dodge"] };
  }

  return null;
}

/**
 * Persona-aware heuristic fallback used when no trained strategy is loaded.
 * Each persona has distinct decision logic so the "feel" varies even in
 * fallback mode.
 */
function fallbackWithPersona(
  botState: PlayerState,
  playerHistory: CardType[],
  _mode: GameMode,
  available: CardType[],
  persona: PersonaConfig,
): CardType {
  // Respect anti-pattern detection even in fallback
  const pattern = detectPattern(playerHistory);
  if (pattern && Math.random() < persona.antiPatternStrength) {
    const counters = pattern.counter.filter((c) =>
      available.includes(c as CardType),
    );
    if (counters.length > 0) return counters[0] as CardType;
  }

  const rand = Math.random() * 100;
  const lastCard =
    playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  if (botState.ammo === 0) {
    return available.includes("dodge") && rand < 40 ? "dodge" : "reload";
  }

  switch (_activePersona) {
    case "aggressor":
      if (rand < 40 && available.includes("double_shot")) return "double_shot";
      if (rand < 65 && available.includes("shot")) return "shot";
      return available.includes("dodge") ? "dodge" : "reload";

    case "counter_trap":
      if (lastCard === "shot" || lastCard === "double_shot") {
        if (available.includes("counter") && rand < 65) return "counter";
        if (available.includes("dodge")) return "dodge";
      }
      return botState.ammo < 2
        ? "reload"
        : available.includes("counter")
          ? "counter"
          : "dodge";

    case "ammo_hoarder":
      if (botState.ammo >= 2) {
        if (available.includes("double_shot") && rand < 70)
          return "double_shot";
        if (available.includes("shot") && rand < 85) return "shot";
      }
      return "reload";

    case "punisher":
      if (lastCard === "shot" || lastCard === "double_shot") {
        if (available.includes("counter") && rand < 55) return "counter";
        if (available.includes("dodge")) return "dodge";
      }
      if (lastCard === "dodge" || lastCard === "reload") {
        if (available.includes("double_shot") && rand < 65)
          return "double_shot";
        if (available.includes("shot")) return "shot";
      }
      return available[Math.floor(Math.random() * available.length)];

    case "phantom":
    default:
      return available[Math.floor(Math.random() * available.length)];
  }
}
