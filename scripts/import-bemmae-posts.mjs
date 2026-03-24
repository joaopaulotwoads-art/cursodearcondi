/**
 * Importa posts do Bem Mãe (Ghost JSON) para src/content/posts/*.md
 * Mantém HTML + <style> dos cards (como no site na Vercel); remove só scripts e comentários kg-card.
 * Uso: bun run scripts/import-bemmae-posts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const jsonPath = path.join(root, 'reference', 'bemmae-src', 'src', 'data', 'posts-from-ghost.json');
const outDir = path.join(root, 'src', 'content', 'posts');

/** Base do Ghost no export (placeholder __GHOST_URL__). Ajuste via env GHOST_IMAGE_BASE se mudar o domínio. */
const GHOST_IMAGE_BASE = (process.env.GHOST_IMAGE_BASE || 'https://bemmae.com.br').replace(/\/+$/, '');

if (!fs.existsSync(jsonPath)) {
    console.error('Falta o clone de referência:', jsonPath);
    console.error('Execute: git clone https://github.com/joaopaulotwoads-art/bemmae.git reference/bemmae-src');
    process.exit(1);
}

const posts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

function ghostUrls(s) {
    return String(s || '').replace(/__GHOST_URL__/g, GHOST_IMAGE_BASE);
}

/** Preserva <style> e markup dos cards; remove scripts e wrappers kg-card. */
function sanitizeGhostHtml(html) {
    let s = ghostUrls(html);
    s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
    s = s.replace(/<!--\s*kg-card-begin:[\s\S]*?-->/g, '');
    s = s.replace(/<!--\s*kg-card-end:[\s\S]*?-->/g, '');
    return s.trim();
}

/** Junta frases ou cláusulas em parágrafos até ~max caracteres. */
function packParts(parts, max) {
    const chunks = [];
    let buf = '';
    for (const part of parts) {
        const candidate = buf ? `${buf} ${part}`.trim() : part;
        if (candidate.length > max && buf) {
            chunks.push(buf.trim());
            buf = part;
        } else {
            buf = candidate;
        }
    }
    if (buf) chunks.push(buf.trim());
    return chunks;
}

/**
 * Quebra <p> só texto (sem tags internas) em blocos menores.
 * 1) Por frases (. ! ?)  2) Se ainda longo, por vírgulas (texto PT corrido).
 * <p> com <strong> etc. não são alterados.
 */
function splitLongPlainParagraphs(html) {
    /* ~3–4 linhas em mobile (coluna estreita) ≈ até ~210 caracteres por <p> */
    const MAX_CHARS = 210;
    return html.replace(/<p(\s[^>]*)?>([^<]+)<\/p>/gi, (full, attrs, inner) => {
        const text = inner.replace(/\s+/g, ' ').trim();
        if (text.length <= MAX_CHARS) return full;

        let parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
        if (parts.length < 2) {
            parts = text.split(/\s*,\s+/).filter(Boolean);
            if (parts.length < 2) return full;
            parts = parts.map((p, i) => (i < parts.length - 1 ? `${p},` : p));
        }

        let chunks = packParts(parts, MAX_CHARS);
        if (chunks.length < 2) return full;

        chunks = chunks.flatMap((chunk) => {
            if (chunk.length <= MAX_CHARS) return [chunk];
            const sub = chunk.split(/\s*,\s+/).filter(Boolean);
            if (sub.length < 2) return [chunk];
            const withComma = sub.map((p, i) => (i < sub.length - 1 ? `${p},` : p));
            return packParts(withComma, MAX_CHARS);
        });

        if (chunks.length < 2) return full;
        const a = attrs || '';
        const fixed = chunks.map((c, i) => {
            let t = c.trim().replace(/,\s*$/, '');
            if (i > 0) {
                t = t.replace(/^\s*([a-záàâãéêíóôõúç])/, (_, g) => g.toUpperCase());
            }
            return t;
        });
        return fixed.map((c) => `<p${a}>${c}</p>`).join('');
    });
}

function metaDesc(excerpt, html) {
    const e = String(excerpt || '').replace(/<[^>]+>/g, '').trim();
    if (e) return e.slice(0, 300);
    const plain = sanitizeGhostHtml(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.slice(0, 300);
}

function yamlEscape(v) {
    if (v == null) return '""';
    const t = String(v);
    if (/["\n:#]/.test(t)) return JSON.stringify(t);
    return t;
}

fs.mkdirSync(outDir, { recursive: true });

for (const p of posts) {
    const slug = String(p.slug || '').trim();
    if (!slug) continue;

    const body = splitLongPlainParagraphs(sanitizeGhostHtml(p.html || ''));
    const safeBody = body || '<p><em>Sem conteúdo.</em></p>';

    const publishedDate = p.published_at || p.created_at || new Date().toISOString();
    const dateOnly = publishedDate.slice(0, 10);
    const metaDescription = metaDesc(p.excerpt, p.html);
    const thumb = ghostUrls((p.feature_image || '').trim());

    const fm = [
        '---',
        `title: ${yamlEscape(p.title || slug)}`,
        `slug: ${yamlEscape(slug)}`,
        `author: vitoria-caroline`,
        `publishedDate: "${dateOnly}"`,
        'contentFormat: html',
        metaDescription ? `metaDescription: ${yamlEscape(metaDescription)}` : null,
        thumb ? `thumbnail: ${yamlEscape(thumb)}` : null,
        thumb ? `metaImage: ${yamlEscape(thumb)}` : null,
        '---',
        '',
        safeBody,
        '',
    ]
        .filter(Boolean)
        .join('\n');

    const file = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(file, fm, 'utf-8');
    console.log('OK', slug);
}

console.log('Total:', posts.length, '→', outDir, '| imagens:', GHOST_IMAGE_BASE);
