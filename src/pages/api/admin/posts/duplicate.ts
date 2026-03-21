/**
 * api/admin/posts/duplicate.ts
 *
 * POST: Duplica um post existente.
 * Cria nova cópia com slug original + "-copia" (ou "-copia-2" etc. se já existir).
 * Retorna o slug do novo post.
 */

import type { APIRoute } from 'astro';
import { readPost, writePost, slugExists } from '../../../../utils/post-utils';
import type { PostData } from '../../../../utils/post-utils';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json().catch(() => ({}));
        const { slug } = body;

        if (!slug || typeof slug !== 'string') {
            return new Response(
                JSON.stringify({ success: false, error: 'Slug do post é obrigatório' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const post = await readPost(slug);
        if (!post) {
            return new Response(
                JSON.stringify({ success: false, error: 'Post não encontrado' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        let newSlug = `${post.data.slug}-copia`;
        let counter = 2;
        while (await slugExists(newSlug)) {
            newSlug = `${post.data.slug}-copia-${counter}`;
            counter++;
        }

        const newData: PostData = {
            ...post.data,
            slug: newSlug,
            title: `${post.data.title} (cópia)`,
            publishedDate: undefined, // rascunho
        };

        const success = await writePost(newSlug, newData, post.content);
        if (!success) {
            return new Response(
                JSON.stringify({ success: false, error: 'Erro ao duplicar post' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, slug: newSlug, message: 'Post duplicado como rascunho' }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: unknown) {
        console.error('\x1b[31m✗ [X] Erro ao duplicar post:\x1b[0m', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
