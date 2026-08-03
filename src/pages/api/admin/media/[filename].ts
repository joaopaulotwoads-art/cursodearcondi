import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * api/admin/media/[filename].ts
 * 
 * API route para deletar uma imagem específica da biblioteca de mídia.
 * Aceita tipo na query string ou detecta automaticamente.
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
        
        // Tentar obter tipo da query string
        const typeFromQuery = url.searchParams.get('type');
        console.log(`📁 Tipo fornecido: ${typeFromQuery || 'não fornecido'}`);
        
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
