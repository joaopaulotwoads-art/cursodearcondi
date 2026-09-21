/**
 * API /api/admin/services — Listagem e criação de serviços
 *
 * GET  → lista todos os serviços
 * POST → cria um novo serviço (requer autenticação)
 */

import type { APIRoute } from 'astro';
import { listServices, writeService, serviceSlugExists } from '../../../../utils/service-utils';

export const GET: APIRoute = async () => {
    try {
        const services = await listServices();
        return new Response(JSON.stringify({
            success: true,
            services: services.map(s => ({ ...s.data, filename: s.filename })),
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        if (!locals.user) {
            return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const { title, slug, icon, shortDescription, heroTitle, heroSubtitle, description, benefits, metaTitle, metaDescription, active, image, thumbnail } = body;

        if (!title || !slug) {
            return new Response(JSON.stringify({ success: false, error: 'Título e slug são obrigatórios' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const exists = await serviceSlugExists(slug);
        if (exists) {
            return new Response(JSON.stringify({ success: false, error: 'Um serviço com este slug já existe' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const success = await writeService(slug, {
            title, slug,
            icon: icon || undefined,
            shortDescription: shortDescription || undefined,
            heroTitle: heroTitle || undefined,
            heroSubtitle: heroSubtitle || undefined,
            description: description || undefined,
            benefits: benefits?.length > 0 ? benefits : undefined,
            metaTitle: metaTitle || undefined,
            metaDescription: metaDescription || undefined,
            active: active !== false,
            image: image || undefined,
            thumbnail: thumbnail || undefined,
        });

        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao criar serviço' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Serviço criado com sucesso', slug }), {
            status: 201, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao criar serviço:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
