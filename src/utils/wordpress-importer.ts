/**
 * wordpress-importer.ts
 * 
 * Utilitário para importar posts, categorias e autores do WordPress via XML (WXR format).
 * Processa o arquivo XML exportado do WordPress e converte para o formato do nosso CMS.
 */

import { XMLParser } from 'fast-xml-parser';
import TurndownService from 'turndown';
import { writePost, generateSlug } from './post-utils';
import type { PostData } from './post-utils';
import { writeAuthor, authorSlugExists } from './author-utils';
import type { AuthorData } from './author-utils';
import { writeCategory, categorySlugExists } from './category-utils';
import type { CategoryData } from './category-utils';
import fs from 'node:fs/promises';
import path from 'node:path';

interface WordPressPost {
    title?: string;
    'wp:post_name'?: string;
    'wp:post_type'?: string;
    'wp:post_status'?: string;
    'wp:post_date'?: string;
    'dc:creator'?: string;
    'content:encoded'?: string;
    'excerpt:encoded'?: string;
    category?: string | string[];
}

interface WordPressAuthor {
    'wp:author_login'?: string;
    'wp:author_email'?: string;
    'wp:author_display_name'?: string;
    'wp:author_first_name'?: string;
    'wp:author_last_name'?: string;
}

interface WordPressCategory {
    'wp:term_id'?: string;
    'wp:category_nicename'?: string;
    'wp:category_parent'?: string;
    'wp:cat_name'?: string;
}

interface ImportResult {
    success: boolean;
    posts: {
        imported: number;
        skipped: number;
        errors: string[];
        imagesImported: number;
    };
    authors: {
        imported: number;
        skipped: number;
    };
    categories: {
        imported: number;
        skipped: number;
    };
    errors: string[];
}

// Configurar Turndown para converter HTML para Markdown
const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
});

// Adicionar regras customizadas para melhorar a conversão
turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: (content) => `~~${content}~~`,
});

/**
 * Converte HTML do WordPress para Markdown
 */
function htmlToMarkdown(html: string): string {
    if (!html || html.trim() === '') return '';
    
    try {
        // Limpar HTML específico do WordPress
        let cleaned = html
            .replace(/<!--\s*\[if[^\]]*\]>.*?<!\[endif\]\s*-->/gis, '') // Comentários condicionais
            .replace(/<script[^>]*>.*?<\/script>/gis, '') // Scripts
            .replace(/<style[^>]*>.*?<\/style>/gis, '') // Estilos inline
            .trim();
        
        // Converter para Markdown
        const markdown = turndownService.turndown(cleaned);
        return markdown;
    } catch (error) {
        console.error('❌ Erro ao converter HTML para Markdown:', error);
        return html; // Retorna HTML original se falhar
    }
}

/**
 * Gera slug a partir de string
 */
function generateSlugFromString(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-') // Substitui não-alfanuméricos por hífen
        .replace(/^-+|-+$/g, ''); // Remove hífens do início/fim
}

/**
 * Extrai URLs de imagens do HTML
 */
function extractImageUrls(html: string): string[] {
    if (!html) return [];
    
    const imageUrls: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    
    // Extrair src de tags img
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        const url = match[1];
        if (url && !url.startsWith('data:')) {
            imageUrls.push(url);
        }
    }
    
    // Extrair URLs de srcset
    while ((match = srcsetRegex.exec(html)) !== null) {
        const srcset = match[1];
        // srcset pode ter múltiplas URLs separadas por vírgula
        const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
        urls.forEach(url => {
            if (url && !url.startsWith('data:') && !imageUrls.includes(url)) {
                imageUrls.push(url);
            }
        });
    }
    
    return imageUrls;
}

/**
 * Baixa uma imagem de uma URL e salva localmente
 */
