/**
 * TemplateSelector.tsx
 *
 * Seletor de templates de nicho para o Modo Local.
 * Exibe cards com os templates disponíveis, destaca o ativo e permite aplicar outro.
 * Ao trocar de template: remove todos os serviços (bairros mantidos), substitui copy.
 * Modal de confirmação exibe aviso antes de aplicar.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast, ToastList } from './Toast';

interface TemplateData {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    niche: { name: string; slug: string };
    services: { title: string; slug: string }[];
}

interface Props {
    activeTemplateId?: string | null;
}

export default function TemplateSelector({ activeTemplateId }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [templates, setTemplates] = useState<TemplateData[]>([]);
    const [loading, setLoading] = useState(true);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<TemplateData | null>(null);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/templates');
            const data = await res.json();
            if (data.templates) setTemplates(data.templates);
        } catch {
            showToast('error', 'Erro', 'Não foi possível carregar os templates');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleSelectTemplate = (t: TemplateData) => {
        if (t.id === activeTemplateId) return;
        setConfirmTarget(t);
    };

    const handleConfirmApply = async () => {
        const target = confirmTarget;
        if (!target) return;
        setApplyingId(target.id);
        setConfirmTarget(null);
        try {
            const res = await fetch('/api/admin/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId: target.id }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Template aplicado', data.message);
                window.location.reload();
            } else {
                showToast('error', 'Erro', data.error || 'Falha ao aplicar template');
            }
        } catch {
            showToast('error', 'Erro', 'Falha ao aplicar template');
        } finally {
            setApplyingId(null);
        }
    };

    const handleCancelConfirm = () => {
        setConfirmTarget(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]" style={{ color: 'var(--admin-text)' }}>
                Carregando templates...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                        Templates de Nicho
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--admin-text-subtle)' }}>
                        Escolha um template para transformar seu site. Ao trocar, todos os serviços serão removidos. Os bairros serão mantidos.
                    </p>
                </div>
            </div>

            {activeTemplateId && (
                <p className="text-sm" style={{ color: 'var(--admin-text-subtle)' }}>
                    Template ativo: <strong style={{ color: 'var(--admin-text)' }}>{templates.find(t => t.id === activeTemplateId)?.name ?? activeTemplateId}</strong>
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => {
                    const isActive = t.id === activeTemplateId;
                    const isApplying = applyingId === t.id;
                    const isDisabled = isActive || !!applyingId;

                    return (
                        <div
                            key={t.id}
                            className="rounded-xl border-2 overflow-hidden transition-all"
                            style={{
                                borderColor: isActive ? (t.color || '#3b82f6') : 'var(--admin-border)',
                                background: 'var(--admin-surface)',
                            }}
                        >
                            <div
                                className="h-2 w-full"
                                style={{ background: t.color || '#6b7280' }}
                            />
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-2xl">{t.icon || '📋'}</span>
                                    {isActive && (
                                        <span
                                            className="text-xs font-medium px-2 py-0.5 rounded"
                                            style={{
                                                background: t.color ? `${t.color}20` : 'var(--admin-border)',
                                                color: t.color || 'var(--admin-text)',
                                            }}
                                        >
                                            Ativo
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-semibold mt-2" style={{ color: 'var(--admin-text)' }}>
                                    {t.name}
                                </h3>
                                {t.description && (
                                    <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--admin-text-subtle)' }}>
                                        {t.description}
                                    </p>
                                )}
                                <p className="text-xs mt-2" style={{ color: 'var(--admin-text-subtle)' }}>
                                    {t.services?.length ?? 0} serviços
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleSelectTemplate(t)}
                                    disabled={isDisabled}
                                    className="mt-3 w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: isActive ? 'var(--admin-border)' : (t.color || '#3b82f6'),
                                        color: isActive ? 'var(--admin-text-subtle)' : '#fff',
                                    }}
                                >
                                    {isApplying
                                        ? 'Aplicando...'
                                        : isActive
                                        ? 'Em uso'
                                        : 'Usar este template'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de confirmação */}
            {confirmTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                    onClick={handleCancelConfirm}
                >
                    <div
                        className="rounded-xl max-w-md w-full p-6 shadow-xl"
                        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{confirmTarget.icon || '⚠️'}</span>
                            <div>
                                <h3 className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                                    Aplicar template &quot;{confirmTarget.name}&quot;?
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--admin-text-subtle)' }}>
                                    Esta ação não pode ser desfeita automaticamente.
                                </p>
                            </div>
                        </div>
                        <div
                            className="rounded-lg p-4 mb-6 text-sm"
                            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
                        >
                            <p className="font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                                Ao trocar de template:
                            </p>
                            <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--admin-text-subtle)' }}>
                                <li><strong>Todos os serviços</strong> serão removidos</li>
                                <li><strong>Bairros</strong> serão mantidos</li>
                                <li>A copy da home e das páginas locais será substituída</li>
                                <li>{confirmTarget.services?.length ?? 0} novos serviços serão criados</li>
                            </ul>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleCancelConfirm}
                                className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
                                style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmApply}
                                className="flex-1 py-2 px-4 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
                                style={{ background: confirmTarget.color || '#ef4444' }}
                            >
                                Sim, aplicar template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastList toasts={toasts} onRemove={removeToast} />
        </div>
    );
}
