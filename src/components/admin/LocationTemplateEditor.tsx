/**
 * LocationTemplateEditor.tsx
 *
 * Editor do template padrão das páginas locais (/{bairro}/{servico}).
 * Define textos, benefícios e SEO usados quando o serviço não tem conteúdo gerado por IA.
 * Variáveis: {cidade}, {estado}, {servico}, {empresa}, {bairro}, {telefone}
 */

import { useState, useEffect } from 'react';

interface TemplateData {
    heroTitle?: string;
    heroSubtitle?: string;
    pageContent?: string;
    benefits?: string[];
    metaTitle?: string;
    metaDescription?: string;
}

const VARS_HELP = [
    { var: '{cidade}', desc: 'Nome da cidade' },
    { var: '{bairro}', desc: 'Nome do bairro' },
    { var: '{estado}', desc: 'Sigla (SP, RJ...)' },
    { var: '{servico}', desc: 'Nome do serviço' },
    { var: '{empresa}', desc: 'Nome da empresa' },
    { var: '{telefone}', desc: 'Telefone' },
];

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-subtle)', marginBottom: '0.4rem' };

export default function LocationTemplateEditor() {
    const [template, setTemplate] = useState<TemplateData>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

    useEffect(() => {
        fetch('/api/admin/location-template')
            .then(r => r.json())
            .then(d => { if (d.success) setTemplate(d.template || {}); })
            .finally(() => setLoading(false));
    }, []);

    function setBenefit(idx: number, val: string) {
        const arr = [...(template.benefits || [])];
        arr[idx] = val;
        setTemplate(t => ({ ...t, benefits: arr }));
    }
    function addBenefit() {
        setTemplate(t => ({ ...t, benefits: [...(t.benefits || []), ''] }));
    }
    function removeBenefit(idx: number) {
        setTemplate(t => ({ ...t, benefits: (t.benefits || []).filter((_, i) => i !== idx) }));
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch('/api/admin/location-template', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(template),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ text: '✅ Template salvo!', type: 'ok' });
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <p style={{ color: 'var(--admin-text-subtle)' }}>Carregando template...</p>;
    }

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 680 }}>
            <div className="admin-card" style={{ padding: '1rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', marginBottom: '0.5rem' }}>Variáveis disponíveis</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {VARS_HELP.map(v => (
                        <code key={v.var} style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.78rem' }}>{v.var}</code>
                    ))}
                </div>
            </div>

            <div className="admin-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '1rem' }}>Hero (topo da página)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                        <label style={lbl}>Título</label>
                        <input className="admin-input" value={template.heroTitle || ''} onChange={e => setTemplate(t => ({ ...t, heroTitle: e.target.value }))} placeholder="{servico} em {cidade} - {estado}" />
                    </div>
                    <div>
                        <label style={lbl}>Subtítulo</label>
                        <textarea className="admin-input" rows={2} value={template.heroSubtitle || ''} onChange={e => setTemplate(t => ({ ...t, heroSubtitle: e.target.value }))} placeholder="Serviços de {servico} em {cidade} e região..." />
                    </div>
                </div>
            </div>

            <div className="admin-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '1rem' }}>Conteúdo padrão</h3>
                <div>
                    <label style={lbl}>Texto (usado quando o serviço não tem conteúdo gerado por IA)</label>
                    <textarea className="admin-input" rows={6} value={template.pageContent || ''} onChange={e => setTemplate(t => ({ ...t, pageContent: e.target.value }))} placeholder="Procurando {servico} em {cidade}? A {empresa} oferece..." style={{ resize: 'vertical' }} />
                </div>
            </div>

            <div className="admin-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--admin-text)' }}>Benefícios (chips no hero)</h3>
                    <button type="button" className="admin-btn admin-btn-ghost" onClick={addBenefit} style={{ fontSize: '0.8rem' }}>+ Adicionar</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(template.benefits || []).map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input className="admin-input" value={b} onChange={e => setBenefit(i, e.target.value)} placeholder="Orçamento gratuito em {cidade}" style={{ flex: 1 }} />
                            <button type="button" onClick={() => removeBenefit(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.2rem' }}>×</button>
                        </div>
                    ))}
                    {(template.benefits || []).length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)' }}>Nenhum benefício. Clique em + Adicionar.</p>}
                </div>
            </div>

            <div className="admin-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '1rem' }}>SEO</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                        <label style={lbl}>Meta title</label>
                        <input className="admin-input" value={template.metaTitle || ''} onChange={e => setTemplate(t => ({ ...t, metaTitle: e.target.value }))} placeholder="{servico} em {cidade} | {empresa}" />
                    </div>
                    <div>
                        <label style={lbl}>Meta description</label>
                        <textarea className="admin-input" rows={2} value={template.metaDescription || ''} onChange={e => setTemplate(t => ({ ...t, metaDescription: e.target.value }))} placeholder="Precisa de {servico} em {cidade}? Orçamento grátis." />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar template'}
                </button>
                {msg && <span style={{ fontSize: '0.875rem', color: msg.type === 'ok' ? '#4ade80' : '#f87171' }}>{msg.text}</span>}
            </div>
        </form>
    );
}
