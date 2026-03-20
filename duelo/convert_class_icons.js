import sharp from "sharp";
import fs from "fs";
import path from "path";

const CLASS_ICONS_DIR = "./public/assets/class_icons";

(async () => {
  const files = fs
    .readdirSync(CLASS_ICONS_DIR)
    .filter((file) => file.endsWith(".png"));

  if (files.length === 0) {
    console.log("No PNG icons found in class_icons.");
    return;
  }

  for (const file of files) {
    const srcPath = path.join(CLASS_ICONS_DIR, file);
    const destName = file.replace(/\.png$/i, ".webp");
    const destPath = path.join(CLASS_ICONS_DIR, destName);

    console.log(`Converting: ${file} -> ${destName}`);
    await sharp(srcPath).webp({ quality: 85 }).toFile(destPath);

    const pngDir = path.join(CLASS_ICONS_DIR, "png");
    if (!fs.existsSync(pngDir)) {
      fs.mkdirSync(pngDir, { recursive: true });
    }

    const movedPath = path.join(pngDir, file);
    fs.renameSync(srcPath, movedPath);
    console.log(`  Moved original: ${file} -> png/${file}`);
  }

  console.log("--- Class icons conversion complete ---");
})().catch((err) => console.error("Error:", err));
