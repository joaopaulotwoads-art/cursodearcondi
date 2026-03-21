/**
 * API /api/admin/location-template
 *
 * GET → retorna o template atual de páginas locais
 * PUT → atualiza o template (requer autenticação)
 *
 * O template usa variáveis: {cidade}, {estado}, {servico}, {empresa}, {telefone}
 */

import type { APIRoute } from 'astro';
import { readLocationTemplate, writeLocationTemplate } from '../../../utils/location-utils';

export const GET: APIRoute = async () => {
    try {
        const template = await readLocationTemplate();
        return new Response(JSON.stringify({ success: true, template }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        if (!locals.user) {
            return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const { heroTitle, heroSubtitle, pageContent, benefits, metaTitle, metaDescription } = body;

        const success = await writeLocationTemplate({
            heroTitle:       heroTitle       || undefined,
            heroSubtitle:    heroSubtitle    || undefined,
            pageContent:     pageContent     || undefined,
            benefits:        benefits?.length > 0 ? benefits : undefined,
            metaTitle:       metaTitle       || undefined,
            metaDescription: metaDescription || undefined,
        });

        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao salvar template' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Template salvo com sucesso' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao salvar template:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
