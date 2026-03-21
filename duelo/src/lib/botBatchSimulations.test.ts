import { describe, it } from "vitest";
import {
  decideForPersona,
  predictOpponentDistributionMulti,
  getEVScores,
} from "./botAI";
import { resolveCards, getAvailableCards } from "./gameEngine";
import type { PlayerState, CardType, GameMode } from "../types";
import fs from "fs";
import path from "path";

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

function analyzeTurnNote(
  chosen: CardType,
  oppAmmo: number,
  lastOppCard: CardType | null,
) {
  const bad: string[] = [];
  if ((chosen === "dodge" || chosen === "counter") && oppAmmo === 0)
    bad.push("wasted_defense_vs_dry");
  if (chosen === "reload" && oppAmmo >= 2)
    bad.push("risky_reload_vs_high_ammo");
  if (
    chosen === "counter" &&
    !(lastOppCard === "shot" || lastOppCard === "double_shot")
  )
    bad.push("counter_maybe_wasted");
  return bad;
}

describe("Batch simulations: 100 matches aggregate", () => {
  it(
    "runs 100 simulated matches and aggregates metrics",
    () => {
      const runs = 100;
      const mode: GameMode = "advanced";
      const personaPairs: Array<[string, string]> = [
        ["aggressor", "punisher"],
        ["aggressor", "counter_trap"],
        ["ammo_hoarder", "punisher"],
      ];

      const agg: any = {};

      for (const [pA, pB] of personaPairs) {
        agg[`${pA}_vs_${pB}`] = {
          runs: 0,
          winsA: 0,
          winsB: 0,
          avgTurns: 0,
          badMoves: { A: 0, B: 0 },
        };
        for (let r = 0; r < runs; r++) {
          const A = makePlayer("A");
          const B = makePlayer("B");
          const historyA: CardType[] = [];
          const historyB: CardType[] = [];
          let lastA: CardType | null = null;
          let lastB: CardType | null = null;
          let turn = 1;
          const maxTurns = 200;
          while (A.life > 0 && B.life > 0 && turn <= maxTurns) {
            const cA = decideForPersona(pA as any, A, historyA, mode, B);
            const cB = decideForPersona(pB as any, B, historyB, mode, A);

            const evA = getEVScores(
              A,
              historyB,
              B,
              getAvailableCards(
                mode,
                A.ammo,
                A.doubleShotsLeft ?? 2,
                A.dodgeStreak ?? 0,
              ),
            );
            const evB = getEVScores(
              B,
              historyA,
              A,
              getAvailableCards(
                mode,
                B.ammo,
                B.doubleShotsLeft ?? 2,
                B.dodgeStreak ?? 0,
              ),
            );

            const badA = analyzeTurnNote(cA, B.ammo, lastB);
            const badB = analyzeTurnNote(cB, A.ammo, lastA);
            agg[`${pA}_vs_${pB}`].badMoves.A += badA.length;
            agg[`${pA}_vs_${pB}`].badMoves.B += badB.length;

            const res = resolveCards(
              cA,
              cB,
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

            A.life = Math.max(0, A.life - res.playerLifeLost);
            B.life = Math.max(0, B.life - res.opponentLifeLost);
            A.ammo = Math.min(3, Math.max(0, A.ammo + res.playerAmmoChange));
            B.ammo = Math.min(3, Math.max(0, B.ammo + res.opponentAmmoChange));

            historyA.push(cA);
            historyB.push(cB);
            lastA = cA;
            lastB = cB;
            turn++;
          }

          agg[`${pA}_vs_${pB}`].runs++;
          agg[`${pA}_vs_${pB}`].avgTurns += turn;
          if (A.life > 0 && B.life <= 0) agg[`${pA}_vs_${pB}`].winsA++;
          else if (B.life > 0 && A.life <= 0) agg[`${pA}_vs_${pB}`].winsB++;
        }
        agg[`${pA}_vs_${pB}`].avgTurns = agg[`${pA}_vs_${pB}`].avgTurns / runs;
      }

      // Write aggregate report
      try {
        const outDir = path.join(process.cwd(), "duelo", "test-reports");
        fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, `batch_report_${Date.now()}.json`);
        fs.writeFileSync(
          outPath,
          JSON.stringify({ meta: { runs, mode }, agg }, null, 2),
          "utf-8",
        );
        console.log("Batch report written to:", outPath);
      } catch (err) {
        console.error("Failed to write batch report:", err);
      }
    },
    { timeout: 120000 },
  );
});
