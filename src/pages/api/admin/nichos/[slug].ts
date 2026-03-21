/**
 * API /api/admin/nichos/[slug]
 *
 * GET    → lê um nicho com seus serviços
 * PUT    → atualiza o nicho
 * DELETE → remove o nicho (NÃO remove os serviços vinculados)
 */

import type { APIRoute } from 'astro';
import { readNicho, writeNicho, deleteNicho } from '../../../../utils/niche-utils';
import { listServicesByNiche } from '../../../../utils/service-utils';

export const GET: APIRoute = async ({ params }) => {
    try {
        const file = await readNicho(params.slug as string);
        if (!file) {
            return new Response(JSON.stringify({ success: false, error: 'Nicho não encontrado' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }
        const services = await listServicesByNiche(params.slug as string);
        return new Response(JSON.stringify({
            success: true,
            nicho:    file.data,
            services: services.map(s => s.data),
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
    try {
        if (!locals.user) {
            return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const existing = await readNicho(params.slug as string);
        if (!existing) {
            return new Response(JSON.stringify({ success: false, error: 'Nicho não encontrado' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body    = await request.json();
        const updated = { ...existing.data, ...body };
        const ok      = await writeNicho(params.slug as string, updated);

        if (!ok) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao atualizar nicho' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Nicho atualizado' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao atualizar nicho:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
    try {
        if (!locals.user) {
            return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const ok = await deleteNicho(params.slug as string);
        if (!ok) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao deletar nicho' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Nicho removido' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao deletar nicho:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
