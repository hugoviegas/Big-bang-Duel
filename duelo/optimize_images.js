/**
 * SCRIPT PARA OTIMIZAR IMAGENS (CONVERTER PARA WEBP)
 *
 * Instruções:
 * 1. Instale o sharp: npm install -D sharp
 * 2. Execute: node optimize_images.js
 *
 * O script converte PNG/JPG para WebP e move os originais para uma subpasta "png/".
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";

const ASSETS_DIR = "./public/assets";

async function optimizeDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip the "png" subdirectory to avoid re-processing originals
      if (file === "png") continue;
      await optimizeDir(fullPath);
    } else if (file.endsWith(".png") || file.endsWith(".jpg")) {
      const outputName = file.replace(/\.(png|jpg)$/, ".webp");
      const outputPath = path.join(dir, outputName);

      console.log(`Otimizando: ${file} -> ${outputName}`);

      await sharp(fullPath).webp({ quality: 80 }).toFile(outputPath);

      // Move o arquivo original para a subpasta "png/"
      const pngDir = path.join(dir, "png");
      if (!fs.existsSync(pngDir)) {
        fs.mkdirSync(pngDir, { recursive: true });
      }
      const movedPath = path.join(pngDir, file);
      fs.renameSync(fullPath, movedPath);
      console.log(`  Movido original: ${file} -> png/${file}`);
    }
  }
}

console.log("--- Iniciando otimização de imagens ---");
optimizeDir(ASSETS_DIR)
  .then(() => console.log("--- Otimização concluída! ---"))
  .catch((err) => console.error("Erro:", err));
