/**
 * Proxy de imagem para preview no admin.
 * Busca do GitHub raw quando a imagem ainda não está no deploy (upload via GitHub).
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

    if (!owner || !repo) {
        return new Response(null, { status: 404 });
    }

    const rawPath = pathParam.replace(/^\//, '');
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rawPath}`;

    try {
        const res = await fetch(rawUrl);
        if (!res.ok) return new Response(null, { status: 404 });
        const blob = await res.blob();
        const ct = res.headers.get('content-type') || 'image/jpeg';
        return new Response(blob, {
            headers: { 'Content-Type': ct, 'Cache-Control': 'private, max-age=300' },
        });
    } catch {
        return new Response(null, { status: 404 });
    }
};
