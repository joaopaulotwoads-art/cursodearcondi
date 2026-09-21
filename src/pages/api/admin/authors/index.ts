import type { APIRoute } from 'astro';
import { listAuthors, writeAuthor, authorSlugExists } from '../../../../utils/author-utils';
import { hashPassword } from '../../../../utils/auth-utils';

function safeAuthor(data: any) {
    const { adminPasswordHash: _, ...rest } = data;
    return rest;
}

export const GET: APIRoute = async () => {
    try {
        const authors = await listAuthors();
        return new Response(JSON.stringify({
            success: true,
            authors: authors.map(a => ({ ...safeAuthor(a.data), filename: a.filename })),
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const body = await request.json();
        const { name, slug, role, avatar, bio, email, adminRole, newPassword } = body;

        if (!name || !slug) {
            return new Response(JSON.stringify({ success: false, error: 'Nome e slug são obrigatórios' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const exists = await authorSlugExists(slug);
        if (exists) {
            return new Response(JSON.stringify({ success: false, error: 'Um autor com este slug já existe' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Apenas admins podem criar contas com acesso ao painel
        const isAdmin = locals.user?.adminRole === 'admin';
        const finalAdminRole = isAdmin ? (adminRole || 'none') : 'none';
        const passwordHash = (isAdmin && newPassword) ? hashPassword(newPassword) : undefined;

        const success = await writeAuthor(slug, {
            name, slug, role: role || '', avatar, bio: bio || '',
            email: email || undefined,
            adminRole: finalAdminRole as any,
            adminPasswordHash: passwordHash,
        });

        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao criar autor' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Autor criado com sucesso', slug }), {
            status: 201, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
