/**
 * Gera favicon.png (32), apple-touch-icon.png (180) a partir do SVG Bem Mãe.
 * Executar: node scripts/generate-favicons.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'public', 'bemmae-favicon.svg');
/** Sharp/libxml2 no Windows falha com alguns UTF-8 em atributos; rasterizamos cópia ASCII. */
const svgUtf8 = await fs.readFile(svgPath, 'utf8');
const svgBuf = Buffer.from(svgUtf8.replace(/Bem Mãe/g, 'Bem Mae'), 'utf8');

await sharp(svgBuf).resize(32, 32).png().toFile(path.join(root, 'public', 'favicon-32.png'));
await sharp(svgBuf).resize(180, 180).png().toFile(path.join(root, 'public', 'apple-touch-icon.png'));
console.log('OK: public/favicon-32.png, public/apple-touch-icon.png');
