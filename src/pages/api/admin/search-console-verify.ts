/**
 * GET /api/admin/search-console-verify?themeId=cursodear
 * Valida JSON da conta de serviço e lista propriedades no Search Console (API v3).
 */
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { readSingleton } from '../../../utils/singleton-utils';
import { getGoogleAccessTokenFromServiceAccountKey } from '../../../utils/google-service-account-token';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function json(data: object, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export const GET: APIRoute = async ({ url }) => {
    try {
        const themeParam = url.searchParams.get('themeId')?.trim();
        const settings = await getEntry('siteSettings', 'settings').catch(() => null);
        const activeTheme = String(settings?.data?.activeTheme || 'classic').trim() || 'classic';
        const themeId = themeParam || activeTheme;

        const pixels = await readSingleton('pixels', themeId);
        const raw = String(
            pixels?.googleSearchConsoleServiceAccount || pixels?.googleServiceAccount || ''
        ).trim();

        if (!raw) {
            return json(
                {
                    success: false,
                    error: 'Cole o JSON da conta de serviço (secção Analytics ou Search Console no painel Pixels).',
                },
                400
            );
        }

        let sa: { client_email: string; private_key: string };
        try {
            sa = JSON.parse(raw);
        } catch {
            return json({ success: false, error: 'JSON inválido.' }, 400);
        }
        if (!sa.client_email || !sa.private_key) {
            return json({ success: false, error: 'JSON incompleto: precisa de client_email e private_key.' }, 400);
        }

        const accessToken = await getGoogleAccessTokenFromServiceAccountKey(sa, SCOPE);

        const res = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg =
                (data as { error?: { message?: string } })?.error?.message ||
                `Search Console API: HTTP ${res.status}`;
            return json({ success: false, error: msg }, 400);
        }

        const entries = (data as { siteEntry?: { siteUrl?: string }[] }).siteEntry || [];
        const sites = entries.map((e) => e.siteUrl).filter(Boolean) as string[];

        return json({
            success: true,
            sites,
            siteCount: sites.length,
            serviceAccountEmail: sa.client_email,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro desconhecido';
        console.error('search-console-verify:', e);
        return json({ success: false, error: message }, 500);
    }
};
