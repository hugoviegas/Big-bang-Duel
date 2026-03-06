/**
 * SCRIPT PARA OTIMIZAR IMAGENS (CONVERTER PARA WEBP)
 * 
 * Instruções:
 * 1. Instale o sharp: npm install -D sharp
 * 2. Execute: node optimize_images.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ASSETS_DIR = './public/assets';

async function optimizeDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await optimizeDir(fullPath);
    } else if (file.endsWith('.png') || file.endsWith('.jpg')) {
      const outputName = file.replace(/\.(png|jpg)$/, '.webp');
      const outputPath = path.join(dir, outputName);

      console.log(`Otimizando: ${file} -> ${outputName}`);
      
      await sharp(fullPath)
        .webp({ quality: 80 })
        .toFile(outputPath);

      // Opcional: Remover o arquivo original para economizar espaço
      // fs.unlinkSync(fullPath); 
    }
  }
}

console.log('--- Iniciando otimização de imagens ---');
optimizeDir(ASSETS_DIR)
  .then(() => console.log('--- Otimização concluída! ---'))
  .catch(err => console.error('Erro:', err));
