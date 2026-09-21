/**
 * API /api/admin/nichos
 *
 * GET  → lista todos os nichos com contagem de serviços
 * POST → cria um novo nicho (requer autenticação)
 */

import type { APIRoute } from 'astro';
import { listNichos, writeNicho, nichoSlugExists, nichoNameToSlug } from '../../../../utils/niche-utils';
import { listServices } from '../../../../utils/service-utils';

export const GET: APIRoute = async () => {
    try {
        const [nichos, services] = await Promise.all([listNichos(), listServices()]);

        const result = nichos.map(n => {
            const nicheServices = services.filter(s => s.data.niche === n.data.slug);
            return {
                ...n.data,
                filename:      n.filename,
                serviceCount:  nicheServices.length,
                activeServices: nicheServices.filter(s => s.data.active !== false).length,
            };
        });

        return new Response(JSON.stringify({ success: true, nichos: result }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
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
        const { name, slug: rawSlug, icon, description, color } = body;

        if (!name) {
            return new Response(JSON.stringify({ success: false, error: 'Nome é obrigatório' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const slug = rawSlug || nichoNameToSlug(name);
        const exists = await nichoSlugExists(slug);
        if (exists) {
            return new Response(JSON.stringify({ success: false, error: 'Um nicho com este nome já existe' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const ok = await writeNicho(slug, {
            name,
            slug,
            icon:        icon        || '📦',
            description: description || undefined,
            color:       color       || '#6366f1',
            active:      true,
        });

        if (!ok) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao criar nicho' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Nicho criado!', slug }), {
            status: 201, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao criar nicho:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
