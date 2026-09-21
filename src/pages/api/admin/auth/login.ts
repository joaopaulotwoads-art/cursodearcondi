import type { APIRoute } from 'astro';
import { listAuthors } from '../../../../utils/author-utils';
import { verifyPassword, createSession, SESSION_COOKIE, COOKIE_OPTIONS } from '../../../../utils/auth-utils';

// E-mail e slug da conta padrão criada no template
const DEFAULT_ADMIN_EMAIL = 'admin@admin.com';
const DEFAULT_ADMIN_SLUG  = 'admin';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const form = await request.formData();
    const email    = (form.get('email')    as string || '').trim().toLowerCase();
    const password = (form.get('password') as string || '');

    if (!email || !password) {
        return redirect('/admin/login?error=invalid');
    }

    const authors = await listAuthors();
    const author = authors.find(
        a => a.data.email?.toLowerCase() === email &&
             (a.data.adminRole === 'admin' || a.data.adminRole === 'editor')
    );

    if (!author) return redirect('/admin/login?error=invalid');
    if (!author.data.adminPasswordHash) return redirect('/admin/login?error=inactive');

    // Para a conta padrão do template, aceita ADMIN_SECRET como senha
    // (o aluno define ADMIN_SECRET na Vercel e usa o mesmo valor para logar)
    const adminSecret = process.env.ADMIN_SECRET;
    const isDefaultAccount =
        author.data.slug  === DEFAULT_ADMIN_SLUG ||
        author.data.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL;

    const passwordOk =
        verifyPassword(password, author.data.adminPasswordHash) ||
        (isDefaultAccount && adminSecret && password === adminSecret);

    if (!passwordOk) {
        return redirect('/admin/login?error=invalid');
    }

    const token = createSession({
        slug: author.data.slug,
        name: author.data.name,
        adminRole: author.data.adminRole as 'admin' | 'editor',
    });

    cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
    return redirect('/admin');
};
