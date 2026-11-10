/**
 * Uso: bun run scripts/inspect-ghost-export.mjs "C:/path/to/export.json"
 */
import fs from 'node:fs';

const path = process.argv[2];
if (!path || !fs.existsSync(path)) {
    console.error('Uso: bun run scripts/inspect-ghost-export.mjs <ficheiro.json>');
    process.exit(1);
}

const j = JSON.parse(fs.readFileSync(path, 'utf-8'));
const posts = j.db[0].data.posts || [];
const urls = new Set();

for (const p of posts) {
    if (p.feature_image) urls.add(p.feature_image);
    const h = p.html || '';
    const re = /https?:[^\s"'<>]+\/content\/images\/[^\s"'<>]+/gi;
    let m;
    while ((m = re.exec(h)) !== null) urls.add(m[0]);
}

console.log('Posts no export:', posts.length);
console.log('URLs únicas (feature_image + img no HTML):', urls.size);
for (const u of [...urls].sort()) console.log(u);
