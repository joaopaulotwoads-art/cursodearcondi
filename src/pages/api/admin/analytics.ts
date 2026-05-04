import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { readSingleton } from '../../../utils/singleton-utils';
import crypto from 'node:crypto';

/**
 * Assina um JWT RS256 usando a chave privada da conta de serviço.
 */
function base64url(str: string): string {
    return Buffer.from(str).toString('base64url');
}

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }));

    const signingInput = `${header}.${payload}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccount.private_key).toString('base64url');

    const jwt = `${signingInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Falha ao obter token de acesso');
    }
    return tokenData.access_token;
}

/**
 * Chama a GA4 Data API para obter um relatório.
 */
async function runReport(propertyId: string, accessToken: string, body: object) {
    const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `GA4 API error: ${res.status}`);
    }
    return res.json();
}

export const GET: APIRoute = async ({ url }) => {
    try {
        const days = parseInt(url.searchParams.get('days') || '30');
        const dateRange = `${days}daysAgo`;

        const settings = await getEntry('siteSettings', 'settings').catch(() => null);
        const activeThemeId = (settings?.data?.activeTheme as string) || 'classic';
        const pixels = await readSingleton('pixels', activeThemeId);

        if (!pixels?.googleAnalyticsPropertyId) {
            return json({ success: false, error: 'ID da propriedade GA4 não configurado.' }, 400);
        }
        if (!pixels?.googleServiceAccount) {
            return json({ success: false, error: 'Conta de serviço não configurada.' }, 400);
        }

        let serviceAccount: any;
        try {
            serviceAccount = JSON.parse(pixels.googleServiceAccount);
        } catch {
            return json({ success: false, error: 'Conta de serviço: JSON inválido.' }, 400);
        }

        const accessToken = await getGoogleAccessToken(serviceAccount);
        const propertyId = pixels.googleAnalyticsPropertyId;

        // Buscar métricas principais e top páginas em paralelo
        const [overviewData, pagesData] = await Promise.all([
            runReport(propertyId, accessToken, {
                dateRanges: [{ startDate: dateRange, endDate: 'today' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'totalUsers' },
                    { name: 'screenPageViews' },
                    { name: 'bounceRate' },
                    { name: 'averageSessionDuration' },
                ],
            }),
            runReport(propertyId, accessToken, {
                dateRanges: [{ startDate: dateRange, endDate: 'today' }],
                dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
                metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 10,
            }),
        ]);

        // Parsear métricas gerais
        const metricValues = overviewData?.rows?.[0]?.metricValues || [];
        const overview = {
            sessions: parseInt(metricValues[0]?.value || '0'),
            users: parseInt(metricValues[1]?.value || '0'),
            pageviews: parseInt(metricValues[2]?.value || '0'),
            bounceRate: parseFloat(metricValues[3]?.value || '0'),
            avgSessionDuration: parseFloat(metricValues[4]?.value || '0'),
        };

        // Parsear top páginas
        const topPages = (pagesData?.rows || []).map((row: any) => ({
            path: row.dimensionValues?.[0]?.value || '/',
            title: row.dimensionValues?.[1]?.value || '',
            pageviews: parseInt(row.metricValues?.[0]?.value || '0'),
            sessions: parseInt(row.metricValues?.[1]?.value || '0'),
        }));

        return json({ success: true, overview, topPages, days });

    } catch (error: any) {
        console.error('Analytics API error:', error);
        return json({ success: false, error: error.message }, 500);
    }
};

function json(data: object, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
