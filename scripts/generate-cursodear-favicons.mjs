/**
 * Gera favicons com fundo claro e margem a partir de `public/images/cursodear/logo.png`
 * (melhor contraste em abas de navegador em tema escuro).
 * Executar: node scripts/generate-cursodear-favicons.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = path.join(root, 'public', 'images', 'cursodear', 'logo.png');
const outDir = path.join(root, 'public', 'images', 'cursodear');

/** fundo levemente quente — lê bem em aba escura e em clara */
const BG = { r: 248, g: 250, b: 252, alpha: 1 };

async function tileFavicon(size) {
  const pad = Math.max(2, Math.round(size * 0.1));
  const inner = size - pad * 2;
  const innerBuf = await sharp(logoPath)
    .resize(inner, inner, { fit: 'inside' })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: innerBuf, gravity: 'center' }])
    .png();
}

await (await tileFavicon(32)).toFile(path.join(outDir, 'favicon-32.png'));
await (await tileFavicon(180)).toFile(path.join(outDir, 'apple-touch-icon.png'));
await (await tileFavicon(32)).toFile(path.join(root, 'public', 'favicon-32.png'));
await (await tileFavicon(180)).toFile(path.join(root, 'public', 'apple-touch-icon.png'));
await fs.copyFile(path.join(outDir, 'favicon-32.png'), path.join(root, 'public', 'favicon.ico'));

console.log('OK: cursodear/favicon-32.png, apple; cópia em public/ para atalhos e favicon.ico');