async function downloadAndSaveImage(imageUrl: string, postSlug: string): Promise<string | null> {
    try {
        // Validar URL
        if (!imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
            return null;
        }
        
        // Baixar imagem
        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.log(`⚠️ Não foi possível baixar imagem: ${imageUrl} (${response.status})`);
            return null;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.log(`⚠️ URL não é uma imagem: ${imageUrl}`);
            return null;
        }
        
        // Determinar extensão
        const extension = contentType.split('/')[1] || 'jpg';
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        const ext = validExtensions.includes(extension) ? extension : 'jpg';
        
        // Gerar nome único
        const urlPath = new URL(imageUrl).pathname;
        const urlFilename = path.basename(urlPath) || 'image';
        const cleanFilename = urlFilename.replace(/[^a-zA-Z0-9.-]/g, '-');
        const timestamp = Date.now();
        const filename = `${timestamp}-${postSlug}-${cleanFilename}.${ext}`;
        
        // Caminho de destino
        const uploadDir = path.resolve('./public/images/posts');
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        
        // Salvar arquivo
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);
        
        // URL pública
        const publicUrl = `/images/posts/${filename}`;
        
        console.log(`✅ Imagem salva: ${publicUrl}`);
        return publicUrl;
    } catch (error: any) {
        console.error(`❌ Erro ao baixar/salvar imagem ${imageUrl}:`, error.message);
        return null;
    }
}

/**
 * Substitui URLs de imagens no HTML/Markdown por URLs locais
 */
function replaceImageUrls(content: string, urlMap: Map<string, string>): string {
    let updatedContent = content;
    
    urlMap.forEach((localUrl, originalUrl) => {
        // Substituir em tags img
        updatedContent = updatedContent.replace(
            new RegExp(`(<img[^>]+src=["'])${escapeRegex(originalUrl)}(["'][^>]*>)`, 'gi'),
            `$1${localUrl}$2`
        );
        
        // Substituir em srcset
        updatedContent = updatedContent.replace(
            new RegExp(`(srcset=["'])([^"']*?)${escapeRegex(originalUrl)}([^"']*?)(["'])`, 'gi'),
            `$1$2${localUrl}$3$4`
        );
        
        // Substituir URLs diretas (para Markdown)
        updatedContent = updatedContent.replace(
            new RegExp(escapeRegex(originalUrl), 'g'),
            localUrl
        );
    });
    
    return updatedContent;
}

/**
 * Escapa caracteres especiais para regex
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Processa e importa dados do WordPress XML
 */
