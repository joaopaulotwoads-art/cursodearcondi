/**
 * API /api/admin/templates
 *
 * GET  → Lista todos os templates disponíveis
 * POST → Aplica um template (recebe { templateId })
 *        Remove todos os serviços, mantém bairros, substitui copy da home e location-template.
 */

import type { APIRoute } from 'astro';
import { listTemplates, readTemplate } from '../../../../utils/template-utils';
import { listServices, deleteService, writeService, type ServiceData } from '../../../../utils/service-utils';
import { writeNicho, type NichoData } from '../../../../utils/niche-utils';
import { readSingleton, writeSingleton } from '../../../../utils/singleton-utils';
import { readLocationTemplate, writeLocationTemplate } from '../../../../utils/location-utils';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
    if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const templates = await listTemplates();
        return new Response(JSON.stringify({ templates }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('\x1b[31m✗ Erro ao listar templates:\x1b[0m', error);
        return new Response(
            JSON.stringify({ error: 'Erro ao listar templates' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let body: { templateId?: string };
    try {
        body = await request.json();
    } catch {
        return new Response(
            JSON.stringify({ error: 'Corpo da requisição inválido' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
    }

    const templateId = body.templateId;
    if (!templateId || typeof templateId !== 'string') {
        return new Response(
            JSON.stringify({ error: 'templateId é obrigatório' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
    }

    const template = await readTemplate(templateId.trim());
    if (!template) {
        return new Response(
            JSON.stringify({ error: `Template "${templateId}" não encontrado` }),
            { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
    }

    try {
        // 1. Remove todos os serviços
        const existingServices = await listServices();
        for (const svc of existingServices) {
            await deleteService(svc.data.slug);
        }

        // 2. Atualiza template de páginas locais
        const okTemplate = await writeLocationTemplate(template.locationTemplateCopy);
        if (!okTemplate) {
            throw new Error('Falha ao salvar location-template');
        }

        // 3. Cria ou atualiza o nicho
        const nichoData: NichoData = {
            name: template.niche.name,
            slug: template.niche.slug,
            icon: template.niche.icon,
            description: template.niche.description,
            color: template.niche.color,
            active: template.niche.active ?? true,
        };
        const okNicho = await writeNicho(template.niche.slug, nichoData);
        if (!okNicho) {
            throw new Error('Falha ao salvar nicho');
        }

        // 4. Cria os novos serviços
        const serviceSlugs: string[] = [];
        for (const svc of template.services) {
            const serviceData: ServiceData = {
                title: svc.title,
                slug: svc.slug,
                shortDescription: svc.shortDescription,
                icon: svc.icon,
                niche: svc.niche,
                active: true,
            };
            const ok = await writeService(svc.slug, serviceData);
            if (ok) serviceSlugs.push(svc.slug);
        }

        // 5. Atualiza a home local: preserva NAP, aplica copy do template, featuredServices, activeTemplateId
        const currentHome = (await readSingleton('home', 'local')) || {};

        const napKeys = [
            'companyName', 'companyPhone', 'companyWhatsapp', 'companyEmail',
            'companyAddress', 'companyCity', 'companyState', 'companyCEP',
        ] as const;
        const preserved: Record<string, unknown> = {};
        for (const k of napKeys) {
            if (currentHome[k] != null) preserved[k] = currentHome[k];
        }
        // Preservar também alguns campos que o usuário pode ter customizado
        const extraPreserve = [
            'heroBackground', 'clients', 'socialTitle', 'socialProofActive',
            'locationTitle', 'locationAddress', 'locationMapEmbed',
            'ctaTitle', 'ctaText', 'ctaButtonText', 'ctaWhatsappMessage',
        ] as const;
        for (const k of extraPreserve) {
            if (currentHome[k] != null && !(template.homeCopy as Record<string, unknown>)[k]) {
                preserved[k] = currentHome[k];
            }
        }

        const newHome = {
            ...preserved,
            ...template.homeCopy,
            servicesTitle: template.homeCopy.servicesTitle,
            servicesSubtitle: template.homeCopy.servicesSubtitle,
            featuredServices: serviceSlugs,
            activeTemplateId: template.id,
        };

        const okHome = await writeSingleton('home', newHome, 'local');
        if (!okHome) {
            throw new Error('Falha ao salvar home local');
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Template "${template.name}" aplicado com sucesso. ${existingServices.length} serviço(s) removido(s), ${serviceSlugs.length} novo(s) criado(s).`,
                templateId: template.id,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (error) {
        console.error('\x1b[31m✗ Erro ao aplicar template:\x1b[0m', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Erro ao aplicar template',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
