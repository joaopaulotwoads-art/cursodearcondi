/**
 * api/admin/leads/[id].ts
 *
 * DELETE — Remove um lead pelo id (protegido, requer login admin/editor).
 */

import type { APIRoute } from 'astro';
import { deleteLead } from '../../../../utils/leads-utils';

export const DELETE: APIRoute = async ({ params, locals }) => {
    if (!locals.user) {
        return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const id = params.id;
    if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'ID obrigatório' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const ok = await deleteLead(id);
        if (!ok) {
            return new Response(JSON.stringify({ success: false, error: 'Lead não encontrado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao excluir lead:\x1b[0m', e);
        return new Response(
            JSON.stringify({ success: false, error: 'Erro ao excluir lead' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
