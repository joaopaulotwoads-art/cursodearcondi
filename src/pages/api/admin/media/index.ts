import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isGitHubConfigured, githubListDirectory } from '../../../../utils/github-api';

/**
 * api/admin/media/index.ts
 * 
 * API route para listar todas as imagens da biblioteca de mídia.
 * Busca em múltiplos diretórios organizados por tipo: posts, authors, themes, general
 *
 * Em produção (Vercel): filesystem do deploy é read-only — com GitHub configurado,
 * a lista vem do repositório (public/images/...), alinhado ao upload.ts.
 */

const BASE_IMAGES_DIR = path.resolve('./public/images');
const MEDIA_TYPES = ['posts', 'authors', 'themes', 'general'] as const;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.SVG'];

export const GET: APIRoute = async ({ url }) => {
    try {
        const typeFilter = url.searchParams.get('type');
        const typesToSearch = typeFilter && MEDIA_TYPES.includes(typeFilter as (typeof MEDIA_TYPES)[number])
            ? [typeFilter as (typeof MEDIA_TYPES)[number]]
            : MEDIA_TYPES;

        if (isGitHubConfigured()) {
            const allMedia: Array<{
                id: string;
                filename: string;
                url: string;
                type: string;
                size: number;
                sizeFormatted: string;
                createdAt: string;
                modifiedAt: string;
            }> = [];

            for (const mediaType of typesToSearch) {
                const ghDir = `public/images/${mediaType}`;
                const files = await githubListDirectory(ghDir);
                for (const f of files) {
                    const ext = path.extname(f.name);
                    if (!ALLOWED_EXTENSIONS.includes(ext)) continue;
                    allMedia.push({
                        id: `${mediaType}-${f.name}`,
                        filename: f.name,
                        url: `/images/${mediaType}/${f.name}`,
                        type: mediaType,
                        size: f.size,
                        sizeFormatted: formatFileSize(f.size),
                        createdAt: new Date().toISOString(),
                        modifiedAt: new Date().toISOString(),
                    });
                }
            }

            allMedia.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

            return new Response(JSON.stringify({
                success: true,
                media: allMedia,
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verificar se diretório base existe
        try {
            await fs.access(BASE_IMAGES_DIR);
        } catch {
            await fs.mkdir(BASE_IMAGES_DIR, { recursive: true });
            return new Response(JSON.stringify({
                success: true,
                media: [],
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Buscar imagens em todos os diretórios de tipo
        const allMedia: any[] = [];

        for (const mediaType of typesToSearch) {
            const mediaDir = path.join(BASE_IMAGES_DIR, mediaType);
            
            try {
                await fs.access(mediaDir);
                const files = await fs.readdir(mediaDir);
                
                // Filtrar apenas imagens
                const imageFiles = files.filter(file => {
                    const ext = path.extname(file);
                    return ALLOWED_EXTENSIONS.includes(ext);
                });

                // Obter informações de cada arquivo
                const typeMedia = await Promise.all(
                    imageFiles.map(async (filename) => {
                        const filePath = path.join(mediaDir, filename);
                        const stats = await fs.stat(filePath);
                        
                        return {
                            id: `${mediaType}-${filename}`,
                            filename,
                            url: `/images/${mediaType}/${filename}`,
                            type: mediaType,
                            size: stats.size,
                            sizeFormatted: formatFileSize(stats.size),
                            createdAt: stats.birthtime.toISOString(),
                            modifiedAt: stats.mtime.toISOString(),
                        };
                    })
                );

                allMedia.push(...typeMedia);
            } catch {
                // Diretório não existe, pular
                continue;
            }
        }

        // Ordenar por data de modificação (mais recentes primeiro)
        allMedia.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

        return new Response(JSON.stringify({
            success: true,
            media: allMedia,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao listar mídia:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            media: [],
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
