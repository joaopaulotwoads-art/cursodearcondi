import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isGitHubConfigured, githubWriteFileBuffer } from '../../../utils/github-api';

/**
 * Upload de imagens.
 * - Em produção com BLOB_READ_WRITE_TOKEN → usa Vercel Blob
 * - Em produção com GitHub configurado → commita via GitHub API
 * - Em dev local → salva em public/images/
 */

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type  = (formData.get('type') as string) || 'general';

        if (!file) {
            return json({ success: false, error: 'Nenhum arquivo enviado' }, 400);
        }

        if (!file.type.startsWith('image/')) {
            return json({ success: false, error: 'Apenas imagens são permitidas' }, 400);
        }

        const timestamp    = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
        const filename     = `${timestamp}-${originalName}`;
        const arrayBuffer  = await file.arrayBuffer();
        const buffer       = Buffer.from(arrayBuffer);

        // ── 1. Vercel Blob (preferencial em produção) ──────────────────────
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            const { put } = await import('@vercel/blob');
            const blob = await put(`images/${type}/${filename}`, buffer, {
                access: 'public',
                contentType: file.type,
            });
            return json({ success: true, url: blob.url, filename, type });
        }

        // ── 2. GitHub API (fallback em produção sem Blob) ──────────────────
        if (isGitHubConfigured()) {
            const githubPath = `public/images/${type}/${filename}`;
            const ok = await githubWriteFileBuffer(
                githubPath,
                buffer,
                `media: upload image "${filename}"`,
            );
            if (!ok) return json({ success: false, error: 'Erro ao commitar imagem' }, 500);
            return json({ success: true, url: `/images/${type}/${filename}`, filename, type });
        }

        // ── 3. Filesystem local (dev) ──────────────────────────────────────
        const uploadDir = path.resolve(`./public/images/${type}`);
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(path.join(uploadDir, filename), buffer);

        return json({ success: true, url: `/images/${type}/${filename}`, filename, type });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('❌ Upload error:', msg);
        return json({ success: false, error: msg }, 500);
    }
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
