/**
 * Lista caminhos únicos /content/images/... referenciados nos posts (markdown + HTML embutido).
 * Copie esses ficheiros para public/content/images/... (mesma estrutura de pastas) a partir do backup Ghost ou export.
 *
 * Uso: bun run scripts/list-bemmae-content-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, '..', 'src', 'content', 'posts');

const re = /\/content\/images\/[^\s"'<>]+\.(?:webp|jpg|jpeg|png|gif|svg|avif)/gi;

const found = new Set();

function scanFile(filePath) {
    const t = fs.readFileSync(filePath, 'utf-8');
    for (const m of t.matchAll(re)) {
        found.add(m[0]);
    }
}

function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (name.endsWith('.md')) scanFile(p);
    }
}

if (!fs.existsSync(postsDir)) {
    console.error('Pasta não encontrada:', postsDir);
    process.exit(1);
}

walk(postsDir);

const sorted = [...found].sort();
console.log(`Total: ${sorted.length} ficheiros únicos (relativos ao site)\n`);
for (const rel of sorted) {
    const local = path.join('public', rel.replace(/^\//, ''));
    console.log(rel);
    console.log(`  → copiar para ${local}`);
}
console.log('\nSem esses ficheiros em public/, o browser recebe 404 (não é falha de deploy).');
