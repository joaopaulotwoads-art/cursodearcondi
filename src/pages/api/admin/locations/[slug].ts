/**
 * API /api/admin/locations/[slug]
 *
 * GET    → lê uma localidade pelo slug
 * PUT    → atualiza localidade (ativa/desativa, renomeia)
 * DELETE → remove a localidade
 */

import type { APIRoute } from 'astro';
import { readLocation, writeLocation, deleteLocation } from '../../../../utils/location-utils';

export const GET: APIRoute = async ({ params }) => {
    try {
        const file = await readLocation(params.slug as string);
        if (!file) {
            return new Response(JSON.stringify({ success: false, error: 'Localidade não encontrada' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response(JSON.stringify({ success: true, location: file.data }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
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

        const existing = await readLocation(params.slug as string);
        if (!existing) {
            return new Response(JSON.stringify({ success: false, error: 'Localidade não encontrada' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const updated = { ...existing.data, ...body };

        const success = await writeLocation(params.slug as string, updated);
        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao atualizar localidade' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Localidade atualizada' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao atualizar localidade:\x1b[0m', error);
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

        const success = await deleteLocation(params.slug as string);
        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao deletar localidade' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Localidade removida' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao deletar localidade:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
