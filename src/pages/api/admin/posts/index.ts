import type { APIRoute } from 'astro';
import { listPosts, writePost, slugExists, generateSlug } from '../../../../utils/post-utils';
import type { PostData } from '../../../../utils/post-utils';

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
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao listar posts:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { title, slug, author, category, publishedDate, thumbnail, metaTitle, metaDescription, metaImage, content } = body;
        
        // Validações
        if (!title || !slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Título e slug são obrigatórios',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Verificar se slug já existe
        const exists = await slugExists(slug);
        if (exists) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Um post com este slug já existe',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Preparar dados
        const postData: PostData = {
            title,
            slug,
            author: author || undefined,
            category: category || undefined,
            publishedDate: publishedDate || undefined,
            thumbnail: thumbnail || undefined,
            metaTitle: metaTitle || undefined,
            metaDescription: metaDescription || undefined,
            metaImage: metaImage || undefined,
        };
        
        // Escrever arquivo
        const success = await writePost(slug, postData, content || '');
        
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao criar post',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Post criado com sucesso',
            slug,
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao criar post:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
