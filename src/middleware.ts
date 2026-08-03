import { defineMiddleware } from 'astro:middleware';
import { verifySession, SESSION_COOKIE } from './utils/auth-utils';

const ADMIN_ONLY_PATHS = [
    '/admin/pixels',
    '/admin/analytics',
    '/admin/import',
    '/api/admin/singletons/pixels',
    '/api/admin/analytics',
    '/api/admin/import',
];

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // Só intercepta rotas do admin
    const isAdminUI  = pathname.startsWith('/admin');
    const isAdminAPI = pathname.startsWith('/api/admin');
    if (!isAdminUI && !isAdminAPI) return next();

    // Rotas públicas — nunca precisam de login
    if (
        pathname === '/admin/login' ||
        pathname === '/admin/setup' ||
        pathname.startsWith('/admin/login/') ||
        pathname.startsWith('/admin/setup/') ||
        pathname.startsWith('/api/admin/auth/')   // login, logout, setup
    ) {
        return next();
    }

    // Verificar cookie de sessão
    const token = context.cookies.get(SESSION_COOKIE)?.value ?? '';
    const user  = token ? verifySession(token) : null;

    if (!user) {
        // Limpar cookie inválido
        if (token) context.cookies.delete(SESSION_COOKIE, { path: '/' });
        return isAdminAPI
            ? new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
              })
            : context.redirect('/admin/login');
    }

    // Controle por role (usando o role gravado na sessão)
    const isAdminOnly = ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p));
    if (isAdminOnly && user.adminRole !== 'admin') {
        return isAdminAPI
            ? new Response(JSON.stringify({ success: false, error: 'Permissão insuficiente' }), {
                status: 403, headers: { 'Content-Type': 'application/json' },
              })
            : context.redirect('/admin?error=permission');
    }

    // Expor usuário para as páginas/componentes
    context.locals.user = {
        slug:      user.slug,
        name:      user.name,
        adminRole: user.adminRole,
    };

    return next();
});
