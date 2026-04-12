/**
 * PostEditor.tsx
 * 
 * Componente React completo para edição de posts.
 * Inclui formulário com todos os campos, editor de Markdown, preview e ações de salvar/publicar.
 * 
 * Props:
 * - post: Dados do post (opcional, se for novo post)
 * - authors: Lista de autores disponíveis
 * - categories: Lista de categorias disponíveis
 * - onSave: Callback quando salvar
 * - onPublish: Callback quando publicar
 */

import { useState, useEffect, useRef } from 'react';
import { getArticleTemplate } from '../../utils/article-templates';
import WYSIWYGEditor from './WYSIWYGEditor';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { useToast, ToastList } from './Toast';
import AdminImagePreview from './AdminImagePreview';

interface Author {
    id: string;
    name: string;
}

interface Category {
    id: string;
    name: string;
}

interface PostData {
    title: string;
    slug: string;
    author?: string;
    category?: string;
    publishedDate?: string;
    thumbnail?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaImage?: string;
    /** `html` = salvar corpo como HTML (sem Turndown). */
    contentFormat?: 'markdown' | 'html';
    seoSchema?: 'auto' | 'blogPosting' | 'articleItemList' | 'none';
    content: string;
}

interface Props {
    post?: PostData;
    authors: Author[];
    categories: Category[];
    /** Query ?t= do assistente /admin/posts/criar — aplica modelo uma vez no novo post */
    templateId?: string;
}

