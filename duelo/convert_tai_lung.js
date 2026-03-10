import sharp from "sharp";
import fs from "fs";
import path from "path";

const CHARS_DIR = "./public/assets/characters";

(async () => {
  const src = "tai lung.png";
  const dest = "tai lung.webp";

  const srcPath = path.join(CHARS_DIR, src);
  const destPath = path.join(CHARS_DIR, dest);

  if (fs.existsSync(srcPath)) {
    console.log(`Converting: ${src} -> ${dest}`);
    await sharp(srcPath).webp({ quality: 80 }).toFile(destPath);
    console.log(`  ✓ Done`);

    // Move original to png folder
    const pngDir = path.join(CHARS_DIR, "png");
    if (!fs.existsSync(pngDir)) {
      fs.mkdirSync(pngDir, { recursive: true });
    }
    const movedPath = path.join(pngDir, src);
    fs.renameSync(srcPath, movedPath);
    console.log(`  ✓ Moved original to png/ folder`);
  } else {
    console.log(`  ✗ File not found: ${src}`);
  }

  console.log("--- Conversion complete ---");
})().catch((err) => console.error("Error:", err));
