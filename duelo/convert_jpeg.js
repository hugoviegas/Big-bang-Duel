import sharp from "sharp";
import fs from "fs";
import path from "path";

const CHARS_DIR = "./public/assets/characters";

(async () => {
  const files = [
    { src: "la belle.jpeg", dest: "la belle.webp" },
    { src: "o panda.jpeg", dest: "o panda.webp" },
  ];

  for (const { src, dest } of files) {
    const srcPath = path.join(CHARS_DIR, src);
    const destPath = path.join(CHARS_DIR, dest);

    if (fs.existsSync(srcPath)) {
      console.log(`Converting: ${src} -> ${dest}`);
      await sharp(srcPath).webp({ quality: 80 }).toFile(destPath);
      console.log(`  ✓ Done`);
    } else {
      console.log(`  ✗ File not found: ${src}`);
    }
  }

  console.log("--- Conversion complete ---");
})().catch((err) => console.error("Error:", err));
