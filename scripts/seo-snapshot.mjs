/**
 * Tira uma "foto" de SEO do site: URLs do sitemap + páginas internas linkadas,
 * com title, description, canonical, robots, H1, H2, og:image, JSON-LD e links Hotmart.
 *
 * Uso:
 *   node scripts/seo-snapshot.mjs https://cursodearcondicionado.com.br seo-baseline.json
 *   node scripts/seo-snapshot.mjs dist seo-atual.json        (lê o build estático local)
 *   node scripts/seo-snapshot.mjs --compare seo-baseline.json seo-atual.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://cursodearcondicionado.com.br';

/** Páginas que existem mas não são linkadas nem estão no sitemap (categorias etc.). */
const EXTRA_PAGES = [
  '/carreira/', '/ferramentas/', '/instalacao/', '/manutencao/', '/mercado/',
  '/precos/', '/tecnico/', '/tecnologia/', '/uso/',
  '/setup/', '/authors/administrador/', '/authors/equipe-curso-de-ar-condicionado/',
];

/** URLs antigas ou alternativas: registra status e destino do redirect (só em fonte http). */
const REDIRECT_TESTS = [
  '/sobre', '/blog', '/blog/como-instalar-ar-condicionado-split/', '/blog/como-instalar-ar-condicionado-split',
  '/blog/ferramentas-tecnico-ar-condicionado/', '/blog/?categoria=manutencao', '/servicos/', '/servicos/x/',
  '/nossos-cursos', '/nossos-cursos/', '/pagina-que-nao-existe/',
];

const decode = (s) =>
  s
    .replace(/&#x26;|&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
const text = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? decode(m[1] ?? m[2]) : null;
};
const meta = (html, key, val) => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) if (attr(m[0], key) === val) return attr(m[0], 'content');
  return null;
};

function extract(html) {
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].find((m) => attr(m[0], 'rel') === 'canonical');
  const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return { invalid: m[1].slice(0, 200) }; }
  });
  const hotmart = [...html.matchAll(/<a\b[^>]*>/gi)]
    .map((m) => attr(m[0], 'href'))
    .filter((h) => h && /(go|pay)\.hotmart\.com|hotm\.art/.test(h));
  return {
    title: text((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || ''),
    description: meta(html, 'name', 'description'),
    canonical: canonicalTag ? attr(canonicalTag[0], 'href') : null,
    robots: meta(html, 'name', 'robots'),
    h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1])),
    h2: [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => text(m[1])),
    ogImage: meta(html, 'property', 'og:image'),
    jsonLd,
    hotmart,
  };
}

const internalLinks = (html) =>
  [...html.matchAll(/<a\b[^>]*>/gi)]
    .map((m) => attr(m[0], 'href'))
    .filter(Boolean)
    .map((h) => { try { return new URL(h, ORIGIN + '/'); } catch { return null; } })
    .filter((u) => u && u.origin === ORIGIN && !/\.[a-z0-9]{2,5}$/i.test(u.pathname))
    .map((u) => (u.pathname.endsWith('/') ? u.pathname : u.pathname + '/'));

async function load(source, pathname) {
  if (/^https?:/.test(source)) {
    const res = await fetch(source + pathname, { redirect: 'manual' });
    return { status: res.status, location: res.headers.get('location'), html: res.status === 200 ? await res.text() : '' };
  }
  const file = path.join(source, pathname, 'index.html');
  if (fs.existsSync(file)) return { status: 200, location: null, html: fs.readFileSync(file, 'utf8') };
  return { status: 404, location: null, html: '' };
}

async function snapshot(source, out) {
  const sitemapXml = /^https?:/.test(source)
    ? await (await fetch(source + '/sitemap-index.xml')).text()
    : fs.readFileSync(path.join(source, 'sitemap-index.xml'), 'utf8');
  const sitemap = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const queue = [...sitemap, ...EXTRA_PAGES];
  const pages = {};
  while (queue.length) {
    const p = queue.shift();
    if (pages[p]) continue;
    const r = await load(source, p);
    pages[p] = r.status === 200 ? { status: 200, inSitemap: sitemap.includes(p), ...extract(r.html) } : { status: r.status, location: r.location };
    if (r.status === 200) for (const l of internalLinks(r.html)) if (!pages[l] && !queue.includes(l)) queue.push(l);
  }
  const redirects = {};
  if (/^https?:/.test(source)) for (const u of REDIRECT_TESTS) { const r = await load(source, u); redirects[u] = { status: r.status, location: r.location ? r.location.replace(source, '') : null }; }
  const sorted = Object.fromEntries(Object.keys(pages).sort().map((k) => [k, pages[k]]));
  fs.writeFileSync(out, JSON.stringify({ source, takenAt: new Date().toISOString(), sitemap: sitemap.sort(), redirects, pages: sorted }, null, 2));
  console.log(`${Object.keys(sorted).length} páginas (${sitemap.length} no sitemap) -> ${out}`);
}

function compare(aFile, bFile) {
  const a = JSON.parse(fs.readFileSync(aFile, 'utf8'));
  const b = JSON.parse(fs.readFileSync(bFile, 'utf8'));
  let diffs = 0;
  const show = (k, x, y) => { diffs++; console.log(`  ${k}\n    antes: ${JSON.stringify(x)}\n    depois: ${JSON.stringify(y)}`); };
  const sa = new Set(a.sitemap), sb = new Set(b.sitemap);
  for (const u of a.sitemap) if (!sb.has(u)) { diffs++; console.log(`SITEMAP removida: ${u}`); }
  for (const u of b.sitemap) if (!sa.has(u)) { diffs++; console.log(`SITEMAP nova: ${u}`); }
  for (const u of Object.keys(b.redirects || {})) if (JSON.stringify(a.redirects?.[u]) !== JSON.stringify(b.redirects[u])) { diffs++; console.log(`REDIRECT ${u}: ${JSON.stringify(a.redirects?.[u])} -> ${JSON.stringify(b.redirects[u])}`); }
  for (const p of new Set([...Object.keys(a.pages), ...Object.keys(b.pages)])) {
    const x = a.pages[p], y = b.pages[p];
    if (!y) { diffs++; console.log(`PÁGINA sumiu: ${p}`); continue; }
    if (!x) { diffs++; console.log(`PÁGINA nova: ${p} (status ${y.status})`); continue; }
    const keys = new Set([...Object.keys(x), ...Object.keys(y)].filter((k) => k !== 'location'));
    const changed = [...keys].filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    if (changed.length) { console.log(`DIFERENTE: ${p}`); for (const k of changed) show(k, x[k], y[k]); }
  }
  console.log(diffs ? `\n${diffs} diferença(s).` : 'Idêntico.');
}

const [, , a, b, c] = process.argv;
if (a === '--compare') compare(b, c);
else await snapshot(a.replace(/\/$/, ''), b);
