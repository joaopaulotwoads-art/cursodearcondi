/**
 * HomeEditor8links.tsx
 *
 * Editor da página inicial para o tema 8links-test2.
 * Campos: Hero, About (parágrafo, stat, imagem, quote, blocks), Features.
 */

import React, { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface AboutBlock {
  icon: string;
  title: string;
  description: string;
}

interface Feature {
  title: string;
}

interface HomeData {
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  heroCtaUrl?: string;
  heroImage?: string;
  aboutParagraph?: string;
  aboutStatNumber?: string;
  aboutStatLabel?: string;
  aboutImage?: string;
  aboutQuote?: string;
  aboutBlocks?: AboutBlock[];
  aboutCtaText?: string;
  aboutCtaUrl?: string;
  featuresBadge?: string;
  featuresTitle?: string;
  featuresHighlight?: string;
  features?: Feature[];
}

interface Props {
  initialData?: HomeData;
  themeId?: string;
}

export default function HomeEditor8links({ initialData, themeId = '8links-test2' }: Props) {
  const { toasts, showToast, removeToast } = useToast();
  const [data, setData] = useState<HomeData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (isMounted && initialData) setData(initialData);
    else if (isMounted) setData({});
  }, [isMounted, initialData]);

  if (!isMounted) {
    return (
      <div className="space-y-6" style={{ minHeight: '400px' }}>
        <div className="p-8 text-center">
          <p className="text-[#a3a3a3]">Carregando editor...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/singletons/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, themeId }),
      });
      const result = await res.json();
      if (result.success) showToast('success', 'Salvo com sucesso!');
      else showToast('error', 'Erro ao salvar', result.error || '');
    } catch {
      showToast('error', 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const update = (field: keyof HomeData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateBlock = (i: number, field: keyof AboutBlock, value: string) => {
    setData((prev) => {
      const blocks = [...(prev.aboutBlocks || [])];
      blocks[i] = { ...blocks[i], [field]: value };
      return { ...prev, aboutBlocks: blocks };
    });
  };

  const updateFeature = (i: number, title: string) => {
    setData((prev) => {
      const f = [...(prev.features || [])];
      f[i] = { title };
      return { ...prev, features: f };
    });
  };

  const addFeature = () => {
    setData((prev) => ({ ...prev, features: [...(prev.features || []), { title: '' }] }));
  };

  const removeFeature = (i: number) => {
    setData((prev) => ({ ...prev, features: (prev.features || []).filter((_, j) => j !== i) }));
  };

  const handleImageUpload = async (field: 'heroImage' | 'aboutImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'general');
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) update(field, result.url);
      else showToast('error', 'Erro no upload');
    } catch {
      showToast('error', 'Erro no upload');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">Página Inicial (8links)</h2>
            <p className="text-sm text-[#a3a3a3]">Edite o conteúdo no formato do tema 8links</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => (window.location.href = '/admin/pages')} className="admin-btn admin-btn-secondary">
              Voltar
            </button>
            <button onClick={handleSave} disabled={isSaving} className="admin-btn admin-btn-primary disabled:opacity-50">
              {isSaving ? 'Salvando...' : '💾 Salvar'}
            </button>
          </div>
        </div>

        <div className="max-w-4xl space-y-6">
          <div className="admin-card p-6">
            <h3 className="text-lg font-bold text-[#e5e5e5] mb-4">Hero</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                <input type="text" value={data.heroTitle || ''} onChange={(e) => update('heroTitle', e.target.value)} className="admin-input" placeholder="Bem-vindo à 8links" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo</label>
                <textarea value={data.heroSubtitle || ''} onChange={(e) => update('heroSubtitle', e.target.value)} className="admin-input resize-none" rows={2} placeholder="Slogan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do botão</label>
                  <input type="text" value={data.heroCtaText || ''} onChange={(e) => update('heroCtaText', e.target.value)} className="admin-input" placeholder="Conheça o que fazemos" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">URL do botão</label>
                  <input type="text" value={data.heroCtaUrl || ''} onChange={(e) => update('heroCtaUrl', e.target.value)} className="admin-input" placeholder="/sobre" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Imagem de fundo</label>
                {data.heroImage && <img src={data.heroImage} alt="Hero" className="max-w-xs rounded-lg mb-2" />}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('heroImage', e)} className="admin-input" />
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h3 className="text-lg font-bold text-[#e5e5e5] mb-4">About</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Parágrafo</label>
                <textarea value={data.aboutParagraph || ''} onChange={(e) => update('aboutParagraph', e.target.value)} className="admin-input resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Número (ex: 10M+)</label>
                  <input type="text" value={data.aboutStatNumber || ''} onChange={(e) => update('aboutStatNumber', e.target.value)} className="admin-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Label</label>
                  <input type="text" value={data.aboutStatLabel || ''} onChange={(e) => update('aboutStatLabel', e.target.value)} className="admin-input" placeholder="Captados para clientes" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Imagem</label>
                {data.aboutImage && <img src={data.aboutImage} alt="About" className="max-w-xs rounded-lg mb-2" />}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('aboutImage', e)} className="admin-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Citação (na imagem)</label>
                <textarea value={data.aboutQuote || ''} onChange={(e) => update('aboutQuote', e.target.value)} className="admin-input resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-3">Blocos (2 itens)</label>
                {(data.aboutBlocks || []).map((b, i) => (
                  <div key={i} className="admin-card p-4 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={b.icon || ''} onChange={(e) => updateBlock(i, 'icon', e.target.value)} className="admin-input text-sm" placeholder="Emoji (⚡)" />
                      <input type="text" value={b.title || ''} onChange={(e) => updateBlock(i, 'title', e.target.value)} className="admin-input text-sm" placeholder="Título" />
                    </div>
                    <textarea value={b.description || ''} onChange={(e) => updateBlock(i, 'description', e.target.value)} className="admin-input text-sm mt-2 resize-none" rows={2} placeholder="Descrição" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto botão About</label>
                  <input type="text" value={data.aboutCtaText || ''} onChange={(e) => update('aboutCtaText', e.target.value)} className="admin-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">URL botão</label>
                  <input type="text" value={data.aboutCtaUrl || ''} onChange={(e) => update('aboutCtaUrl', e.target.value)} className="admin-input" />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h3 className="text-lg font-bold text-[#e5e5e5] mb-4">Features (Nossos diferenciais)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Badge</label>
                <input type="text" value={data.featuresBadge || ''} onChange={(e) => update('featuresBadge', e.target.value)} className="admin-input" placeholder="Nossos diferenciais" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                  <input type="text" value={data.featuresTitle || ''} onChange={(e) => update('featuresTitle', e.target.value)} className="admin-input" placeholder="Transformando negócios em" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Destaque</label>
                  <input type="text" value={data.featuresHighlight || ''} onChange={(e) => update('featuresHighlight', e.target.value)} className="admin-input" placeholder="histórias de sucesso digital" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-3">Itens</label>
                {(data.features || []).map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={f.title || ''} onChange={(e) => updateFeature(i, e.target.value)} className="admin-input flex-1" placeholder="Título do item" />
                    <button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-300 text-sm">Remover</button>
                  </div>
                ))}
                <button onClick={addFeature} className="admin-btn admin-btn-secondary text-sm">+ Adicionar item</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastList toasts={toasts} onRemove={removeToast} />
    </>
  );
}
