import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../../utils/auth-utils';

// Suporta tanto GET (link direto) quanto POST (form)
export const GET: APIRoute  = handler;
export const POST: APIRoute = handler;

async function handler({ cookies }: Parameters<APIRoute>[0]) {
    // Apagar o cookie de sessão com as mesmas opções usadas na criação
    cookies.delete(SESSION_COOKIE, { path: '/' });

    return new Response(null, {
        status: 302,
        headers: { Location: '/admin/login' },
    });
}
