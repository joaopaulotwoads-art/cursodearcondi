import type { APIRoute } from 'astro';
import { listCategories, writeCategory, categorySlugExists } from '../../../../utils/category-utils';

export const GET: APIRoute = async () => {
    try {
        const categories = await listCategories();
        return new Response(JSON.stringify({
            success: true,
            categories: categories.map(c => ({
                ...c.data,
                filename: c.filename,
            })),
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao listar categorias:', error);
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
        const { name, slug } = body;
        
        if (!name || !slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Nome e slug são obrigatórios',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const exists = await categorySlugExists(slug);
        if (exists) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Uma categoria com este slug já existe',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const success = await writeCategory(slug, { name, slug });
        
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao criar categoria',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Categoria criada com sucesso',
            slug,
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao criar categoria:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
