/**
 * Remove fundo branco / halo rosado claro do logo Bem Mãe (PNG → alpha).
 * Flood-fill a partir das bordas: só o que está ligado à margem vira transparente.
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(root, 'public', 'bemmae-logo.png');
const outPath = path.join(root, 'public', 'bemmae-logo.png');

function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(r, g, b) {
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mx < 1 ? 0 : (mx - mn) / mx;
}

/** Pixels de fundo: branco, quase branco, rosa muito pálido atrás do texto */
function isBackgroundPixel(r, g, b) {
    const L = luminance(r, g, b);
    const S = saturation(r, g, b);
    if (L >= 238 && S <= 0.14) return true;
    if (L >= 228 && S <= 0.1 && r >= 242 && g >= 235 && b >= 235) return true;
    if (L >= 218 && S <= 0.06 && r >= 250) return true;
    return false;
}

const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
if (channels !== 4) throw new Error('Esperado RGBA');

const idx = (x, y) => (y * width + x) * 4;
const visited = new Uint8Array(width * height);
const queue = [];

for (let x = 0; x < width; x++) {
    queue.push([x, 0], [x, height - 1]);
}
for (let y = 0; y < height; y++) {
    queue.push([0, y], [width - 1, y]);
}

while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const i = y * width + x;
    if (visited[i]) continue;
    const p = idx(x, y);
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (!isBackgroundPixel(r, g, b)) continue;
    visited[i] = 1;
    data[p + 3] = 0;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(outPath + '.tmp');

await fs.rename(outPath + '.tmp', outPath);
console.log('OK:', outPath, `${width}x${height}`);
