/**
 * Roda depois do `astro build`: acrescenta em dist/_redirects um 301 "/pagina -> /pagina/"
 * para cada página gerada. A Cloudflare só faria 307 sozinha (html_handling).
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const sub = path.join(dir, entry.name);
    if (fs.existsSync(path.join(sub, 'index.html'))) pages.push('/' + path.relative(dist, sub).split(path.sep).join('/'));
    walk(sub);
  }
})(dist);

const file = path.join(dist, '_redirects');
const manual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trimEnd() + '\n' : '';
const generated = pages.sort().map((p) => `${p} ${p}/ 301`).join('\n');
fs.writeFileSync(file, `${manual}\n# Gerado no build: barra final em todas as páginas\n${generated}\n`);
console.log(`_redirects: ${pages.length} regras de barra final`);
