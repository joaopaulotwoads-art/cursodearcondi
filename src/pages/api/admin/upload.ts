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

const MEDIA_UPLOAD_TYPES = ['posts', 'authors', 'themes', 'general'] as const;

/** Limite seguro para a API Contents do GitHub (base64 no JSON); acima disso use Vercel Blob. */
const GITHUB_CONTENTS_MAX_BYTES = 95 * 1024 * 1024;

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const rawType = (formData.get('type') as string) || 'general';
        const type = MEDIA_UPLOAD_TYPES.includes(rawType as (typeof MEDIA_UPLOAD_TYPES)[number])
            ? rawType
            : 'general';

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
            if (buffer.length > GITHUB_CONTENTS_MAX_BYTES) {
                return json(
                    {
                        success: false,
                        error:
                            'Imagem demasiado grande para o GitHub via API. Reduza o ficheiro ou configure BLOB_READ_WRITE_TOKEN na Vercel (Vercel Blob).',
                    },
                    413,
                );
            }
            const githubPath = `public/images/${type}/${filename}`;
            const result = await githubWriteFileBuffer(
                githubPath,
                buffer,
                `media: upload image "${filename}"`,
            );
            if (!result.ok) {
                return json(
                    {
                        success: false,
                        error:
                            result.error ||
                            'Erro ao commitar imagem. Verifique permissões do token (Contents: Read/Write) e o nome do repositório.',
                    },
                    502,
                );
            }
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
