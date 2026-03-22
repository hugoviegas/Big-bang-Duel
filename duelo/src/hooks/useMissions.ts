import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { syncMissionsToPlayerProfile } from "../lib/missions";

export interface PlayerMission {
  docId: string;
  id?: string;
  name: string;
  description:
    | string
    | {
        achievement: string;
        how: string;
        rewards: string;
      };
  category: "daily" | "weekly" | "monthly";
  difficulty: "easy" | "medium" | "hard" | "hard_prolonged";
  objective: {
    type: string;
    target: number;
    metric: string;
  };
  reward: {
    gold: number;
    ruby?: number;
  };
  progress: number;
  completed: boolean;
  claimed: boolean;
  assignedAt?: number;
  expiresAt?: number;
  completedAt?: number;
  claimedAt?: number;
}

export function useMissions(uid?: string) {
  const [missions, setMissions] = useState<PlayerMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setMissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "players", uid, "missions"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          docId: d.id,
          ...(d.data() as Omit<PlayerMission, "docId">),
        }));
        setMissions(rows);
        setLoading(false);
        setError(null);

        // Keep profile.activeMissions synchronized for fast mission evaluation on match end.
        syncMissionsToPlayerProfile(uid, rows);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [uid]);

  const grouped = useMemo(
    () => ({
      daily: missions.filter((m) => m.category === "daily"),
      weekly: missions.filter((m) => m.category === "weekly"),
      monthly: missions.filter((m) => m.category === "monthly"),
    }),
    [missions],
  );

  const claimableCount = useMemo(
    () => missions.filter((m) => m.completed && !m.claimed).length,
    [missions],
  );

  return {
    missions,
    grouped,
    loading,
    error,
    claimableCount,
  };
}
