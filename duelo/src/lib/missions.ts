import {
  arrayUnion,
  doc,
  getDoc,
  increment,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MissionInstance, MatchSummary, PlayerProfile } from "../types";

export interface EvaluationResult {
  completedMissions: MissionInstance[];
  progressedMissions: MissionInstance[];
  updatedMissions: Record<string, MissionInstance>;
}

/**
 * Checks a specific mission's requirement against the updated match summary.
 */
function checkMissionObjective(
  mission: MissionInstance,
  summary: MatchSummary,
): number {
  const { metric } = mission.objective;

  const readSummaryNumber = (keys: string[]): number => {
    for (const key of keys) {
      const value = (summary as unknown as Record<string, unknown>)[key];
      if (typeof value === "number") return value;
    }
    return 0;
  };

  // Debug: log what we're looking for
  const debugLog = (found: number) => {
    console.log(
      `[checkMissionObjective] Mission "${mission.name}" | Metric: ${metric} | Found: ${found} | Target: ${mission.objective.target}`,
    );
    return found;
  };

  // Basic metrics mapping from Mission metric string to MatchSummary field
  switch (metric) {
    case "shotsAccuracy":
      return debugLog(
        readSummaryNumber(["successfulShots", "shotsAccuracy", "shots"]),
      );
    case "doubleShotsAccuracy":
      return debugLog(
        readSummaryNumber([
          "successfulDoubleShots",
          "doubleShotsAccuracy",
          "doubleShots",
        ]),
      );
    case "dodgesSuccessful":
      return debugLog(
        readSummaryNumber(["successfulDodges", "dodgesSuccessful", "dodges"]),
      );
    case "countersSuccessful":
      return debugLog(
        readSummaryNumber([
          "successfulCounters",
          "countersSuccessful",
          "counters",
        ]),
      );
    case "reloadCount":
      return debugLog(readSummaryNumber(["reloads", "reloadCount"]));
    // Support composite metrics like "result:win"
    case "result:win":
      return debugLog(summary.result === "win" ? 1 : 0);
    case "result:loss":
      return debugLog(summary.result === "loss" ? 1 : 0);
  }

  // Also fallback to exact keys
  if (metric in summary) {
    const val = (summary as any)[metric];
    if (typeof val === "number") return debugLog(val);
  }

  return debugLog(0);
}

/**
 * Evaluates active missions against a recently finished match summary.
 * Returns what missions progressed or completed.
 * Note: this function purely calculates the new state and does NOT commit to Firestore.
 */
export function evaluateMissionsProgress(
  profile: PlayerProfile,
  summary: MatchSummary,
): EvaluationResult {
  const activeMissions = profile.activeMissions ?? {};
  const updatedMissions: Record<string, MissionInstance> = {
    ...activeMissions,
  };

  const completedMissions: MissionInstance[] = [];
  const progressedMissions: MissionInstance[] = [];

  const now = Date.now();

  console.log(
    `[evaluateMissionsProgress] Evaluating ${Object.keys(activeMissions).length} missions`,
  );

  for (const [id, mission] of Object.entries(activeMissions)) {
    // 1. Check expiration
    if (mission.expiresAt < now) {
      console.log(`[evaluateMissionsProgress] Mission ${id} expired`);
      // Mark as completed=false but expired (we will handle expiration removal in another fn)
      continue;
    }

    // 2. Ignore already completed or claimed
    if (mission.completed || mission.claimed) {
      continue;
    }

    // 3. Process new progress
    const progressInc = checkMissionObjective(mission, summary);
    if (progressInc <= 0) {
      console.log(`[evaluateMissionsProgress] Mission ${id} no progress`);
      continue;
    }

    const newProgress = Math.min(
      mission.progress + progressInc,
      mission.objective.target,
    );

    const isNowComplete = newProgress >= mission.objective.target;
    const updated: MissionInstance = {
      ...mission,
      progress: newProgress,
      completed: isNowComplete,
      // Only set completedAt when newly completed, preserve existing value otherwise
      completedAt: isNowComplete ? now : mission.completedAt || undefined,
    } as MissionInstance;

    updatedMissions[id] = updated;

    console.log(
      `[evaluateMissionsProgress] Mission ${id} updated - Progress: ${newProgress}/${mission.objective.target}, Completed: ${isNowComplete}`,
    );

    if (updated.completed) {
      completedMissions.push(updated);
    } else {
      progressedMissions.push(updated);
    }
  }

  console.log(
    `[evaluateMissionsProgress] Results - Completed: ${completedMissions.length}, Progressed: ${progressedMissions.length}`,
  );
  return { completedMissions, progressedMissions, updatedMissions };
}

