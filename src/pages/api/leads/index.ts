/**
 * api/leads/index.ts
 *
 * POST — Endpoint público para receber submissões de formulários do site.
 * Salva o lead em data/leads.json (ou GitHub em produção).
 *
 * Body JSON: { name, email?, message, subject?, phone?, source }
 * source: contato | local-contato | servico-sidebar
 */

import type { APIRoute } from 'astro';
import { createLead } from '../../../utils/leads-utils';

export const POST: APIRoute = async ({ request }) => {
    try {
        if (request.headers.get('Content-Type')?.includes('application/json')) {
            const body = await request.json();
            const name = (body.name || '').trim();
            const email = (body.email || '').trim();
            const message = (body.message || '').trim();
            const subject = (body.subject || '').trim();
            const phone = (body.phone || '').trim();
            const source = (body.source || 'contato').trim() || 'contato';
            const extra = body.extra && typeof body.extra === 'object' ? body.extra : undefined;

            if (!name || !message) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Nome e mensagem são obrigatórios' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            if (!email && !phone) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Informe e-mail ou telefone' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            const lead = await createLead({
                name,
                email: email || undefined,
                message,
                subject: subject || undefined,
                phone: phone || undefined,
                source,
                extra,
            });

            if (!lead) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Erro ao salvar lead' }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
            }

            return new Response(JSON.stringify({ success: true, id: lead.id }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(
            JSON.stringify({ success: false, error: 'Content-Type deve ser application/json' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao criar lead:\x1b[0m', e);
        return new Response(
            JSON.stringify({ success: false, error: 'Erro interno' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
