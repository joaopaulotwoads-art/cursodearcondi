import type { APIRoute } from 'astro';
import { readSingleton, writeSingleton } from '../../../../utils/singleton-utils';
import { getEntry } from 'astro:content';

/**
 * Obtém o tema ativo
 */
async function getActiveThemeId(): Promise<string> {
    try {
        const settings = await getEntry('siteSettings', 'settings');
        return settings?.data?.activeTheme || 'classic';
    } catch (error) {
        return 'classic';
    }
}

export const GET: APIRoute = async ({ params, url }) => {
    try {
        const { name } = params;
        if (!name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Nome do singleton não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Obter themeId da query string ou usar tema ativo
        const themeId = url.searchParams.get('themeId') || await getActiveThemeId();
        
        const data = await readSingleton(name, themeId);
        if (!data) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Singleton não encontrado',
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            data,
            themeId,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao ler singleton:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ params, request }) => {
    try {
        const { name } = params;
        if (!name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Nome do singleton não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const body = await request.json();
        const { data, themeId } = body;
        
        if (!data) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Dados não fornecidos',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Usar themeId do body ou obter tema ativo
        const activeThemeId = themeId || await getActiveThemeId();
        
        const success = await writeSingleton(name, data, activeThemeId);
        
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao atualizar singleton',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Singleton atualizado com sucesso',
            themeId: activeThemeId,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao atualizar singleton:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
