import sharp from "sharp";
import fs from "fs";
import path from "path";

const CHARS_DIR = "./public/assets/characters";
const PROFILE_DIR = "./public/assets/characters_profile";

(async () => {
  try {
    // Convert norris.png
    const charSrc = path.join(CHARS_DIR, "norris.png");
    const charDest = path.join(CHARS_DIR, "norris.webp");

    if (fs.existsSync(charSrc)) {
      console.log(`Converting: norris.png -> norris.webp`);
      await sharp(charSrc).webp({ quality: 80 }).toFile(charDest);
      console.log(`  ✓ Done`);

      // Move original to png folder
      const pngDir = path.join(CHARS_DIR, "png");
      if (!fs.existsSync(pngDir)) {
        fs.mkdirSync(pngDir, { recursive: true });
      }
      const movedPath = path.join(pngDir, "norris.png");
      fs.renameSync(charSrc, movedPath);
      console.log(`  ✓ Moved to png/ folder`);
    }

    // Convert norris_profile.png
    const profileSrc = path.join(PROFILE_DIR, "norris_profile.png");
    const profileDest = path.join(PROFILE_DIR, "norris_profile.webp");

    if (fs.existsSync(profileSrc)) {
      console.log(`Converting: norris_profile.png -> norris_profile.webp`);
      await sharp(profileSrc).webp({ quality: 80 }).toFile(profileDest);
      console.log(`  ✓ Done`);

      // Move original to png folder
      const pngDir = path.join(PROFILE_DIR, "png");
      if (!fs.existsSync(pngDir)) {
        fs.mkdirSync(pngDir, { recursive: true });
      }
      const movedPath = path.join(pngDir, "norris_profile.png");
      fs.renameSync(profileSrc, movedPath);
      console.log(`  ✓ Moved to png/ folder`);
    }

    console.log("--- All conversions complete ---");
  } catch (err) {
    console.error("Error:", err);
  }
})();
