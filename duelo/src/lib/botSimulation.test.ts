import { describe, it } from "vitest";
import {
  decideForPersona,
  predictOpponentDistributionMulti,
  getEVScores,
} from "./botAI";
import { resolveCards, getAvailableCards } from "./gameEngine";
import fs from "fs";
import path from "path";
import type { PlayerState, CardType, GameMode } from "../types";

function makePlayer(name: string): PlayerState {
  return {
    id: name,
    displayName: name,
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
    doubleShotsLeft: 2,
    characterClass: "atirador",
    classMasteryLevel: 1,
    shieldUsesLeft: 2,
  };
}

// Simple heuristics to flag questionable moves
function analyzeTurn(
  actor: string,
  chosen: CardType,
  oppState: PlayerState,
  lastOppCard: CardType | null,
) {
  const notes: string[] = [];
  if (chosen === "reload" && oppState.ammo >= 2) {
    notes.push("Risky reload vs opponent high ammo");
  }
  if ((chosen === "shot" || chosen === "double_shot") && oppState.ammo === 0) {
    notes.push("Good attack vs dry opponent");
  }
  if (
    chosen === "counter" &&
    lastOppCard &&
    !(lastOppCard === "shot" || lastOppCard === "double_shot")
  ) {
    notes.push("Counter may be wasted if opponent didn't just attack");
  }
  if (chosen === "dodge" && oppState.ammo === 0) {
    notes.push("Dodge wasted vs dry opponent");
  }
  return notes;
}

describe("Bot vs Bot simulation — 10 turns", () => {
  it("runs a full simulated match and prints analysis", () => {
    const mode: GameMode = "advanced";
    const A = makePlayer("BotA");
    const B = makePlayer("BotB");

    // Choose personas for this simulation
    const personaA = "aggressor" as any;
    const personaB = "punisher" as any;

    const historyA: CardType[] = [];
    const historyB: CardType[] = [];

    let lastCardA: CardType | null = null;
    let lastCardB: CardType | null = null;

    console.log(
      "=== Simulation start: BotA (aggressor) vs BotB (punisher) ===",
    );

    const turns: any[] = [];
    let turn = 1;
    const maxTurns = 200;
    while (A.life > 0 && B.life > 0 && turn <= maxTurns) {
      // Both bots decide (without advancing global match turn)
      const cardA = decideForPersona(personaA, A, historyA, mode, B);
      const cardB = decideForPersona(personaB, B, historyB, mode, A);

      // Opponent distributions used for each decision
      const distA = predictOpponentDistributionMulti(
        historyA,
        B.ammo,
        B.life,
        A.life,
      );
      const distB = predictOpponentDistributionMulti(
        historyB,
        A.ammo,
        A.life,
        B.life,
      );

      // Compute EV scores for available sets
      const availableA = getAvailableCards(
        mode,
        A.ammo,
        A.doubleShotsLeft ?? 2,
        A.dodgeStreak ?? 0,
      );
      const availableB = getAvailableCards(
        mode,
        B.ammo,
        B.doubleShotsLeft ?? 2,
        B.dodgeStreak ?? 0,
      );
      const evA = getEVScores(A, historyB, B, availableA);
      const evB = getEVScores(B, historyA, A, availableB);

      console.log(`\n--- Turn ${turn} ---`);
      console.log(`BotA chooses ${cardA} | oppDist:`, distA);
      console.log(`BotB chooses ${cardB} | oppDist:`, distB);

      // Simple analysis heuristics
      const notesA = analyzeTurn("BotA", cardA, B, lastCardB);
      const notesB = analyzeTurn("BotB", cardB, A, lastCardA);
      if (notesA.length) console.log("BotA notes:", notesA.join("; "));
      if (notesB.length) console.log("BotB notes:", notesB.join("; "));

      // Resolve outcome
      const result = resolveCards(
        cardA,
        cardB,
        A.ammo,
        B.ammo,
        mode,
        turn,
        A.characterClass,
        B.characterClass,
        A.classMasteryLevel ?? 1,
        B.classMasteryLevel ?? 1,
        A.shieldUsesLeft,
        B.shieldUsesLeft,
      );

      console.log(
        "Result:",
        result.narrative,
        result.playerLifeLost,
        "vs",
        result.opponentLifeLost,
      );

      // Capture pre/post states for the report
      const botA_beforeLife = A.life;
      const botB_beforeLife = B.life;
      const botA_beforeAmmo = A.ammo;
      const botB_beforeAmmo = B.ammo;

      // Update states
      A.life = Math.max(0, A.life - result.playerLifeLost);
      B.life = Math.max(0, B.life - result.opponentLifeLost);
      A.ammo = Math.min(3, Math.max(0, A.ammo + result.playerAmmoChange));
      B.ammo = Math.min(3, Math.max(0, B.ammo + result.opponentAmmoChange));

      // Push histories and last cards
      historyA.push(cardA);
      historyB.push(cardB);
      lastCardA = cardA;
      lastCardB = cardB;

      // Save turn summary
      turns.push({
        turn,
        botA: {
          chosen: cardA,
          lifeBefore: botA_beforeLife,
          lifeAfter: A.life,
          ammoBefore: botA_beforeAmmo,
          ammoAfter: A.ammo,
          oppDistribution: distA,
          evScores: evA.evScores,
          notes: notesA,
        },
        botB: {
          chosen: cardB,
          lifeBefore: botB_beforeLife,
          lifeAfter: B.life,
          ammoBefore: botB_beforeAmmo,
          ammoAfter: B.ammo,
          oppDistribution: distB,
          evScores: evB.evScores,
          notes: notesB,
        },
        result,
      });

      // End iteration
      turn++;
    }

    console.log("=== Simulation end ===");
    console.log(
      `Final: BotA life=${A.life} ammo=${A.ammo} | BotB life=${B.ammo} ammo=${B.ammo}`,
    );

    // Write JSON report
    try {
      const outDir = path.join(process.cwd(), "duelo", "test-reports");
      fs.mkdirSync(outDir, { recursive: true });
      const report = {
        meta: { personaA, personaB, mode, turns: turns.length },
        final: {
          botA: { life: A.life, ammo: A.ammo },
          botB: { life: B.life, ammo: B.ammo },
        },
        turns,
      };
      const fileName = `match_report_${Date.now()}.json`;
      const outPath = path.join(outDir, fileName);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
      console.log("Report written to:", outPath);
    } catch (err) {
      console.error("Failed to write report:", err);
    }
  });
});
