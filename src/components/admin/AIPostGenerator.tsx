/**
 * AIPostGenerator.tsx
 *
 * Componente React para geração de posts com IA.
 * Permite criar posts informacionais ou comerciais (Guia dos melhores / SPR).
 *
 * Funcionalidades:
 * - Seleção de tipo: informacional ou comercial
 * - Sub-tipo comercial: Guia dos melhores | SPR (Single Product Review)
 * - Preenchimento de título, slug e outlines (H1, H2, H3)
 * - Seleção de autor e categoria
 * - Fluxo em 4 etapas: visão geral → intro → seções → conclusão
 * - Publicação automática do post
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface Author {
    slug: string;
    name: string;
}

interface Category {
    slug: string;
    name: string;
}

interface Outline {
    level: 'h1' | 'h2' | 'h3' | 'h4';
    text: string;
    /** Número de palavras alvo para a seção. Padrão: 100-150 se vazio */
    minWords?: number;
}

interface Product {
    name: string;
    imageUrl: string;
}

/** Item da lista unificada em posts comerciais — outline ou produto, ordem preservada */
type CommercialItem =
    | { type: 'outline'; level: 'h1' | 'h2' | 'h3' | 'h4'; text: string; minWords?: number }
    | { type: 'product'; name: string; imageUrl: string };

type CommercialSubType = 'guia-melhores' | 'spr';

interface Props {
    authors: Author[];
    categories: Category[];
}

