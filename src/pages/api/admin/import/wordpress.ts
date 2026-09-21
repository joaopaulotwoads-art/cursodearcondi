/**
 * api/admin/import/wordpress.ts
 * 
 * API route para importar posts, categorias e autores do WordPress via XML.
 * Aceita upload de arquivo XML (WXR format) e processa todos os dados.
 */

import type { APIRoute } from 'astro';
import { importWordPressXML } from '../../../../utils/wordpress-importer';

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Nenhum arquivo foi enviado',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Verificar tipo do arquivo
        if (!file.name.endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Arquivo deve ser um XML válido',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Ler conteúdo do arquivo
        const xmlContent = await file.text();
        
        if (!xmlContent || xmlContent.trim() === '') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Arquivo XML está vazio',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Processar importação
        console.log('📥 Iniciando importação do WordPress...');
        console.log('📥 Tamanho do XML:', xmlContent.length, 'caracteres');
        
        let result;
        try {
            result = await importWordPressXML(xmlContent);
        } catch (importError: any) {
            console.error('❌ Erro detalhado na importação:', importError);
            console.error('❌ Stack trace:', importError.stack);
            return new Response(JSON.stringify({
                success: false,
                error: `Erro ao processar importação: ${importError.message}`,
                stack: importError.stack,
                details: String(importError),
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        console.log('✅ Importação concluída:', {
            posts: result.posts.imported,
            authors: result.authors.imported,
            categories: result.categories.imported,
            images: result.posts.imagesImported,
            errors: result.errors.length,
        });
        
        return new Response(JSON.stringify({
            success: result.success,
            result: {
                posts: result.posts,
                authors: result.authors,
                categories: result.categories,
                errors: result.errors,
            },
            message: `Importação concluída: ${result.posts.imported} posts, ${result.authors.imported} autores, ${result.categories.imported} categorias, ${result.posts.imagesImported} imagens importadas.`,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro fatal ao importar WordPress:', error);
        console.error('❌ Tipo do erro:', typeof error);
        console.error('❌ Mensagem:', error.message);
        console.error('❌ Stack:', error.stack);
        console.error('❌ Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Erro desconhecido ao processar importação',
            type: typeof error,
            stack: error.stack,
            details: String(error),
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
