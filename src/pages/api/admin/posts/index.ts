import type { APIRoute } from 'astro';
import { listPosts, writePost, slugExists, generateSlug } from '../../../../utils/post-utils';
import type { PostData } from '../../../../utils/post-utils';
import { isGitHubConfigured } from '../../../../utils/github-api';

const SEO_SCHEMA_VALUES = ['auto', 'blogPosting', 'articleItemList', 'none'] as const;

function parseSeoSchema(v: unknown): PostData['seoSchema'] {
    if (typeof v !== 'string') return undefined;
    return (SEO_SCHEMA_VALUES as readonly string[]).includes(v) ? (v as PostData['seoSchema']) : undefined;
}

/**
 * api/admin/posts/index.ts
 * 
 * API route para listar todos os posts e criar novos posts.
 * 
 * GET: Retorna lista de todos os posts
 * POST: Cria um novo post
 */

export const GET: APIRoute = async () => {
    try {
        const posts = await listPosts();
        
        // Ordenar por data de publicação (mais recentes primeiro)
        const sortedPosts = posts.sort((a, b) => {
            const dateA = a.data.publishedDate ? new Date(a.data.publishedDate).getTime() : 0;
            const dateB = b.data.publishedDate ? new Date(b.data.publishedDate).getTime() : 0;
            return dateB - dateA;
        });
        
        return new Response(JSON.stringify({
            success: true,
            posts: sortedPosts,
            count: sortedPosts.length,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao listar posts:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        if (process.env.VERCEL && !isGitHubConfigured()) {
            return new Response(JSON.stringify({
                success: false,
                error:
                    'Ambiente Vercel: configure GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO (Settings → Environment Variables) e faça redeploy para salvar posts pelo painel.',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });
        }

        const body = await request.json();
        const { title, slug, author, category, publishedDate, thumbnail, metaTitle, metaDescription, metaImage, content, contentFormat, seoSchema } = body;
        const normalizedSlug = generateSlug(String(slug || ''));
        
        // Validações
        if (!title || !normalizedSlug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Título e slug são obrigatórios',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });
        }
        
        // Verificar se slug já existe
        const exists = await slugExists(normalizedSlug);
        if (exists) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Um post com este slug já existe',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });
        }
        
        // Preparar dados
        const postData: PostData = {
            title,
            slug: normalizedSlug,
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
        
        const wrote = await writePost(normalizedSlug, postData, content || '');
        if (!wrote.ok) {
            return new Response(JSON.stringify({
                success: false,
                error: wrote.error || 'Erro ao criar post',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Post criado com sucesso',
            slug: normalizedSlug,
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao criar post:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    }
};
