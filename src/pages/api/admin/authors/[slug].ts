import type { APIRoute } from 'astro';
import { readAuthor, writeAuthor, deleteAuthor, authorSlugExists } from '../../../../utils/author-utils';
import { hashPassword } from '../../../../utils/auth-utils';

function safeAuthor(data: any) {
    const { adminPasswordHash: _, ...rest } = data;
    return rest;
}

export const GET: APIRoute = async ({ params }) => {
    try {
        const { slug } = params;
        if (!slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const author = await readAuthor(slug);
        if (!author) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Autor não encontrado',
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            author: safeAuthor(author.data),
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao ler autor:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
    try {
        const { slug } = params;
        if (!slug) {
            return new Response(JSON.stringify({ success: false, error: 'Slug não fornecido' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const { name, newSlug, role, avatar, bio, email, adminRole, newPassword } = body;

        if (!name) {
            return new Response(JSON.stringify({ success: false, error: 'Nome é obrigatório' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const finalSlug = newSlug || slug;
        if (newSlug && newSlug !== slug) {
            const exists = await authorSlugExists(newSlug, slug);
            if (exists) {
                return new Response(JSON.stringify({ success: false, error: 'Um autor com este slug já existe' }), {
                    status: 400, headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        const isAdmin = locals.user?.adminRole === 'admin';

        // Preservar hash existente se não estiver mudando a senha
        let finalPasswordHash: string | undefined;
        if (isAdmin && newPassword) {
            finalPasswordHash = hashPassword(newPassword);
        } else {
            // Ler o hash atual do arquivo para preservar
            const existing = await readAuthor(slug);
            finalPasswordHash = existing?.data.adminPasswordHash;
        }

        const success = await writeAuthor(finalSlug, {
            name,
            slug: finalSlug,
            role: role || '',
            avatar,
            bio: bio || '',
            email: email || undefined,
            adminRole: isAdmin ? (adminRole || 'none') : undefined,
            adminPasswordHash: finalPasswordHash,
        });

        if (newSlug && newSlug !== slug) await deleteAuthor(slug);

        if (!success) {
            return new Response(JSON.stringify({ success: false, error: 'Erro ao atualizar autor' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Autor atualizado com sucesso', slug: finalSlug }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao atualizar autor:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
    try {
        const { slug } = params;
        if (!slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Slug não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (locals.user?.slug === slug) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Você não pode excluir o próprio usuário logado. Isso o impediria de acessar o sistema.',
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const success = await deleteAuthor(slug);
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao deletar autor',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Autor deletado com sucesso',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao deletar autor:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
