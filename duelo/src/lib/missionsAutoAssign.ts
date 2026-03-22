/**
 * Auto-assign missions to players on login.
 * Handles: removing expired, assigning new, preventing duplicates.
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
} from "firebase/firestore";
import { db } from "./firebase";

export async function autoAssignMissionsIfNeeded(uid: string): Promise<void> {
  console.log("[autoAssignMissionsIfNeeded] Starting for user:", uid);
  try {
    const missionsRef = collection(db, "players", uid, "missions");
    const now = Date.now();

    // Step 1: Remove expired missions
    const existingMissionsSnap = await getDocs(missionsRef);
    const batch = writeBatch(db);

    let expiredCount = 0;
    existingMissionsSnap.forEach((docSnap) => {
      const mission = docSnap.data() as any;
      // Support both numeric ms and Firestore Timestamp objects
      const expiresAtMs = mission?.expiresAt
        ? typeof mission.expiresAt === "number"
          ? mission.expiresAt
          : mission.expiresAt?.toMillis
            ? mission.expiresAt.toMillis()
            : undefined
        : undefined;

      if (expiresAtMs && expiresAtMs < now) {
        batch.delete(docSnap.ref);
        expiredCount++;
        console.log(
          "[autoAssignMissionsIfNeeded] Removing expired:",
          docSnap.id,
        );
      }
    });

    if (expiredCount > 0) {
      await batch.commit();
      console.log(
        `[autoAssignMissionsIfNeeded] Deleted ${expiredCount} expired missions`,
      );
    }

    // Step 2: Count current missions by type and get names to avoid duplicates
    const currentMissionsSnap = await getDocs(missionsRef);
    const currentByType: Record<string, any[]> = {
      daily: [],
      weekly: [],
      monthly: [],
    };
    const assignedMissionNames = new Set<string>();

    currentMissionsSnap.forEach((docSnap) => {
      const mission = docSnap.data() as any;
      if (!mission.claimed) {
        const category = mission.category || "daily";
        currentByType[category]?.push(mission);
        // Normalize name field: support legacy templates that may use `title`
        const name = mission.name || mission.title || docSnap.id;
        if (name) assignedMissionNames.add(String(name));
      }
    });

    console.log(
      `[autoAssignMissionsIfNeeded] Current missions - Daily: ${currentByType.daily.length}, Weekly: ${currentByType.weekly.length}, Monthly: ${currentByType.monthly.length}`,
    );

    // Step 3: Assign up to 3 of each type
    const maxPerType = 3;
    const batch2 = writeBatch(db);
    let assignedCount = 0;

    for (const category of ["daily", "weekly", "monthly"] as const) {
      const currentCount = currentByType[category].length;

      if (currentCount >= maxPerType) {
        console.log(
          `[autoAssignMissionsIfNeeded] ${category} already has ${currentCount} missions (max ${maxPerType})`,
        );
        continue;
      }

      const needed = maxPerType - currentCount;
      const templatesSnap = await getDocs(
        query(collection(db, "missions", category, "templates")),
      );

      // Filter templates: only those not yet assigned to this player
      const availableTemplates = templatesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => {
          const tName = (t as any).name || (t as any).title || (t as any).id;
          return !assignedMissionNames.has(String(tName));
        })
        .sort(() => Math.random() - 0.5)
        .slice(0, needed);

      console.log(
        `[autoAssignMissionsIfNeeded] Found ${availableTemplates.length} available ${category} templates`,
      );
      console.log(
        `[autoAssignMissionsIfNeeded] availableTemplates ids:`,
        availableTemplates.map((t) => ({
          id: (t as any).id,
          name: (t as any).name || (t as any).title,
        })),
      );

      for (const template of availableTemplates) {
        try {
          const tAny = template as any;
          const missionId = doc(missionsRef).id;
          const expiryDays =
            category === "daily" ? 2 : category === "weekly" ? 7 : 30;
          const expiresAt = now + expiryDays * 24 * 60 * 60 * 1000;

          const docRef = doc(missionsRef, missionId);
          batch2.set(docRef, {
            ...tAny,
            uid,
            category,
            progress: 0,
            completed: false,
            claimed: false,
            assignedAt: now,
            expiresAt,
            completedAt: null,
            claimedAt: null,
          });

          // Normalize name used for deduplication
          const tName = tAny.name || tAny.title || tAny.id || missionId;
          assignedMissionNames.add(String(tName));
          assignedCount++;
          console.log(
            `[autoAssignMissionsIfNeeded] Queued assignment -> id: ${missionId}, templateId: ${tAny.id}, name: ${tName}, docPath: ${docRef.path}`,
          );
        } catch (e) {
          console.error(
            "[autoAssignMissionsIfNeeded] Error queuing template",
            template,
            e,
          );
        }
      }
    }

    if (assignedCount > 0) {
      await batch2.commit();
      console.log(
        `[autoAssignMissionsIfNeeded] Assigned ${assignedCount} total missions`,
      );
    }

    console.log("[autoAssignMissionsIfNeeded] Complete!");
  } catch (error) {
    console.error("[autoAssignMissionsIfNeeded] Error:", error);
    // Don't throw - we don't want to block login if auto-assign fails
  }
}