export default function PostEditor({ post, authors, categories, templateId }: Props) {
    const normalizeSlug = (value: string): string =>
        (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const normalizeInternalLinksToFollow = (html: string): string => {
        if (!html || !html.includes('<a')) return html;
        // Para links internos do próprio site, removemos nofollow/sponsored.
        return html.replace(/<a\b([^>]*?)>/gi, (full, attrs) => {
            const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
            if (!hrefMatch) return full;
            const href = hrefMatch[1];
            const isInternal =
                href.startsWith('/') ||
                href.startsWith('#') ||
                href.includes('bemmae.com.br');
            if (!isInternal) return full;

            const relMatch = attrs.match(/\brel\s*=\s*["']([^"']*)["']/i);
            if (!relMatch) return full;
            const cleanedRel = relMatch[1]
                .split(/\s+/)
                .filter(Boolean)
                .filter((token) => {
                    const t = token.toLowerCase();
                    return t !== 'nofollow' && t !== 'sponsored';
                })
                .join(' ');

            const updatedAttrs = cleanedRel
                ? attrs.replace(relMatch[0], `rel="${cleanedRel}"`)
                : attrs.replace(/\s*\brel\s*=\s*["'][^"']*["']/i, '');
            return `<a${updatedAttrs}>`;
        });
    };

    const { toasts, showToast, removeToast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [title, setTitle] = useState(post?.title || '');
    const [slug, setSlug] = useState(normalizeSlug(post?.slug || ''));
    const [author, setAuthor] = useState(post?.author || '');
    const [category, setCategory] = useState(post?.category || '');
    const [publishedDate, setPublishedDate] = useState(post?.publishedDate || new Date().toISOString().split('T')[0]);
    const [thumbnail, setThumbnail] = useState(post?.thumbnail || '');
    const [thumbnailPreviewBlob, setThumbnailPreviewBlob] = useState<string | null>(null);
    const [metaTitle, setMetaTitle] = useState(post?.metaTitle || '');
    const [metaDescription, setMetaDescription] = useState(post?.metaDescription || '');
    const [metaImage, setMetaImage] = useState(post?.metaImage || '');
    
    // Converter Markdown para HTML para o editor WYSIWYG
    const getInitialContent = () => {
        if (!post?.content) return '';
        const trimmed = post.content.trim();
        // Se já é HTML, retorna direto
        if (trimmed.startsWith('<')) return post.content;
        // Se contém blocos HTML ricos (ex.: review dentro do body),
        // também devolvemos como HTML para não passar por marked.parse
        // e acabar "desmontando" a estrutura ao recarregar.
        if (trimmed.includes('cnx-aff-') || trimmed.includes('product-review')) return post.content;
        // Se é Markdown, converte para HTML
        try {
            return marked.parse(post.content) as string;
        } catch {
            return post.content;
        }
    };
    
    const [content, setContent] = useState(getInitialContent());
    const [contentFormatHtml, setContentFormatHtml] = useState(post?.contentFormat === 'html');
    const [seoSchema, setSeoSchema] = useState<NonNullable<PostData['seoSchema']>>(post?.seoSchema || 'auto');
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    
    // Instância do Turndown para converter HTML para Markdown
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
    });

    // Preservar bloco de review como HTML raw (não converter para Markdown)
    turndownService.addRule('product-review', {
        filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('product-review'),
        replacement: (_content: string, node: Node) => '\n\n' + (node as HTMLElement).outerHTML + '\n\n',
    });
    turndownService.addRule('cnx-affiliate-blocks', {
        filter: (node) =>
            node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('cnx-aff-block-wrap'),
        replacement: (_content: string, node: Node) => '\n\n' + (node as HTMLElement).outerHTML + '\n\n',
    });
    
    // Proteção contra problemas de hidratação
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const templateAppliedRef = useRef(false);
    useEffect(() => {
        if (post || templateAppliedRef.current || !templateId) return;
        const tpl = getArticleTemplate(templateId);
        if (!tpl) return;
        templateAppliedRef.current = true;
        setContent(tpl.content);
        setContentFormatHtml(tpl.contentFormatHtml);
        setSeoSchema(tpl.seoSchema);
        setTitle((prev) => (prev.trim() ? prev : tpl.titleHint || prev));
    }, [post, templateId]);

    // Gerar slug automaticamente do título
    useEffect(() => {
        if (!post && title && !slug) {
            try {
                const generatedSlug = normalizeSlug(title);
                if (generatedSlug) {
                    setSlug(generatedSlug);
                }
            } catch (error) {
                console.error('\x1b[31m✗ [X] Erro ao gerar slug:\x1b[0m', error);
            }
        }
    }, [title, slug, post]);

    const handleSave = async (isPublish: boolean) => {
        if (!title || !slug) {
            showToast('warning', 'Campos obrigatórios', 'Título e slug são obrigatórios');
            return;
        }

        setIsSaving(true);
        try {
            const hasAffiliateBlocks = Boolean(content && content.includes('cnx-aff-'));
            const hasProductReviewBlocks = Boolean(content && content.includes('product-review'));

            // Estes blocos são HTML "rich" (tabelas, grid, classes).
            // Converter para markdown pode destruir a estrutura e causar perda após reload.
            // Então, se existir qualquer bloco cnx-aff ou product-review no HTML, salvamos como HTML.
            const forceAffiliateBlocksHtml = !contentFormatHtml && hasAffiliateBlocks;
            const forceProductReviewHtml = !contentFormatHtml && hasProductReviewBlocks;
            let bodyContent = content;
            let finalContentFormatHtml = contentFormatHtml || forceAffiliateBlocksHtml || forceProductReviewHtml;

            if (!finalContentFormatHtml && content && content.trim().startsWith('<')) {
                try {
                    bodyContent = turndownService.turndown(content);
                } catch (error) {
                    console.error('❌ Erro ao converter HTML para Markdown:', error);
                }
            }

            if (finalContentFormatHtml) {
                bodyContent = normalizeInternalLinksToFollow(bodyContent);
            }

            const postData: PostData = {
                title,
                slug: normalizeSlug(slug),
                author: author || undefined,
                category: category || undefined,
                publishedDate: isPublish ? (publishedDate || new Date().toISOString().split('T')[0]) : undefined,
                thumbnail: thumbnail || undefined,
                metaTitle: metaTitle || undefined,
                metaDescription: metaDescription || undefined,
                metaImage: metaImage || undefined,
                contentFormat: finalContentFormatHtml ? 'html' : undefined,
                seoSchema,
                content: bodyContent,
            };
            
            const apiSlug = post?.slug ? encodeURIComponent(post.slug) : '';
            const url = post ? `/api/admin/posts/${apiSlug}/` : '/api/admin/posts/';
            const method = post ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...postData,
                    newSlug: postData.slug !== post?.slug ? postData.slug : undefined,
                }),
            });

            const raw = await response.text();
            let result: { success?: boolean; error?: string } = {};
            try {
                result = raw ? JSON.parse(raw) : {};
            } catch {
                result = {
                    success: false,
                    error: raw?.trim() || `Resposta inválida (HTTP ${response.status})`,
                };
            }

            if (response.ok && result.success) {
                showToast('success', isPublish ? 'Post publicado!' : 'Rascunho salvo!');
                setTimeout(() => { window.location.href = `/admin/posts/${postData.slug}`; }, 1000);
            } else {
                const msg = result.error || `Falha ao salvar (HTTP ${response.status})`;
                showToast('error', 'Erro ao salvar', msg);
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('error', 'Erro ao salvar post');
        } finally {
            setIsSaving(false);
        }
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const blobUrl = URL.createObjectURL(file);
        setThumbnailPreviewBlob(blobUrl);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'posts');

        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                setThumbnail(data.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a thumbnail');
            }
        } catch (error) {
            console.error('\x1b[31m✗ Erro no upload:\x1b[0m', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar a thumbnail');
        } finally {
            URL.revokeObjectURL(blobUrl);
            setThumbnailPreviewBlob(null);
            e.target.value = '';
        }
    };

    const handleMetaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'posts');

        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                setMetaImage(data.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
            }
        } catch (error) {
            console.error('❌ Erro no upload:', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        }
    };

    // Atalhos de teclado: Ctrl+S = rascunho, Ctrl+Enter = publicar
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                handleSave(false);
            } else if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleSave(true);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [title, slug, content, contentFormatHtml, seoSchema, author, category, publishedDate, thumbnail, metaTitle, metaDescription, metaImage, post]);

    // Proteção contra problemas de hidratação - só renderizar após montar
    if (!isMounted) {
        return (
            <div className="space-y-6 p-8">
                <div className="text-center text-[#a3a3a3]">
                    <p>Carregando editor...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        {post ? 'Editar Post' : 'Novo Post'}
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        {post ? `Editando: ${post.title}` : 'Crie um novo post para seu blog'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="admin-btn admin-btn-secondary"
                    >
                        {showPreview ? '✏️ Editar' : '👁️ Preview'}
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="admin-btn admin-btn-secondary disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : '💾 Rascunho'}
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="admin-btn admin-btn-primary disabled:opacity-50"
                    >
                        {isSaving ? 'Publicando...' : '🚀 Publicar'}
                    </button>
                </div>
            </div>

            {showPreview ? (
                /* Preview */
                <div className="admin-card p-8">
                    <article>
                        <h1 className="text-3xl font-heading font-bold text-[#e5e5e5] mb-4">{title || 'Sem título'}</h1>
                        {metaDescription && (
                            <p className="text-[#a3a3a3] text-lg mb-6">{metaDescription}</p>
                        )}
                        <div 
                            className="prose prose-invert max-w-none text-[#e5e5e5]"
                            dangerouslySetInnerHTML={{ __html: content || '<p class="text-[#737373] italic">Nenhum conteúdo ainda...</p>' }}
                        />
                    </article>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Título *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="admin-input"
                                placeholder="Digite o título do post"
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Slug (URL) *
                            </label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                                className="admin-input font-mono text-sm"
                                placeholder="url-do-post"
                            />
                        </div>

                        {/* Content Editor */}
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Conteúdo
                            </label>
                            <div className="h-[500px] rounded-lg overflow-hidden bg-[#0a0a0a]">
                                <WYSIWYGEditor
                                    key={post?.slug ?? 'new-post-draft'}
                                    value={content}
                                    onChange={setContent}
                                    placeholder="Comece a escrever seu post aqui..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Thumbnail - Destaque */}
                        <div className="admin-card p-6 border-2 border-primary/30 bg-primary/5">
                            <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4 flex items-center gap-2">
                                <span>🖼️</span>
                                <span>Thumbnail (Imagem de Destaque)</span>
                            </h3>
                            <div className="space-y-4">
                                {(thumbnail || thumbnailPreviewBlob) ? (
                                    <div className="relative">
                                        <AdminImagePreview
                                            src={thumbnail}
                                            previewBlobUrl={thumbnailPreviewBlob}
                                            alt="Thumbnail preview"
                                            className="w-full rounded-lg mb-2 border-2 border-primary/50 object-cover"
                                            style={{ minHeight: 120 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setThumbnail(''); setThumbnailPreviewBlob(null); }}
                                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors"
                                            title="Remover thumbnail"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : null}
                                <label className="block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        className="hidden"
                                        id="thumbnail-upload"
                                    />
                                    <span className="admin-btn admin-btn-primary w-full text-center cursor-pointer block">
                                        {thumbnail || thumbnailPreviewBlob ? '🔄 Trocar Thumbnail' : '📷 Adicionar Thumbnail'}
                                    </span>
                                </label>
                                <p className="text-xs text-[#737373]">
                                    Esta imagem aparece nos cards do blog e na página do post
                                </p>
                            </div>
                        </div>

                        {/* Publish Settings */}
                        <div className="admin-card p-6">
                            <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                                Publicação
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#a3a3a3] mb-2">
                                        Data de Publicação
                                    </label>
                                    <input
                                        type="date"
                                        value={publishedDate}
                                        onChange={(e) => setPublishedDate(e.target.value)}
                                        className="admin-input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#a3a3a3] mb-2">
                                        Autor
                                    </label>
                                    <select
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                        className="admin-input"
                                    >
                                        <option value="">Selecione um autor</option>
                                        {authors.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#a3a3a3] mb-2">
                                        Categoria
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="admin-input"
                                    >
                                        <option value="">Selecione uma categoria</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-[rgba(255,255,255,0.08)] p-3 hover:bg-white/5">
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={contentFormatHtml}
                                        onChange={(e) => setContentFormatHtml(e.target.checked)}
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold text-[#e5e5e5]">Corpo em HTML</span>
                                        <span className="block text-xs text-[#737373] mt-1">
                                            Mantém cards e estilos (import Ghost). Sem converter para Markdown ao salvar.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* SEO Settings */}
                        <div className="admin-card p-6">
                            <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                                SEO
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#a3a3a3] mb-2">
                                        Schema JSON-LD (Google)
                                    </label>
                                    <select
                                        value={seoSchema}
                                        onChange={(e) => setSeoSchema(e.target.value as NonNullable<PostData['seoSchema']>)}
                                        className="admin-input"
                                    >
                                        <option value="auto">Automático — detecta lista de produtos (cards Bem Mãe) ou artigo</option>
                                        <option value="blogPosting">Artigo / post informativo (BlogPosting)</option>
                                        <option value="articleItemList">Ranking ou review (Article + ItemList)</option>
                                        <option value="none">Sem schema extra (só WebSite no layout)</option>
                                    </select>
                                    <p className="text-xs text-[#737373] mt-1">
                                        A meta description abaixo não aparece mais no corpo do post — só em meta tags e rich results.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#a3a3a3] mb-2">
                                        Meta Title (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={metaTitle}
                                        onChange={(e) => setMetaTitle(e.target.value)}
                                        className="admin-input"
                                        placeholder="Título para SEO — deixe vazio para usar o título do post"
                                    />
                                    <p className="text-xs text-[#737373] mt-1">
                                        {metaTitle.length > 0 ? `${metaTitle.length} caracteres` : 'Se vazio, usa o título do post'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#a3a3a3] mb-2">
                                        Meta Description
                                    </label>
                                    <textarea
                                        value={metaDescription}
                                        onChange={(e) => setMetaDescription(e.target.value)}
                                        rows={3}
                                        className="admin-input resize-none"
                                        placeholder="Descrição para SEO (150-160 caracteres)"
                                    />
                                    <p className="text-xs text-[#737373] mt-1">
                                        {metaDescription.length} caracteres
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#a3a3a3] mb-2">
                                        Imagem Social (Open Graph)
                                    </label>
                                    {metaImage && (
                                        <img
                                            src={metaImage}
                                            alt="Preview"
                                            className="w-full rounded-lg mb-2 border border-[rgba(255,255,255,0.08)]"
                                        />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleMetaImageUpload}
                                        className="admin-input text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#3b82f6] file:text-white hover:file:bg-[#2563eb] cursor-pointer"
                                    />
                                    {metaImage && (
                                        <input
                                            type="text"
                                            value={metaImage}
                                            onChange={(e) => setMetaImage(e.target.value)}
                                            className="admin-input text-xs font-mono mt-2"
                                            placeholder="URL da imagem"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
