/**
 * api/setup-auth.ts
 *
 * POST — Valida a senha da página /setup e define cookie de acesso.
 * Usa SETUP_PAGE_PASSWORD nas variáveis de ambiente.
 * Se a variável não estiver definida, a página /setup fica aberta (sem proteção).
 */

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';

const COOKIE_NAME = 'cnx_setup_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

const SETUP_SALT = 'cnx_setup_v1';

function getToken(secret: string): string {
    return crypto.createHmac('sha256', secret).update(SETUP_SALT).digest('hex');
}

export const POST: APIRoute = async ({ request, cookies }) => {
    const secret = process.env.SETUP_PAGE_PASSWORD;
    if (!secret || secret.trim() === '') {
        return new Response(
            JSON.stringify({ success: false, error: 'Proteção por senha não configurada' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = await request.json();
        const password = (body?.password || '').trim();

        if (!password) {
            return new Response(
                JSON.stringify({ success: false, error: 'Informe a senha' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (password !== secret) {
            return new Response(
                JSON.stringify({ success: false, error: 'Senha incorreta' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const token = getToken(secret);
        cookies.set(COOKIE_NAME, token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE,
            secure: import.meta.env.PROD,
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('\x1b[31m✗ Erro em setup-auth:\x1b[0m', e);
        return new Response(
            JSON.stringify({ success: false, error: 'Erro ao validar senha' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
