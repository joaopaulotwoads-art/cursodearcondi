import type { APIRoute } from 'astro';

/**
 * api/admin/posts/[slug].ts
 * 
 * API route para operações em um post específico (ler, atualizar, deletar).
 * 
 * GET: Retorna dados do post
 * PUT: Atualiza o post
 * DELETE: Deleta o post
 */
import { readPost, writePost, deletePost, slugExists, generateSlug } from '../../../../utils/post-utils';
import type { PostData } from '../../../../utils/post-utils';
import { isGitHubConfigured } from '../../../../utils/github-api';

const SEO_SCHEMA_VALUES = ['auto', 'blogPosting', 'articleItemList', 'none'] as const;

function parseSeoSchema(v: unknown): PostData['seoSchema'] {
    if (typeof v !== 'string') return undefined;
    return (SEO_SCHEMA_VALUES as readonly string[]).includes(v) ? (v as PostData['seoSchema']) : undefined;
}

export const GET: APIRoute = async ({ params }) => {
    try {
        const { slug } = params;
        const normalizedSlug = generateSlug(String(slug || ''));
        
        if (!slug || !normalizedSlug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug é obrigatório',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const post = await readPost(String(slug)) || await readPost(normalizedSlug);
        
        if (!post) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Post não encontrado',
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            post,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao ler post:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ params, request }) => {
    try {
        if (process.env.VERCEL && !isGitHubConfigured()) {
            return new Response(JSON.stringify({
                success: false,
                error:
                    'Ambiente Vercel: configure GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO (Settings → Environment Variables) e faça redeploy para salvar posts pelo painel.',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { slug } = params;
        const rawCurrentSlug = String(slug || '');
        const body = await request.json();
        const { title, newSlug, author, category, publishedDate, thumbnail, metaTitle, metaDescription, metaImage, content, contentFormat, seoSchema } = body;
        const normalizedCurrentSlug = generateSlug(rawCurrentSlug);
        const normalizedNewSlug = newSlug ? generateSlug(String(newSlug)) : '';
        
        if (!slug || !normalizedCurrentSlug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug é obrigatório',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Se mudou o slug, verificar se o novo já existe
        if (normalizedNewSlug && normalizedNewSlug !== normalizedCurrentSlug) {
            const exists = await slugExists(normalizedNewSlug, normalizedCurrentSlug);
            if (exists) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Um post com este slug já existe',
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        
        const finalSlug = normalizedNewSlug || normalizedCurrentSlug;
        
        // Preparar dados
        const postData: PostData = {
            title: title || '',
            slug: finalSlug,
            author: author || undefined,
            category: category || undefined,
            publishedDate: publishedDate || undefined,
            thumbnail: thumbnail || undefined,
            metaTitle: metaTitle || undefined,
            metaDescription: metaDescription || undefined,
            metaImage: metaImage || undefined,
            contentFormat: contentFormat === 'html' ? 'html' : undefined,
            seoSchema: parseSeoSchema(seoSchema),
        };
        
        // Se mudou o slug, deletar arquivo antigo
        if (finalSlug !== normalizedCurrentSlug) {
            await deletePost(rawCurrentSlug);
            if (rawCurrentSlug !== normalizedCurrentSlug) {
                await deletePost(normalizedCurrentSlug);
            }
        }
        
        const wrote = await writePost(finalSlug, postData, content || '');
        if (!wrote.ok) {
            return new Response(JSON.stringify({
                success: false,
                error: wrote.error || 'Erro ao atualizar post',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Post atualizado com sucesso',
            slug: finalSlug,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao atualizar post:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const DELETE: APIRoute = async ({ params }) => {
    try {
        const { slug } = params;
        
        if (!slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug é obrigatório',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const success = await deletePost(slug);
        
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao deletar post',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Post deletado com sucesso',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao deletar post:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
