import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isGitHubConfigured, githubDeleteFile, githubGetBlobSha } from '../../../../utils/github-api';

/**
 * api/admin/media/[filename].ts
 * 
 * API route para deletar uma imagem específica da biblioteca de mídia.
 * Aceita tipo na query string ou detecta automaticamente.
 *
 * Em Vercel o filesystem é read-only: com GitHub configurado, remove via API
 * (mesmo caminho que upload.ts — public/images/{tipo}/{ficheiro}).
 */

const BASE_IMAGES_DIR = path.resolve('./public/images');
const MEDIA_TYPES = ['posts', 'authors', 'themes', 'general'] as const;

export const DELETE: APIRoute = async ({ params, url }) => {
    try {
        const { filename } = params;
        
        if (!filename) {
            console.error('❌ Nome do arquivo não fornecido');
            return new Response(JSON.stringify({
                success: false,
                error: 'Nome do arquivo não fornecido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Decodificar o nome do arquivo (pode ter sido codificado na URL)
        let decodedFilename: string;
        try {
            decodedFilename = decodeURIComponent(filename);
        } catch {
            // Se falhar, usar o filename original
            decodedFilename = filename;
        }
        
        console.log(`🔍 Tentando deletar: ${decodedFilename}`);

        const typeFromQuery = url.searchParams.get('type');
        console.log(`📁 Tipo fornecido: ${typeFromQuery || 'não fornecido'}`);

        if (isGitHubConfigured()) {
            let ghPath: string | null = null;

            if (typeFromQuery && MEDIA_TYPES.includes(typeFromQuery as (typeof MEDIA_TYPES)[number])) {
                const p = `public/images/${typeFromQuery}/${decodedFilename}`;
                if (await githubGetBlobSha(p)) ghPath = p;
            }

            if (!ghPath) {
                for (const mediaType of MEDIA_TYPES) {
                    const p = `public/images/${mediaType}/${decodedFilename}`;
                    if (await githubGetBlobSha(p)) {
                        ghPath = p;
                        break;
                    }
                }
            }

            if (!ghPath) {
                return new Response(JSON.stringify({
                    success: false,
                    error: `Arquivo "${decodedFilename}" não encontrado no repositório`,
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const ok = await githubDeleteFile(ghPath, `media: delete "${decodedFilename}"`);
            if (!ok) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Falha ao remover no GitHub (token, branch ou permissões).',
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({
                success: true,
                message: 'Imagem deletada com sucesso',
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (process.env.VERCEL === '1') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Na Vercel o filesystem é só leitura. Configure GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO (e branch) no projeto para apagar mídia via GitHub.',
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let filePath: string | null = null;
        
        // Se tipo foi fornecido, usar diretamente
        if (typeFromQuery && MEDIA_TYPES.includes(typeFromQuery as any)) {
            const mediaDir = path.join(BASE_IMAGES_DIR, typeFromQuery);
            filePath = path.join(mediaDir, decodedFilename);
            console.log(`📂 Caminho direto: ${filePath}`);
            
            // Verificar se existe
            try {
                await fs.access(filePath);
            } catch {
                console.error(`❌ Arquivo não encontrado em ${filePath}`);
                filePath = null;
            }
        }
        
        // Se não encontrou com tipo, buscar em todos os diretórios
        if (!filePath) {
            console.log('🔍 Buscando em todos os diretórios...');
            for (const mediaType of MEDIA_TYPES) {
                const mediaDir = path.join(BASE_IMAGES_DIR, mediaType);
                const testPath = path.join(mediaDir, decodedFilename);
                try {
                    await fs.access(testPath);
                    filePath = testPath;
                    console.log(`✅ Arquivo encontrado em: ${filePath}`);
                    break;
                } catch {
                    continue;
                }
            }
        }

        if (!filePath) {
            console.error(`❌ Arquivo não encontrado: ${decodedFilename}`);
            return new Response(JSON.stringify({
                success: false,
                error: `Arquivo "${decodedFilename}" não encontrado em nenhum diretório`,
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Deletar o arquivo
        await fs.unlink(filePath);
        console.log(`✅ Arquivo deletado com sucesso: ${filePath}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Imagem deletada com sucesso',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao deletar mídia:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Erro ao deletar imagem',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
