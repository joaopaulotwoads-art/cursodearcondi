import type { APIRoute } from 'astro';
import { readCategory, writeCategory, deleteCategory, categorySlugExists } from '../../../../utils/category-utils';

export const GET: APIRoute = async ({ params }) => {
    try {
        const { slug } = params;
        if (!slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const category = await readCategory(slug);
        if (!category) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Categoria não encontrada',
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            category: category.data,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao ler categoria:', error);
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
        if (!slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const body = await request.json();
        const { name, newSlug } = body;
        
        if (!name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Nome é obrigatório',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const finalSlug = newSlug || slug;
        if (newSlug && newSlug !== slug) {
            const exists = await categorySlugExists(newSlug, slug);
            if (exists) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Uma categoria com este slug já existe',
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        
        const success = await writeCategory(finalSlug, { name, slug: finalSlug });
        
        if (newSlug && newSlug !== slug) {
            await deleteCategory(slug);
        }
        
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao atualizar categoria',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Categoria atualizada com sucesso',
            slug: finalSlug,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao atualizar categoria:', error);
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
                error: 'Slug não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const success = await deleteCategory(slug);
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao deletar categoria',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Categoria deletada com sucesso',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao deletar categoria:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
