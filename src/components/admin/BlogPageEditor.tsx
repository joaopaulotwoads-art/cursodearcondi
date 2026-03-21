/**
 * BlogPageEditor.tsx
 *
 * Editor React para os textos da página de Blog (/blog).
 * Permite editar o título, destaque, descrição, badge e mensagens de estado vazio.
 * Salva via PUT /api/admin/singletons/blog.
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface BlogPageData {
    heroBadge?: string;
    heroTitle?: string;
    heroTitleHighlight?: string;
    heroDescription?: string;
    pageTitle?: string;
    emptyMessage?: string;
    emptySubMessage?: string;
}

interface Props {
    initialData?: BlogPageData;
    themeId?: string;
}

export default function BlogPageEditor({ initialData, themeId }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [data, setData] = useState<BlogPageData>(initialData || {});
    const [isSaving, setIsSaving] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (initialData) setData(initialData);
    }, [initialData]);

    if (!isMounted) {
        return (
            <div className="p-8 text-center" style={{ minHeight: '400px' }}>
                <p className="text-[#a3a3a3]">Carregando editor...</p>
            </div>
        );
    }

    const update = (field: keyof BlogPageData, value: string) =>
        setData(prev => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/singletons/blog', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, themeId }),
            });
            const json = await res.json();
            if (json.success) {
                showToast('success', 'Salvo!', 'Página do blog atualizada.');
            } else {
                showToast('error', 'Erro ao salvar', json.error || 'Tente novamente.');
            }
        } catch {
            showToast('error', 'Erro de conexão', 'Não foi possível salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">Página de Blog</h2>
                    <p className="text-sm text-[#a3a3a3]">Edite os textos exibidos na listagem de posts</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.location.href = '/admin/pages'} className="admin-btn admin-btn-secondary">
                        Voltar
                    </button>
                    <a href="/blog" target="_blank" className="admin-btn admin-btn-secondary text-sm">
                        👁️ Ver página
                    </a>
                    <button onClick={handleSave} disabled={isSaving} className="admin-btn admin-btn-primary disabled:opacity-50">
                        {isSaving ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>

            <div className="max-w-3xl space-y-6">

                {/* SEO */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">SEO</h3>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            Título da aba (tag &lt;title&gt;)
                        </label>
                        <input
                            type="text"
                            value={data.pageTitle || ''}
                            onChange={e => update('pageTitle', e.target.value)}
                            className="admin-input"
                            placeholder="Ex: Blog — Artigos e Novidades"
                        />
                    </div>
                </div>

                {/* Hero */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">Cabeçalho da Página</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Badge (pílula acima do título)</label>
                            <input
                                type="text"
                                value={data.heroBadge || ''}
                                onChange={e => update('heroBadge', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: 📝 Blog"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                    Título (parte normal)
                                </label>
                                <input
                                    type="text"
                                    value={data.heroTitle || ''}
                                    onChange={e => update('heroTitle', e.target.value)}
                                    className="admin-input"
                                    placeholder="Ex: Últimas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                    Título (parte colorida / destaque)
                                </label>
                                <input
                                    type="text"
                                    value={data.heroTitleHighlight || ''}
                                    onChange={e => update('heroTitleHighlight', e.target.value)}
                                    className="admin-input"
                                    placeholder="Ex: Novidades"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-[#737373]">
                            O título aparece como: <em>parte normal</em> <span style={{ background: 'linear-gradient(90deg,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>parte colorida</span>
                        </p>

                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Descrição / subtítulo</label>
                            <textarea
                                value={data.heroDescription || ''}
                                onChange={e => update('heroDescription', e.target.value)}
                                className="admin-input resize-none"
                                rows={2}
                                placeholder="Ex: Artigos sobre desenvolvimento web, SEO, JAMstack e tecnologia"
                            />
                        </div>
                    </div>
                </div>

                {/* Estado vazio */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-1">Mensagem sem posts</h3>
                    <p className="text-xs text-[#737373] mb-4">Exibida quando não há posts publicados</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Mensagem principal</label>
                            <input
                                type="text"
                                value={data.emptyMessage || ''}
                                onChange={e => update('emptyMessage', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Nenhum post publicado ainda"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Mensagem secundária</label>
                            <input
                                type="text"
                                value={data.emptySubMessage || ''}
                                onChange={e => update('emptySubMessage', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Volte em breve para ver nossos artigos!"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
