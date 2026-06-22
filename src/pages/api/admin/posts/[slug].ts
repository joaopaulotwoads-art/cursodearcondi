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
import { readPost, writePost, deletePost, slugExists } from '../../../../utils/post-utils';
import type { PostData } from '../../../../utils/post-utils';

export const GET: APIRoute = async ({ params }) => {
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
        
        const post = await readPost(slug);
        
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
        const { slug } = params;
        const body = await request.json();
        const { title, newSlug, author, category, publishedDate, thumbnail, metaTitle, metaDescription, metaImage, content } = body;
        
        if (!slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug é obrigatório',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Se mudou o slug, verificar se o novo já existe
        if (newSlug && newSlug !== slug) {
            const exists = await slugExists(newSlug, slug);
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
        
        const finalSlug = newSlug || slug;
        
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
        };
        
        // Se mudou o slug, deletar arquivo antigo
        if (newSlug && newSlug !== slug) {
            await deletePost(slug);
        }
        
        // Escrever arquivo
        const success = await writePost(finalSlug, postData, content || '');
        
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao atualizar post',
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
