/**
 * api/admin/leads/index.ts
 *
 * GET — Lista todos os leads (protegido, requer login admin/editor).
 */

import type { APIRoute } from 'astro';
import { listLeads } from '../../../../utils/leads-utils';

export const GET: APIRoute = async ({ locals }) => {
    if (!locals.user) {
        return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const leads = await listLeads();
        return new Response(JSON.stringify({ success: true, leads }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao listar leads:\x1b[0m', e);
        return new Response(
            JSON.stringify({ success: false, error: 'Erro ao carregar leads' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