export async function importWordPressXML(xmlContent: string): Promise<ImportResult> {
    const result: ImportResult = {
        success: true,
        posts: { imported: 0, skipped: 0, errors: [], imagesImported: 0 },
        authors: { imported: 0, skipped: 0 },
        categories: { imported: 0, skipped: 0 },
        errors: [],
    };

    try {
        console.log('📋 Iniciando parse do XML...');
        console.log('📋 Tamanho do XML:', xmlContent.length);
        
        if (!xmlContent || xmlContent.trim().length === 0) {
            throw new Error('XML vazio ou inválido');
        }
        // Parsear XML
        // Nota: fast-xml-parser v5 mantém namespaces como parte do nome da propriedade
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            parseAttributeValue: true,
            trimValues: true,
            parseTrueNumberOnly: false,
            arrayMode: false,
            cdataPropName: '#text',
            preserveOrder: false,
            isArray: (name, jPath, isLeafNode, isAttribute) => {
                // Forçar arrays para elementos que podem aparecer múltiplas vezes
                if (name === 'item' || name === 'wp:author' || name === 'wp:category' || name === 'category') {
                    return true;
                }
                return false;
            },
        });

        let xmlData;
        try {
            console.log('📋 Parseando XML com fast-xml-parser...');
            xmlData = parser.parse(xmlContent);
            console.log('✅ XML parseado com sucesso');
        } catch (parseError: any) {
            console.error('❌ Erro ao parsear XML:', parseError);
            console.error('❌ Mensagem:', parseError.message);
            console.error('❌ Stack:', parseError.stack);
            throw new Error(`Erro ao parsear XML: ${parseError.message}`);
        }
        
        // Debug: verificar estrutura parseada
        console.log('📋 Debug: xmlData top-level keys:', Object.keys(xmlData || {}));
        
        // Extrair dados do RSS/Channel
        // O parser pode retornar rss.channel ou apenas channel
        const channel = xmlData?.rss?.channel || xmlData?.channel;
        if (!channel) {
            console.error('❌ Debug: xmlData keys:', Object.keys(xmlData || {}));
            console.error('❌ Debug: xmlData.rss keys:', xmlData?.rss ? Object.keys(xmlData.rss) : 'rss não existe');
            throw new Error('Formato XML inválido: não foi possível encontrar o elemento channel');
        }
        
        console.log('📋 Debug: Channel encontrado. Keys:', Object.keys(channel).slice(0, 20));

        console.log('📋 Debug: Estrutura do channel encontrada');
        console.log('📋 Debug: Channel keys:', Object.keys(channel).slice(0, 10));
        console.log('📋 Debug: Items encontrados:', channel.item ? (Array.isArray(channel.item) ? channel.item.length : 1) : 0);
        console.log('📋 Debug: Autores encontrados:', channel['wp:author'] ? (Array.isArray(channel['wp:author']) ? channel['wp:author'].length : 1) : 0);
        console.log('📋 Debug: Categorias encontradas:', channel['wp:category'] ? (Array.isArray(channel['wp:category']) ? channel['wp:category'].length : 1) : 0);
        
        // Debug: verificar primeiro item
        if (channel.item) {
            const firstItem = Array.isArray(channel.item) ? channel.item[0] : channel.item;
            if (firstItem) {
                console.log('📋 Debug: Primeiro item keys:', Object.keys(firstItem).slice(0, 15));
                console.log('📋 Debug: Primeiro item post_type:', firstItem['wp:post_type']);
                console.log('📋 Debug: Primeiro item status:', firstItem['wp:status']);
            }
        }

        // Processar categorias primeiro (podem estar em wp:category ou dentro dos items)
        const wpCategories = channel['wp:category'] || [];
        const categoriesArray = Array.isArray(wpCategories) ? wpCategories : (wpCategories ? [wpCategories] : []);
        
        // Função auxiliar para extrair valor de categoria
        const getCategoryValue = (obj: any): string => {
            if (!obj) return '';
            if (typeof obj === 'string') return obj.trim();
            if (Array.isArray(obj) && obj.length > 0) {
                const first = obj[0];
                if (typeof first === 'string') return first.trim();
                if (first && first['#text']) return String(first['#text']).trim();
            }
            if (obj['#text']) return String(obj['#text']).trim();
            return String(obj).trim();
        };
        
        for (const cat of categoriesArray) {
            if (!cat) continue;
            
            // Extrair valores usando função auxiliar
            const catNameRaw = getCategoryValue(cat['wp:cat_name']);
            const catSlugRaw = getCategoryValue(cat['wp:category_nicename']);
            
            // Garantir que sejam strings válidas
            const catName = (catNameRaw && typeof catNameRaw === 'string' && catNameRaw.trim()) 
                ? catNameRaw.trim() 
                : '';
            const catSlug = (catSlugRaw && typeof catSlugRaw === 'string' && catSlugRaw.trim()) 
                ? catSlugRaw.trim() 
                : (catName ? generateSlugFromString(catName) : '');
            
            if (!catName || !catSlug) {
                console.log(`⚠️ Categoria ignorada - nome ou slug inválido:`, { catName, catSlug });
                continue;
            }
            
            // Verificar se já existe
            const exists = await categorySlugExists(catSlug);
            if (exists) {
                result.categories.skipped++;
                continue;
            }
            
            const categoryData: CategoryData = {
                name: catName, // Garantido que é string válida
                slug: catSlug,
            };
            
            const success = await writeCategory(catSlug, categoryData);
            if (success) {
                result.categories.imported++;
                console.log(`✅ Categoria importada: ${catName} (${catSlug})`);
            } else {
                result.categories.skipped++;
            }
        }

        // Processar autores
        const wpAuthors = channel['wp:author'] || [];
        const authorsArray = Array.isArray(wpAuthors) ? wpAuthors : (wpAuthors ? [wpAuthors] : []);
        const authorMap = new Map<string, string>(); // login -> slug
        
        console.log('📋 Debug: Autores encontrados:', authorsArray.length);
        
        // Função auxiliar para extrair valor de autor/categoria
        const getAuthorValue = (obj: any): string => {
            if (!obj) return '';
            if (typeof obj === 'string') return obj.trim();
            if (Array.isArray(obj) && obj.length > 0) {
                const first = obj[0];
                if (typeof first === 'string') return first.trim();
                if (first && first['#text']) return String(first['#text']).trim();
            }
            if (obj['#text']) return String(obj['#text']).trim();
            return String(obj).trim();
        };
        
        for (const author of authorsArray) {
            if (!author) continue;
            
            // Extrair valores usando função auxiliar
            const login = getAuthorValue(author['wp:author_login']);
            const displayName = getAuthorValue(author['wp:author_display_name']) || login;
            const email = getAuthorValue(author['wp:author_email']);
            const firstName = getAuthorValue(author['wp:author_first_name']);
            const lastName = getAuthorValue(author['wp:author_last_name']);
            
            if (!login || !displayName) {
                console.log('⚠️ Autor ignorado - login ou displayName vazio:', { login, displayName });
                continue;
            }
            
            const authorSlug = generateSlugFromString(login);
            authorMap.set(login, authorSlug);
            
            // Verificar se já existe
            const exists = await authorSlugExists(authorSlug);
            if (exists) {
                result.authors.skipped++;
                continue;
            }
            
            const authorData: AuthorData = {
                name: displayName,
                slug: authorSlug,
                role: 'Autor',
                bio: `${firstName} ${lastName}`.trim() || displayName,
            };
            
            const success = await writeAuthor(authorSlug, authorData);
            if (success) {
                result.authors.imported++;
            } else {
                result.authors.skipped++;
            }
        }

        // Processar posts
        const items = channel.item || [];
        const itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
        
        console.log('📋 Debug: Total de items para processar:', itemsArray.length);
        
        // Debug: verificar estrutura do primeiro item
        if (itemsArray.length > 0) {
            const firstItem = itemsArray[0];
            console.log('📋 Debug: Total de items:', itemsArray.length);
            console.log('📋 Debug: Primeiro item keys (primeiras 20):', Object.keys(firstItem).slice(0, 20));
            console.log('📋 Debug: Primeiro item wp:post_type:', JSON.stringify(firstItem['wp:post_type']).substring(0, 100));
            console.log('📋 Debug: Primeiro item wp:status:', JSON.stringify(firstItem['wp:status']).substring(0, 100));
        }
        
        for (const item of itemsArray) {
            try {
                // Função auxiliar para extrair valor
                // O parser pode retornar: string, objeto com #text, ou array de objetos com #text
                const getValue = (obj: any): string => {
                    if (!obj) return '';
                    
                    // Se for string direta
                    if (typeof obj === 'string') return obj.trim();
                    
                    // Se for array, pegar o primeiro elemento
                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '';
                        const first = obj[0];
                        if (typeof first === 'string') return first.trim();
                        if (first && first['#text']) return String(first['#text']).trim();
                        return String(first).trim();
                    }
                    
                    // Se for objeto com #text
                    if (obj['#text']) return String(obj['#text']).trim();
                    
                    // Último recurso: converter para string
                    return String(obj).trim();
                };
                
                // Verificar se é um post
                const postType = getValue(item['wp:post_type']);
                if (postType !== 'post') {
                    continue;
                }
                
                // Verificar status
                const postStatus = getValue(item['wp:status']);
                if (postStatus !== 'publish' && postStatus !== 'draft') {
                    continue;
                }
                
                // Extrair dados do post usando a função getValue já definida acima
                const title = getValue(item.title) || 'Sem título';
                const postName = getValue(item['wp:post_name']);
                const postDate = getValue(item['wp:post_date']);
                const creator = getValue(item['dc:creator']);
                const content = getValue(item['content:encoded']);
                const excerpt = getValue(item['excerpt:encoded']);
                
                console.log('📝 Processando post:', title.substring(0, 50) + '...', 'Slug:', postName);
                
                // Gerar slug
                let slug = postName || generateSlug(title);
                if (!slug) {
                    result.posts.errors.push(`Post "${title}" sem slug válido`);
                    result.posts.skipped++;
                    continue;
                }
                
                // Verificar se slug já existe
                const existingPosts = await import('./post-utils').then(m => m.listPosts());
                if (existingPosts.some(p => p.data.slug === slug)) {
                    // Adicionar sufixo numérico
                    let counter = 1;
                    let newSlug = `${slug}-${counter}`;
                    while (existingPosts.some(p => p.data.slug === newSlug)) {
                        counter++;
                        newSlug = `${slug}-${counter}`;
                    }
                    slug = newSlug;
                }
                
                // Mapear autor
                let authorSlug: string | undefined;
                if (creator) {
                    authorSlug = authorMap.get(creator) || generateSlugFromString(creator);
                }
                
                // Mapear categorias (category pode ter domain="category" e nicename)
                let categorySlug: string | undefined;
                const categories = item.category || [];
                const categoriesArray = Array.isArray(categories) ? categories : (categories ? [categories] : []);
                
                // Procurar primeira categoria válida com domain="category"
                for (const cat of categoriesArray) {
                    // Verificar se tem atributo domain="category"
                    const domain = cat?.['@_domain'] || cat?.['domain'];
                    if (domain !== 'category') continue;
                    
                    // Tentar pegar nicename (slug) ou nome
                    // O cat pode ser string, objeto com #text, ou array
                    let catSlug = '';
                    let catName = '';
                    
                    if (typeof cat === 'string') {
                        catName = cat;
                        catSlug = generateSlugFromString(cat);
                    } else if (Array.isArray(cat)) {
                        // Se for array, pegar o primeiro elemento
                        const first = cat[0];
                        if (typeof first === 'string') {
                            catName = first;
                            catSlug = generateSlugFromString(first);
                        } else if (first && first['#text']) {
                            catName = String(first['#text']);
                            catSlug = first['@_nicename'] || generateSlugFromString(catName);
                        }
                    } else {
                        // Objeto
                        catSlug = cat?.['@_nicename'] || '';
                        // Garantir que catName seja uma string válida
                        const catNameRaw = getValue(cat);
                        catName = typeof catNameRaw === 'string' ? catNameRaw : (catNameRaw ? String(catNameRaw) : '');
                    }
                    
                    // Garantir que catName seja string válida antes de usar
                    if (catName && typeof catName !== 'string') {
                        catName = String(catName);
                    }
                    
                    if (catSlug) {
                        // Usar nicename como slug
                        const existingCats = await import('./category-utils').then(m => m.listCategories());
                        const found = existingCats.find(c => c.data.slug === catSlug);
                        if (found) {
                            categorySlug = catSlug;
                            break;
                        } else {
                            // Criar categoria se não existir
                            // Garantir que o nome seja uma string válida
                            const finalCatName = (catName && typeof catName === 'string' && catName.trim()) 
                                ? catName.trim() 
                                : catSlug;
                            
                            const categoryData = {
                                name: finalCatName,
                                slug: catSlug,
                            };
                            const { writeCategory: writeCat } = await import('./category-utils');
                            await writeCat(catSlug, categoryData);
                            categorySlug = catSlug;
                            result.categories.imported++;
                            console.log(`✅ Categoria criada: ${finalCatName} (${catSlug})`);
                            break;
                        }
                    } else if (catName && typeof catName === 'string' && catName.trim()) {
                        // Gerar slug do nome
                        const generatedSlug = generateSlugFromString(catName);
                        const existingCats = await import('./category-utils').then(m => m.listCategories());
                        const found = existingCats.find(c => c.data.slug === generatedSlug);
                        if (found) {
                            categorySlug = generatedSlug;
                            break;
                        } else {
                            // Criar categoria automaticamente se não existir
                            const categoryData = {
                                name: catName.trim(),
                                slug: generatedSlug,
                            };
                            const { writeCategory: writeCat } = await import('./category-utils');
                            const created = await writeCat(generatedSlug, categoryData);
                            if (created) {
                                result.categories.imported++;
                                console.log(`✅ Categoria criada automaticamente: ${catName.trim()} (${generatedSlug})`);
                            }
                            categorySlug = generatedSlug;
                            break;
                        }
                    }
                }
                
                // Extrair thumbnail do post (wp:postmeta com _thumbnail_id)
                let thumbnailUrl: string | undefined;
                const postmeta = item['wp:postmeta'] || [];
                const postmetaArray = Array.isArray(postmeta) ? postmeta : (postmeta ? [postmeta] : []);
                
                for (const meta of postmetaArray) {
                    const metaKey = getValue(meta['wp:meta_key']);
                    if (metaKey === '_thumbnail_id') {
                        // O meta_value contém o ID da imagem
                        const thumbnailId = getValue(meta['wp:meta_value']);
                        if (thumbnailId) {
                            // Procurar o item de attachment correspondente no XML
                            // O attachment geralmente tem wp:post_parent igual ao post_id
                            const postId = getValue(item['wp:post_id']);
                            
                            // Procurar item com wp:post_id igual ao thumbnail_id
                            for (const attachmentItem of itemsArray) {
                                const attachmentPostId = getValue(attachmentItem['wp:post_id']);
                                const attachmentType = getValue(attachmentItem['wp:post_type']);
                                
                                if (attachmentPostId === thumbnailId && attachmentType === 'attachment') {
                                    // Encontrar URL da imagem no attachment
                                    const attachmentUrl = getValue(attachmentItem['wp:attachment_url']) || 
                                                         getValue(attachmentItem['guid']);
                                    
                                    if (attachmentUrl && !attachmentUrl.startsWith('data:')) {
                                        // Baixar e salvar thumbnail
                                        thumbnailUrl = await downloadAndSaveImage(attachmentUrl, slug);
                                        if (thumbnailUrl) {
                                            console.log(`✅ Thumbnail importada: ${thumbnailUrl}`);
                                            result.posts.imagesImported++;
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
                
                // Extrair e baixar imagens do conteúdo
                console.log(`🖼️ Processando imagens do post: ${title.substring(0, 50)}...`);
                const imageUrls = extractImageUrls(content);
                console.log(`📷 Encontradas ${imageUrls.length} imagens no post`);
                
                const imageUrlMap = new Map<string, string>(); // originalUrl -> localUrl
                
                // Baixar e salvar cada imagem
                for (const imageUrl of imageUrls) {
                    const localUrl = await downloadAndSaveImage(imageUrl, slug);
                    if (localUrl) {
                        imageUrlMap.set(imageUrl, localUrl);
                        result.posts.imagesImported++;
                    }
                }
                
                // Substituir URLs de imagens no conteúdo antes de converter para Markdown
                let contentWithLocalImages = content;
                if (imageUrlMap.size > 0) {
                    contentWithLocalImages = replaceImageUrls(content, imageUrlMap);
                }
                
                // Converter conteúdo HTML para Markdown
                const markdownContent = htmlToMarkdown(contentWithLocalImages);
                
                // Formatar data (YYYY-MM-DD)
                let publishedDate: string | undefined;
                if (postDate && postStatus === 'publish') {
                    try {
                        // Formato pode ser "2021-02-04 15:53:53" ou ISO
                        const dateStr = postDate.replace(' ', 'T'); // Converter para formato ISO
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                            publishedDate = date.toISOString().split('T')[0];
                        }
                    } catch {
                        // Ignorar data inválida
                    }
                }
                
                // Processar excerpt para metaDescription
                // Garantir que seja uma string válida (getValue já retorna string, mas vamos garantir)
                let metaDescription: string | undefined;
                
                // excerpt já foi processado por getValue, então deve ser string
                if (excerpt && typeof excerpt === 'string' && excerpt.trim()) {
                    // Limpar HTML do excerpt se houver
                    const cleanExcerpt = excerpt
                        .replace(/<[^>]*>/g, '') // Remove tags HTML
                        .replace(/&nbsp;/g, ' ') // Substitui &nbsp; por espaço
                        .replace(/&[a-z]+;/gi, ' ') // Remove outras entidades HTML
                        .replace(/\s+/g, ' ') // Remove espaços múltiplos
                        .trim();
                    
                    if (cleanExcerpt.length > 0) {
                        metaDescription = cleanExcerpt.substring(0, 160);
                    }
                }
                
                // Se não houver excerpt válido, tentar extrair do conteúdo
                if (!metaDescription && content && typeof content === 'string') {
                    const cleanContent = content
                        .replace(/<[^>]*>/g, '') // Remove tags HTML
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&[a-z]+;/gi, ' ') // Remove outras entidades HTML
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    if (cleanContent.length > 0) {
                        metaDescription = cleanContent.substring(0, 160);
                    }
                }
                
                // Criar post
                const postData: PostData = {
                    title,
                    slug,
                    author: authorSlug,
                    category: categorySlug,
                    publishedDate,
                    thumbnail: thumbnailUrl, // Adicionar thumbnail
                    metaDescription, // Meta description processada
                };
                
                const success = await writePost(slug, postData, markdownContent);
                if (success) {
                    result.posts.imported++;
                    console.log('✅ Post importado:', slug);
                } else {
                    result.posts.errors.push(`Erro ao salvar post "${title}"`);
                    result.posts.skipped++;
                    console.log('❌ Erro ao salvar post:', slug);
                }
            } catch (error: any) {
                const title = item.title?.['#text'] || item.title || 'Desconhecido';
                result.posts.errors.push(`Erro ao processar post "${title}": ${error.message}`);
                result.posts.skipped++;
            }
        }
        
        console.log('✅ Importação concluída com sucesso!');
        console.log('📊 Resumo:', {
            posts: result.posts.imported,
            authors: result.authors.imported,
            categories: result.categories.imported,
            erros: result.errors.length,
        });
        
        return result;
    } catch (error: any) {
        console.error('❌ Erro fatal na importação:', error);
        console.error('❌ Tipo do erro:', typeof error);
        console.error('❌ Mensagem:', error.message);
        console.error('❌ Stack:', error.stack);
        console.error('❌ Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        result.success = false;
        result.errors.push(`Erro fatal: ${error.message || String(error)}`);
        return result;
    }
}
