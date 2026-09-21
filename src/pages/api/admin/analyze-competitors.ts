/**
 * API /api/admin/analyze-competitors
 *
 * POST — Recebe lista de URLs de concorrentes, extrai os headings (H1-H4)
 * de cada página e retorna a outline consolidada com frequência por seção.
 *
 * Estratégia de extração com fallbacks em cascata:
 *   1. Fetch direto com headers de browser real
 *   2. Fallback: Google Cache (webcache.googleusercontent.com)
 *   3. Falha controlada — nunca trava a resposta total
 *
 * Retorna por URL:
 *   { url, status: 'success'|'cached'|'partial'|'blocked'|'timeout'|'invalid',
 *     title, headings: [{level, text}] }
 *
 * Retorna consolidado:
 *   { outline: [{level, text, frequency, urls[]}] }
 */

import type { APIRoute } from 'astro';

const FETCH_TIMEOUT_MS = 8000;

const BROWSER_HEADERS = {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control':   'no-cache',
    'Pragma':          'no-cache',
    'Connection':      'keep-alive',
};

interface Heading { level: 'h1' | 'h2' | 'h3' | 'h4'; text: string; }

interface UrlResult {
    url:       string;
    status:    'success' | 'cached' | 'partial' | 'blocked' | 'timeout' | 'invalid';
    title:     string;
    headings:  Heading[];
    error?:    string;
}

/** Limpa texto HTML de tags e entidades */
function cleanHtml(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g,  '&')
        .replace(/&lt;/g,   '<')
        .replace(/&gt;/g,   '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ')
        .trim();
}

/** Extrai headings H1-H4 de um HTML bruto */
function extractHeadings(html: string): Heading[] {
    const regex   = /<h([1-4])(?:\s[^>]*)?>([^]*?)<\/h\1>/gi;
    const results: Heading[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
        const level = `h${match[1]}` as Heading['level'];
        const text  = cleanHtml(match[2]);
        if (text && text.length > 2 && text.length < 300) {
            results.push({ level, text });
        }
    }

    return results;
}

/** Extrai o <title> da página */
function extractTitle(html: string): string {
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return m ? cleanHtml(m[1]) : '';
}

/** Tenta buscar um URL com headers de browser */
async function fetchDirect(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

/** Tenta buscar via Google Cache */
async function fetchGoogleCache(url: string): Promise<string> {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    const res = await fetch(cacheUrl, {
        headers: BROWSER_HEADERS,
        signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Cache HTTP ${res.status}`);
    return res.text();
}

/** Processa um único URL com fallbacks */
async function processUrl(url: string): Promise<UrlResult> {
    const safe = url.trim();

    if (!safe.startsWith('http://') && !safe.startsWith('https://')) {
        return { url: safe, status: 'invalid', title: '', headings: [], error: 'URL inválida' };
    }

    try {
        const html     = await fetchDirect(safe);
        const headings = extractHeadings(html);
        const title    = extractTitle(html);

        if (headings.length === 0) {
            return { url: safe, status: 'partial', title, headings: [], error: 'Nenhum heading extraído (possível SPA)' };
        }

        return { url: safe, status: 'success', title, headings };
    } catch (directErr: any) {
        // Fallback: Google Cache
        try {
            const html     = await fetchGoogleCache(safe);
            const headings = extractHeadings(html);
            const title    = extractTitle(html);

            if (headings.length > 0) {
                return { url: safe, status: 'cached', title, headings };
            }
        } catch {
            // Ignora erro do cache
        }

        // Classifica o erro original
        const msg = directErr?.message || '';
        if (msg.includes('timeout') || msg.includes('signal')) {
            return { url: safe, status: 'timeout', title: '', headings: [], error: 'Site não respondeu em 8s' };
        }
        if (msg.includes('403') || msg.includes('429') || msg.includes('405')) {
            return { url: safe, status: 'blocked', title: '', headings: [], error: 'Site bloqueou a extração' };
        }

        return { url: safe, status: 'blocked', title: '', headings: [], error: msg || 'Erro ao acessar o site' };
    }
}

interface ConsolidatedItem {
    level:     Heading['level'];
    text:      string;
    frequency: number;
    urls:      string[];
}

/** Consolida headings de múltiplos resultados por frequência */
function consolidate(results: UrlResult[]): ConsolidatedItem[] {
    const map = new Map<string, ConsolidatedItem>();

    results.forEach(result => {
        if (result.status !== 'success' && result.status !== 'cached') return;

        result.headings.forEach(h => {
            // Normaliza texto para agrupar variações parecidas
            const key = `${h.level}:${h.text.toLowerCase().replace(/[^\w\sáàãâéêíóôõúç]/gi, '').trim().slice(0, 60)}`;

            if (map.has(key)) {
                const item = map.get(key)!;
                item.frequency++;
                if (!item.urls.includes(result.url)) item.urls.push(result.url);
            } else {
                map.set(key, { level: h.level, text: h.text, frequency: 1, urls: [result.url] });
            }
        });
    });

    return Array.from(map.values()).sort((a, b) => b.frequency - a.frequency || 0);
}

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        if (!locals.user) {
            return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const urls: string[] = (body.urls || []).filter(Boolean).slice(0, 8);

        if (urls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Informe pelo menos 1 URL' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Processa todas as URLs em paralelo, sem travar em falhas
        const settledResults = await Promise.allSettled(urls.map(processUrl));
        const results: UrlResult[] = settledResults.map((r, i) =>
            r.status === 'fulfilled'
                ? r.value
                : { url: urls[i], status: 'blocked' as const, title: '', headings: [], error: 'Erro inesperado' },
        );

        const consolidated = consolidate(results);
        const successCount  = results.filter(r => r.status === 'success' || r.status === 'cached').length;

        return new Response(JSON.stringify({
            success:      true,
            results,
            consolidated,
            successCount,
            totalCount:   results.length,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao analisar concorrentes:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
