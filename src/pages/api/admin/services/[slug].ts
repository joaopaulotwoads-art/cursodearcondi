/**
 * API /api/admin/services/[slug] — CRUD de serviço individual
 *
 * GET    → lê um serviço pelo slug
 * PUT    → atualiza um serviço
 * DELETE → remove um serviço
 */

import type { APIRoute } from 'astro';
import { readService, writeService, deleteService, serviceSlugExists } from '../../../../utils/service-utils';

export const GET: APIRoute = async ({ params }) => {
    try {
        const { slug } = params;
        if (!slug) {
            return new Response(JSON.stringify({ success: false, error: 'Slug não fornecido' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const service = await readService(slug);
        if (!service) {
            return new Response(JSON.stringify({ success: false, error: 'Serviço não encontrado' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, service: service.data }), {
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

        const { slug } = params;
        if (!slug) {
            return new Response(JSON.stringify({ success: false, error: 'Slug não fornecido' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Lê o serviço existente para fazer merge (partial update)
        const existing = await readService(slug);
        if (!existing) {
            return new Response(JSON.stringify({ success: false, error: 'Serviço não encontrado' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const {
            title, newSlug, icon, shortDescription, heroTitle, heroSubtitle,
            description, benefits, metaTitle, metaDescription, active, image, thumbnail,
            outline, generatedContent, contentGeneratedAt, niche,
        } = body;

        const finalSlug = newSlug || slug;
        if (newSlug && newSlug !== slug) {
            const exists = await serviceSlugExists(newSlug, slug);
            if (exists) {
                return new Response(JSON.stringify({ success: false, error: 'Um serviço com este slug já existe' }), {
                    status: 400, headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // Merge: mantém valores existentes, sobrescreve apenas os campos enviados
        const merged = {
            ...existing.data,
            slug: finalSlug,
            ...(title              !== undefined && { title }),
            ...(niche              !== undefined && { niche: niche || undefined }),
            ...(icon               !== undefined && { icon: icon || undefined }),
            ...(shortDescription   !== undefined && { shortDescription: shortDescription || undefined }),
            ...(heroTitle          !== undefined && { heroTitle: heroTitle || undefined }),
            ...(heroSubtitle       !== undefined && { heroSubtitle: heroSubtitle || undefined }),
            ...(description        !== undefined && { description: description || undefined }),
            ...(benefits           !== undefined && { benefits: benefits?.length > 0 ? benefits : undefined }),
            ...(metaTitle          !== undefined && { metaTitle: metaTitle || undefined }),
            ...(metaDescription    !== undefined && { metaDescription: metaDescription || undefined }),
            ...(active             !== undefined && { active: active !== false }),
            ...(image              !== undefined && { image: image || undefined }),
            ...(thumbnail          !== undefined && { thumbnail: thumbnail || undefined }),
            ...(outline            !== undefined && { outline: outline?.length > 0 ? outline : undefined }),
            ...(generatedContent   !== undefined && { generatedContent: generatedContent || undefined }),
            ...(contentGeneratedAt !== undefined && { contentGeneratedAt: contentGeneratedAt || undefined }),
        };

        const success = await writeService(finalSlug, merged);

        if (newSlug && newSlug !== slug) {
            await deleteService(slug);
        }

        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao atualizar serviço' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Serviço atualizado', slug: finalSlug }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao atualizar serviço:\x1b[0m', error);
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

        const { slug } = params;
        if (!slug) {
            return new Response(JSON.stringify({ success: false, error: 'Slug não fornecido' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const success = await deleteService(slug);
        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao deletar serviço' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Serviço deletado com sucesso' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao deletar serviço:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
