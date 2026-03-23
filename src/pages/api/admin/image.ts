/**
 * Proxy de imagem para preview no admin.
 * Busca do GitHub quando a imagem ainda não está no deploy (upload via GitHub).
 * Usado apenas para caminhos /images/... em ambientes com GitHub configurado.
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
    if (!locals.user) {
        return new Response(null, { status: 401 });
    }

    const pathParam = url.searchParams.get('path');
    if (!pathParam || !pathParam.startsWith('/images/') || pathParam.includes('..')) {
        return new Response(null, { status: 400 });
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;

    if (!owner || !repo) {
        return new Response(null, { status: 404 });
    }

    const rawPath = pathParam.replace(/^\//, '');
    const contentPath = `public/${rawPath}`;
    const encodedPath = contentPath
        .split('/')
        .filter(Boolean)
        .map((p) => encodeURIComponent(p))
        .join('/');
    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rawPath}`;

    try {
        // 1) Tenta via GitHub Contents API com token (funciona em repositórios privados)
        if (token) {
            const ghRes = await fetch(contentsUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.raw',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });
            if (ghRes.ok) {
                const buffer = await ghRes.arrayBuffer();
                const ext = rawPath.split('.').pop()?.toLowerCase() || '';
                const typeMap: Record<string, string> = {
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    png: 'image/png',
                    webp: 'image/webp',
                    gif: 'image/gif',
                    svg: 'image/svg+xml',
                    avif: 'image/avif',
                };
                const ct = typeMap[ext] || ghRes.headers.get('content-type') || 'application/octet-stream';
                return new Response(buffer, {
                    headers: { 'Content-Type': ct, 'Cache-Control': 'private, max-age=300' },
                });
            }
        }

        // 2) Fallback público (repositório público / sem token)
        const rawRes = await fetch(rawUrl);
        if (!rawRes.ok) return new Response(null, { status: 404 });
        const blob = await rawRes.blob();
        const ct = rawRes.headers.get('content-type') || 'image/jpeg';
        return new Response(blob, {
            headers: { 'Content-Type': ct, 'Cache-Control': 'private, max-age=300' },
        });
    } catch {
        return new Response(null, { status: 404 });
    }
};
