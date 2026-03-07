/**
 * Migration script: Add default avatarPicture to all existing players.
 *
 * For each player document in the `players` collection:
 * - If `avatarPicture` is already set, skip.
 * - Otherwise, resolve the profile image from the character registry
 *   based on their current `avatar` (character ID) field.
 *
 * Usage:
 *   1. Place your Firebase service account key JSON at:
 *      ./scripts/serviceAccountKey.json
 *      (Download from Firebase Console > Project Settings > Service Accounts)
 *   2. Run: node scripts/migrate-avatar-picture.js
 *
 * This script is idempotent — safe to run multiple times.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Character → Profile Image Mapping ───────────────────────────────────────
// Mirrors the profileImage field from src/lib/characters.ts
const PROFILE_IMAGE_MAP = {
  marshal: "/assets/characters_profile/the_marshal_profile.webp",
  skull: "/assets/characters_profile/the_skull_profile.webp",
  la_dama: "/assets/characters/la_dama.webp", // No dedicated profile image
  alucard: "/assets/characters_profile/alucard_profile.webp",
  detective_hopps: "/assets/characters_profile/detective_hopps_profile.webp",
  mokey_king: "/assets/characters_profile/mokey_king_profile.webp",
  pe_de_pano: "/assets/characters_profile/pe_de_pano_profile.webp",
  serpent_queen: "/assets/characters_profile/serpent_queen_profile.webp",
  spider_noir: "/assets/characters_profile/spider_noir_profile.webp",
  stormtrooper: "/assets/characters_profile/stormtrooper_profile.webp",
  the_cowboy: "/assets/characters_profile/the_cowboy_profile.webp",
  the_jedi: "/assets/characters_profile/the_jedi_profile.webp",
  the_mandalorian: "/assets/characters_profile/the_mandalorian_profile.webp",
  the_outlaw: "/assets/characters_profile/the_outlaw_profile.webp",
  the_rango: "/assets/characters_profile/the_rango_profile.webp",
  the_scrapper: "/assets/characters_profile/the_scrapper_profile.webp",
  the_sheriff: "/assets/characters_profile/the_sheriff_profile.webp",
  the_witcher: "/assets/characters_profile/the_witcher_profile.webp",
  tigress_blaze: "/assets/characters_profile/tigress_blaze_profile.webp",
  the_razor: "/assets/characters_profile/the_razor_profile.webp",
};

const DEFAULT_PROFILE = "/assets/characters_profile/the_marshal_profile.webp";

// ─── Init Firebase Admin ─────────────────────────────────────────────────────

const serviceAccountPath = resolve(__dirname, "serviceAccountKey.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
} catch {
  console.error(
    "ERROR: Could not read service account key.\n" +
      `Expected at: ${serviceAccountPath}\n` +
      "Download from Firebase Console > Project Settings > Service Accounts > Generate new private key",
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Migration ───────────────────────────────────────────────────────────────

async function migrate() {
  const playersRef = db.collection("players");
  const snapshot = await playersRef.get();

  console.log(`Found ${snapshot.size} player documents.`);

  let updated = 0;
  let skipped = 0;
  const batch = db.batch();
  const BATCH_LIMIT = 500;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if already has avatarPicture
    if (data.avatarPicture) {
      skipped++;
      continue;
    }

    const avatar = data.avatar || "marshal";
    const profileImage = PROFILE_IMAGE_MAP[avatar] || DEFAULT_PROFILE;

    batch.update(doc.ref, { avatarPicture: profileImage });
    updated++;
    batchCount++;

    // Firestore batches max 500 operations
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount} updates...`);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\nMigration complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already had avatarPicture): ${skipped}`);
  console.log(`  Total: ${snapshot.size}`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
