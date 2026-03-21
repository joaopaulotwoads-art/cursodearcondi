/**
 * API /api/admin/locations — Listagem e criação de localidades
 *
 * GET  → lista todas as localidades
 * POST → cria uma ou várias localidades novas (bulk import suportado)
 *
 * Body do POST:
 *   Criação única: { name, slug, state, active? }
 *   Bulk import:   { locations: [{ name, slug, state }] }
 */

import type { APIRoute } from 'astro';
import { listLocations, writeLocation, locationSlugExists, cityNameToSlug } from '../../../../utils/location-utils';

export const GET: APIRoute = async () => {
    try {
        const locations = await listLocations();
        return new Response(JSON.stringify({
            success: true,
            locations: locations.map(l => ({ ...l.data, filename: l.filename })),
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

        // ── Bulk import ──────────────────────────────────────────────
        if (body.locations && Array.isArray(body.locations)) {
            const results: { slug: string; success: boolean; error?: string }[] = [];

            for (const loc of body.locations) {
                if (!loc.name || !loc.state) {
                    results.push({ slug: loc.slug || loc.name, success: false, error: 'Nome e estado são obrigatórios' });
                    continue;
                }
                const city = loc.city || loc.name;
                const citySlug = loc.citySlug || cityNameToSlug(city);
                const simpleSlug = cityNameToSlug(loc.name);
                // Bairros: usar cidade-bairro só se slug simples já existir (evita colisão)
                const slug = loc.slug || (loc.type === 'bairro' && citySlug && (await locationSlugExists(simpleSlug))
                    ? `${citySlug}-${simpleSlug}`
                    : simpleSlug);
                const exists = await locationSlugExists(slug);
                if (exists) {
                    results.push({ slug, success: false, error: 'Localidade já existe' });
                    continue;
                }
                const ok = await writeLocation(slug, {
                    name: loc.name,
                    slug,
                    state: loc.state.toUpperCase(),
                    active: loc.active !== false,
                    ...(city && { city }),
                    ...(citySlug && { citySlug }),
                    ...(loc.type && { type: loc.type }),
                });
                results.push({ slug, success: ok });
            }

            const created = results.filter(r => r.success).length;
            return new Response(JSON.stringify({
                success: true,
                message: `${created} localidade(s) criada(s)`,
                results,
            }), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }

        // ── Criação única ────────────────────────────────────────────
        const { name, slug: rawSlug, state, active, city, citySlug, type } = body;

        if (!name || !state) {
            return new Response(JSON.stringify({ success: false, error: 'Nome e estado são obrigatórios' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const cityName = city || name;
        const citySlugVal = citySlug || cityNameToSlug(cityName);
        const simpleSlug = cityNameToSlug(name);
        const slug = rawSlug || (
            (type === 'bairro' && cityName && (await locationSlugExists(simpleSlug)))
                ? `${citySlugVal}-${simpleSlug}`
                : simpleSlug
        );
        const exists = await locationSlugExists(slug);
        if (exists) {
            return new Response(JSON.stringify({ success: false, error: 'Uma localidade com este slug já existe' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const success = await writeLocation(slug, {
            name,
            slug,
            state: state.toUpperCase(),
            active: active !== false,
            ...(city     && { city }),
            ...(citySlug && { citySlug }),
            ...(type     && { type }),
        });

        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao criar localidade' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Localidade criada', slug }), {
            status: 201, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao criar localidade:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