/**
 * Claims the reward for a specific completed mission.
 */
export async function claimMissionReward(
  uid: string,
  missionId: string,
): Promise<void> {
  const playerRef = doc(db, "players", uid);
  const snap = await getDoc(playerRef);
  if (!snap.exists()) throw new Error("Player not found");

  const profile = snap.data() as PlayerProfile;
  const mission = profile.activeMissions?.[missionId];

  if (!mission) throw new Error("Mission not found");
  if (!mission.completed) throw new Error("Mission is not completed");
  if (mission.claimed) throw new Error("Mission already claimed");

  const currencies = profile.currencies ?? { gold: 0, ruby: 0 };
  const newGold = currencies.gold + mission.reward.gold;
  const newRuby = currencies.ruby + (mission.reward.ruby ?? 0);

  const missionStats = profile.missionStats ?? {
    dailyCompleted: 0,
    weeklyCompleted: 0,
    monthlyCompleted: 0,
  };
  const statKey = `${mission.category}Completed` as keyof typeof missionStats;
  const newMissionStats = {
    ...missionStats,
    [statKey]: (missionStats[statKey] || 0) + 1,
  };

  const claimedMissions = [...(profile.claimedMissions ?? []), missionId];

  // Atomic update
  const payload = {
    "currencies.gold": newGold,
    "currencies.ruby": newRuby,
    [`activeMissions.${missionId}.claimed`]: true,
    [`activeMissions.${missionId}.claimedAt`]: Date.now(),
    missionStats: newMissionStats,
    claimedMissions,
  };

  await updateDoc(playerRef, payload);
}

/**
 * Sync missions from the separate `missions` subcollection to `activeMissions` in the player profile.
 * This ensures the evaluation logic (which uses profile) stays fast but uses the new collection structure.
 */
export function syncMissionsToPlayerProfile(
  uid: string,
  missions: Array<Record<string, unknown>>,
): void {
  const playerRef = doc(db, "players", uid);
  const activeMissions = missions.reduce(
    (acc, m) => {
      const missionId = String(m.docId ?? m.id ?? "");
      if (!missionId) return acc;
      acc[missionId] = {
        ...(m as Record<string, unknown>),
        id: missionId,
      };
      return acc;
    },
    {} as Record<string, any>,
  );

  updateDoc(playerRef, { activeMissions }).catch((err) =>
    console.error("Failed to sync missions to profile:", err),
  );
}

/**
 * Claims reward from players/{uid}/missions/{missionDocId} and mirrors state in players/{uid}.activeMissions.
 */
export async function claimMissionRewardFromSubcollection(
  uid: string,
  missionDocId: string,
): Promise<void> {
  const playerRef = doc(db, "players", uid);
  const missionRef = doc(db, "players", uid, "missions", missionDocId);

  console.log(
    `[claimMissionRewardFromSubcollection] Starting claim for mission: ${missionDocId}`,
  );

  await runTransaction(db, async (tx) => {
    const [playerSnap, missionSnap] = await Promise.all([
      tx.get(playerRef),
      tx.get(missionRef),
    ]);

    if (!playerSnap.exists()) throw new Error("Player not found");
    if (!missionSnap.exists()) throw new Error("Mission not found");

    const mission = missionSnap.data() as MissionInstance;
    console.log(`[claimMissionRewardFromSubcollection] Mission data:`, mission);

    if (!mission.completed) {
      throw new Error("Mission is not completed");
    }
    if (mission.claimed) {
      throw new Error("Mission already claimed");
    }

    const statKey = `${mission.category}Completed`;
    const now = Date.now();

    console.log(
      `[claimMissionRewardFromSubcollection] Claiming reward - Gold: +${mission.reward.gold}, Ruby: +${mission.reward.ruby}`,
    );

    tx.update(missionRef, {
      claimed: true,
      claimedAt: now,
    });

    tx.update(playerRef, {
      "currencies.gold": increment(mission.reward.gold || 0),
      "currencies.ruby": increment(mission.reward.ruby || 0),
      [`activeMissions.${missionDocId}.claimed`]: true,
      [`activeMissions.${missionDocId}.claimedAt`]: now,
      [`missionStats.${statKey}`]: increment(1),
      claimedMissions: arrayUnion(missionDocId),
    });

    console.log(
      `[claimMissionRewardFromSubcollection] Claim completed successfully`,
    );
  });
}