export default function AIPostGenerator({ authors, categories }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [postType, setPostType] = useState<'informational' | 'commercial'>('informational');
    const [commercialSubType, setCommercialSubType] = useState<CommercialSubType>('guia-melhores');
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [outlines, setOutlines] = useState<Outline[]>([]);
    const [commercialItems, setCommercialItems] = useState<CommercialItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Gerar slug automaticamente do título
    useEffect(() => {
        if (title && !slug) {
            const generatedSlug = title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setSlug(generatedSlug);
        }
    }, [title, slug]);

    if (!isMounted) {
        return (
            <div className="space-y-6" style={{ minHeight: '400px' }}>
                <div className="p-8 text-center">
                    <p className="text-[#a3a3a3]">Carregando gerador de posts...</p>
                </div>
            </div>
        );
    }

    const addOutline = (level: 'h1' | 'h2' | 'h3' | 'h4') => {
        setOutlines([...outlines, { level, text: '' }]);
    };

    const updateOutline = (index: number, updates: Partial<Pick<Outline, 'text' | 'minWords'>>) => {
        const newOutlines = [...outlines];
        if ('text' in updates) newOutlines[index].text = updates.text ?? '';
        if ('minWords' in updates) {
            const v = updates.minWords;
            newOutlines[index].minWords = v === undefined || v === null || v === '' ? undefined : Math.max(50, Math.min(2000, Number(v) || 0)) || undefined;
        }
        setOutlines(newOutlines);
    };

    const removeOutline = (index: number) => {
        setOutlines(outlines.filter((_, i) => i !== index));
    };

    const moveOutline = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === outlines.length - 1) return;

        const newOutlines = [...outlines];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newOutlines[index], newOutlines[targetIndex]] = [newOutlines[targetIndex], newOutlines[index]];
        setOutlines(newOutlines);
    };

    const addCommercialItem = (type: 'outline' | 'product', level?: 'h1' | 'h2' | 'h3' | 'h4') => {
        if (type === 'outline' && level) {
            setCommercialItems([...commercialItems, { type: 'outline', level, text: '' }]);
        } else {
            setCommercialItems([...commercialItems, { type: 'product', name: '', imageUrl: '' }]);
        }
    };

    const updateCommercialItem = (index: number, updates: Partial<Outline> | Partial<Product>) => {
        const next = [...commercialItems];
        const item = next[index];
        if (item.type === 'outline') {
            next[index] = { ...item, ...updates } as Extract<CommercialItem, { type: 'outline' }>;
        } else if (item.type === 'product' && updates) {
            next[index] = { ...item, ...updates } as Extract<CommercialItem, { type: 'product' }>;
        }
        setCommercialItems(next);
    };

    const removeCommercialItem = (index: number) => setCommercialItems(commercialItems.filter((_, i) => i !== index));

    const moveCommercialItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === commercialItems.length - 1) return;
        const next = [...commercialItems];
        const target = direction === 'up' ? index - 1 : index + 1;
        [next[index], next[target]] = [next[target], next[index]];
        setCommercialItems(next);
    };

    const handleGenerate = async () => {
        // Validações
        if (!title || !slug) {
            setError('❌ Título e slug são obrigatórios');
            return;
        }

        if (!author) {
            setError('❌ Selecione um autor');
            return;
        }

        if (!category) {
            setError('❌ Selecione uma categoria');
            return;
        }

        if (postType === 'commercial') {
            const hasValidItem = commercialItems.some(item =>
                item.type === 'outline' ? item.text?.trim() : item.name?.trim()
            );
            if (!hasValidItem) {
                setError('❌ Adicione pelo menos um produto ou uma outline');
                return;
            }
        } else {
            if (outlines.length === 0 || outlines.some(o => !o.text.trim())) {
                setError('❌ Adicione pelo menos uma outline preenchida');
                return;
            }
        }

        setError('');
        setIsGenerating(true);
        setProgress('Conectando ao servidor...');

        try {
            const response = await fetch('/api/admin/posts/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postType,
                    commercialSubType: postType === 'commercial' ? commercialSubType : undefined,
                    title,
                    slug,
                    author,
                    category,
                    outlines: postType === 'informational' ? outlines : undefined,
                    commercialItems: postType === 'commercial' ? commercialItems : undefined,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Erro ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.step === 'progress') setProgress(data.message);
                                if (data.step === 'done') {
                                    setProgress('Post publicado com sucesso!');
                                    showToast('success', `Post "${data.title}" publicado!`, 'Redirecionando...');
                                    setTimeout(() => { window.location.href = '/admin/posts'; }, 2000);
                                    return;
                                }
                                if (data.step === 'error') throw new Error(data.error);
                            } catch (e) {
                                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
                            }
                        }
                    }
                }
            }

            const result = await response.json?.() || {};
            if (result.success) {
                setProgress('Post publicado com sucesso!');
                showToast('success', `Post "${title}" publicado!`, 'Redirecionando...');
                setTimeout(() => { window.location.href = '/admin/posts'; }, 2000);
            } else {
                setError(`❌ ${result.error || 'Erro desconhecido'}`);
                setProgress('');
            }
        } catch (error: any) {
            console.error('\x1b[31m✗ Erro ao gerar post:\x1b[0m', error);
            setError(`❌ ${error.message || 'Erro ao gerar post'}`);
            setProgress('');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-[#e5e5e5] mb-2">
                        Posts com IA
                    </h1>
                    <p className="text-[#a3a3a3]">
                        Gere posts completos automaticamente usando Inteligência Artificial
                    </p>
                </div>
                <a 
                    href="/admin/posts"
                    className="admin-btn admin-btn-secondary text-sm"
                >
                    ← Voltar para Posts
                </a>
            </div>

            {/* Tipo de Post */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                    Tipo de Post
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setPostType('informational')}
                        className={`p-6 rounded-xl border-2 transition-all ${
                            postType === 'informational'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                    >
                        <div className="text-3xl mb-2">📚</div>
                        <div className="font-bold text-[#e5e5e5] mb-1">Post Informacional</div>
                        <div className="text-sm text-[#a3a3a3]">
                            Artigos educativos e informativos
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPostType('commercial')}
                        className={`p-6 rounded-xl border-2 transition-all ${
                            postType === 'commercial'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                    >
                        <div className="text-3xl mb-2">💼</div>
                        <div className="font-bold text-[#e5e5e5] mb-1">Post Comercial</div>
                        <div className="text-sm text-[#a3a3a3]">
                            Guias e reviews focados em conversão
                        </div>
                    </button>
                </div>

                {/* Sub-tipo comercial (Guia dos melhores | SPR) */}
                {postType === 'commercial' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm font-semibold text-[#a3a3a3] mb-3">Sub-tipo do post comercial</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setCommercialSubType('guia-melhores')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                    commercialSubType === 'guia-melhores'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className="text-2xl mb-1">📋</div>
                                <div className="font-bold text-[#e5e5e5] text-sm">Guia dos melhores</div>
                                <div className="text-xs text-[#a3a3a3]">Listas ranqueadas (ex: Os 10 melhores X)</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCommercialSubType('spr')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                    commercialSubType === 'spr'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className="text-2xl mb-1">⭐</div>
                                <div className="font-bold text-[#e5e5e5] text-sm">SPR (Single Product Review)</div>
                                <div className="text-xs text-[#a3a3a3]">Review de um único produto/serviço</div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Informações Básicas */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                    Informações Básicas
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            Título do Post *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="admin-input"
                            placeholder="Ex: Como Cuidar da Sua Saúde Mental"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            Slug *
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="admin-input"
                            placeholder="como-cuidar-da-sua-saude-mental"
                        />
                        <p className="text-xs text-[#737373] mt-1">
                            O slug será gerado automaticamente a partir do título, mas você pode editá-lo.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Autor *
                            </label>
                            <select
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className="admin-input"
                            >
                                <option value="">Selecione um autor</option>
                                {authors.map((a) => (
                                    <option key={a.slug} value={a.slug}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Categoria *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="admin-input"
                            >
                                <option value="">Selecione uma categoria</option>
                                {categories.map((c) => (
                                    <option key={c.slug} value={c.slug}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Informacional: só outlines */}
            {postType === 'informational' && (
                <div className="admin-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-heading font-bold text-[#e5e5e5]">
                            Estrutura do Post (Outlines)
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => addOutline('h1')} className="admin-btn admin-btn-secondary text-sm">+ H1</button>
                            <button type="button" onClick={() => addOutline('h2')} className="admin-btn admin-btn-secondary text-sm">+ H2</button>
                            <button type="button" onClick={() => addOutline('h3')} className="admin-btn admin-btn-secondary text-sm">+ H3</button>
                            <button type="button" onClick={() => addOutline('h4')} className="admin-btn admin-btn-secondary text-sm">+ H4</button>
                        </div>
                    </div>
                    <p className="text-sm text-[#a3a3a3] mb-4">
                        Defina a estrutura do post usando títulos (H1, H2, H3, H4). A IA irá gerar o conteúdo completo para cada seção.
                    </p>
                    <p className="text-xs text-[#737373] mb-4 flex items-center gap-2">
                        <span className="text-primary">ℹ</span>
                        Introdução e conclusão são geradas automaticamente — não é necessário adicioná-las.
                    </p>
                    {outlines.length > 0 ? (
                        <div className="space-y-3">
                            {outlines.map((outline, index) => (
                                <div key={index} className="admin-card p-4">
                                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center w-full min-w-0">
                                        <span className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 ${outline.level === 'h1' ? 'bg-primary/20 text-primary' : outline.level === 'h2' ? 'bg-blue-500/20 text-blue-400' : outline.level === 'h3' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {outline.level.toUpperCase()}
                                        </span>
                                        <input type="text" value={outline.text} onChange={(e) => updateOutline(index, { text: e.target.value })} className="admin-input w-full min-w-0" placeholder={`Título do ${outline.level.toUpperCase()}...`} />
                                        <input type="number" min={50} max={2000} value={outline.minWords ?? ''} onChange={(e) => { const v = e.target.value.trim(); const n = v ? Math.max(50, Math.min(2000, parseInt(v, 10) || 0)) : 0; updateOutline(index, { minWords: n || undefined }); }} className="admin-input w-20 shrink-0" placeholder="100-150" title="Palavras (padrão: 100-150)" />
                                        <div className="flex gap-1 shrink-0">
                                            <button type="button" onClick={() => moveOutline(index, 'up')} disabled={index === 0} className="text-xs text-[#737373] hover:text-[#e5e5e5] disabled:opacity-30">↑</button>
                                            <button type="button" onClick={() => moveOutline(index, 'down')} disabled={index === outlines.length - 1} className="text-xs text-[#737373] hover:text-[#e5e5e5] disabled:opacity-30">↓</button>
                                        </div>
                                        <button type="button" onClick={() => removeOutline(index)} className="text-xs text-red-400 hover:text-red-300 shrink-0">Remover</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
                            <p className="text-[#737373] mb-2">Nenhuma outline adicionada</p>
                            <p className="text-xs text-[#737373]">Clique nos botões acima para adicionar títulos</p>
                        </div>
                    )}
                </div>
            )}

            {/* Comercial: bloco unificado — outlines + produtos na mesma lista, ordem preservada */}
            {postType === 'commercial' && (
                <div className="admin-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-heading font-bold text-[#e5e5e5]">
                            Estrutura do Post
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => addCommercialItem('outline', 'h1')} className="admin-btn admin-btn-secondary text-sm">+ H1</button>
                            <button type="button" onClick={() => addCommercialItem('outline', 'h2')} className="admin-btn admin-btn-secondary text-sm">+ H2</button>
                            <button type="button" onClick={() => addCommercialItem('outline', 'h3')} className="admin-btn admin-btn-secondary text-sm">+ H3</button>
                            <button type="button" onClick={() => addCommercialItem('outline', 'h4')} className="admin-btn admin-btn-secondary text-sm">+ H4</button>
                            <button type="button" onClick={() => addCommercialItem('product')} className="admin-btn admin-btn-primary text-sm">+ Produto</button>
                        </div>
                    </div>
                    <p className="text-sm text-[#a3a3a3] mb-4">
                        Adicione outlines (seções como metodologia, critérios) e produtos na ordem desejada. Use ↑/↓ para reordenar.
                    </p>
                    <p className="text-xs text-[#737373] mb-4 flex items-center gap-2">
                        <span className="text-primary">ℹ</span>
                        Introdução e conclusão são geradas automaticamente — não é necessário adicioná-las.
                    </p>
                    {commercialItems.length > 0 ? (
                        <div className="space-y-3">
                            {commercialItems.map((item, index) => (
                                <div key={index} className="admin-card p-4">
                                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center w-full min-w-0">
                                        {item.type === 'outline' ? (
                                            <>
                                                <select
                                                    value={item.level}
                                                    onChange={(e) => updateCommercialItem(index, { level: e.target.value as 'h1' | 'h2' | 'h3' | 'h4' })}
                                                    className="admin-input w-20 shrink-0"
                                                    title="Nível"
                                                >
                                                    <option value="h1">H1</option>
                                                    <option value="h2">H2</option>
                                                    <option value="h3">H3</option>
                                                    <option value="h4">H4</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={item.text}
                                                    onChange={(e) => updateCommercialItem(index, { text: e.target.value })}
                                                    className="admin-input w-full min-w-0"
                                                    placeholder="Título da seção (ex: Metodologia, Critérios...)"
                                                />
                                                <input type="number" min={50} max={2000} value={item.minWords ?? ''} onChange={(e) => { const v = e.target.value.trim(); const n = v ? Math.max(50, Math.min(2000, parseInt(v, 10) || 0)) : 0; updateCommercialItem(index, { minWords: n || undefined }); }} className="admin-input w-20 shrink-0" placeholder="100-150" title="Palavras (padrão: 100-150)" />
                                            </>
                                        ) : (
                                            <>
                                                <span className="px-3 py-1 rounded text-xs font-bold shrink-0 bg-amber-500/20 text-amber-400">Produto</span>
                                                <div className="flex-1 min-w-0" />
                                                <span className="text-xs text-[#737373] shrink-0">100-150</span>
                                            </>
                                        )}
                                        <div className="flex gap-1 shrink-0">
                                            <button type="button" onClick={() => moveCommercialItem(index, 'up')} disabled={index === 0} className="text-xs text-[#737373] hover:text-[#e5e5e5] disabled:opacity-30">↑</button>
                                            <button type="button" onClick={() => moveCommercialItem(index, 'down')} disabled={index === commercialItems.length - 1} className="text-xs text-[#737373] hover:text-[#e5e5e5] disabled:opacity-30">↓</button>
                                        </div>
                                        <button type="button" onClick={() => removeCommercialItem(index)} className="text-xs text-red-400 hover:text-red-300 shrink-0">Remover</button>
                                    </div>
                                    {item.type === 'outline' ? null : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">Nome do produto *</label>
                                                    <input type="text" value={item.name} onChange={(e) => updateCommercialItem(index, { name: e.target.value })} className="admin-input" placeholder="Ex: Produto X Pro" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">URL da imagem</label>
                                                    <input type="url" value={item.imageUrl} onChange={(e) => updateCommercialItem(index, { imageUrl: e.target.value })} className="admin-input" placeholder="https://exemplo.com/imagem.jpg" />
                                                </div>
                                            </div>
                                            {item.imageUrl && (
                                                <div className="mt-2">
                                                    <img src={item.imageUrl} alt={item.name || 'Preview'} className="h-16 object-contain rounded border border-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
                            <p className="text-[#737373] mb-2">Nenhum item adicionado</p>
                            <p className="text-xs text-[#737373] mb-3">Use os botões acima para adicionar outlines (H1, H2, H3, H4) ou produtos na ordem desejada</p>
                            <div className="flex gap-2 justify-center flex-wrap">
                                <button type="button" onClick={() => addCommercialItem('outline', 'h1')} className="admin-btn admin-btn-secondary text-sm">+ H1</button>
                                <button type="button" onClick={() => addCommercialItem('outline', 'h2')} className="admin-btn admin-btn-secondary text-sm">+ H2</button>
                                <button type="button" onClick={() => addCommercialItem('outline', 'h3')} className="admin-btn admin-btn-secondary text-sm">+ H3</button>
                                <button type="button" onClick={() => addCommercialItem('outline', 'h4')} className="admin-btn admin-btn-secondary text-sm">+ H4</button>
                                <button type="button" onClick={() => addCommercialItem('product')} className="admin-btn admin-btn-primary text-sm">+ Produto</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Erro */}
            {error && (
                <div className="admin-card p-4 bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Progresso — feedback claro para o usuário acompanhar a geração */}
            {progress && (
                <div className="admin-card p-6 bg-primary/5 border-2 border-primary/30">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                            <span className="text-2xl">{isGenerating ? '✨' : '✅'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#e5e5e5] mb-1">
                                {isGenerating ? 'Criando seu post...' : 'Concluído!'}
                            </h4>
                            <p className="text-[#a3a3a3] text-sm leading-relaxed">
                                {progress}
                            </p>
                            <p className="text-xs text-[#737373] mt-2">
                                {isGenerating ? 'Aguarde enquanto a IA escreve cada seção. Isso pode levar alguns minutos.' : 'Redirecionando para a lista de posts...'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Botão Gerar */}
            <div className="flex items-center justify-end gap-4">
                <a 
                    href="/admin/posts"
                    className="admin-btn admin-btn-ghost"
                >
                    Cancelar
                </a>
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !title || !slug || !author || !category || (postType === 'informational' ? (outlines.length === 0 || outlines.some(o => !o.text.trim())) : !commercialItems.some(i => (i.type === 'outline' && i.text?.trim()) || (i.type === 'product' && i.name?.trim())))}
                    className="admin-btn admin-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Gerando...
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            Gerar e Publicar Post
                        </>
                    )}
                </button>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
