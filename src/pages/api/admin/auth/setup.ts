import type { APIRoute } from 'astro';
import { listAuthors, writeAuthor } from '../../../../utils/author-utils';
import { hashPassword, createSession, SESSION_COOKIE, COOKIE_OPTIONS } from '../../../../utils/auth-utils';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    // Se já existe admin, negar
    const authors = await listAuthors();
    const hasAdmin = authors.some(a => a.data.adminRole === 'admin' && a.data.adminPasswordHash);
    if (hasAdmin) return redirect('/admin/login?error=exists');

    const form = await request.formData();
    const name            = (form.get('name')            as string || '').trim();
    const email           = (form.get('email')           as string || '').trim().toLowerCase();
    const password        = (form.get('password')        as string || '');
    const confirmPassword = (form.get('confirmPassword') as string || '');

    if (!name || !email || !password) return redirect('/admin/setup?error=required');
    if (password.length < 6)          return redirect('/admin/setup?error=short');
    if (password !== confirmPassword)  return redirect('/admin/setup?error=mismatch');

    const slug = email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'admin';

    const finalSlug = authors.some(a => a.data.slug === slug) ? `${slug}-admin` : slug;

    const saved = await writeAuthor(finalSlug, {
        name,
        slug: finalSlug,
        email,
        role: 'Administrador',
        bio: '',
        adminRole: 'admin',
        adminPasswordHash: hashPassword(password),
    });

    if (!saved) {
        console.error('❌ Setup: falha ao salvar autor. Verifique se GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO estão configurados na Vercel.');
        return redirect('/admin/setup?error=save_failed');
    }

    const token = createSession({ slug: finalSlug, name, adminRole: 'admin' });
    cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
    return redirect('/admin');
};
