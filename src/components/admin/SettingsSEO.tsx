/**
 * SettingsSEO.tsx
 *
 * Componente React para configuração de SEO técnico: sitemap.xml e robots.txt.
 * Permite ao usuário:
 *   - Definir URL canônica do site (base para sitemap e robots)
 *   - Ativar/desativar geração automática de sitemap e robots.txt
 *   - Configurar paths bloqueados no robots.txt (ex: /admin, /api)
 *   - Testar os endpoints via links diretos
 *
 * Salva em settings.yaml via PUT /api/admin/site-settings.
 */

import { useState, useEffect } from 'react';

type BlogPermalinkStructure = 'postname' | 'year_month' | 'year_month_day';
type BlogUrlPrefix = 'blog' | 'root';

export default function SettingsSEO() {
    const [canonicalUrl, setCanonicalUrl] = useState('');
    const [generateSitemap, setGenerateSitemap] = useState(true);
    const [generateRobots, setGenerateRobots] = useState(true);
    const [robotsDisallow, setRobotsDisallow] = useState('');
    const [blogPermalinkStructure, setBlogPermalinkStructure] = useState<BlogPermalinkStructure>('postname');
    const [blogUrlPrefix, setBlogUrlPrefix] = useState<BlogUrlPrefix>('blog');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [loaded, setLoaded] = useState(false);

    /** Normaliza domínio: "meusite.com.br" → "https://meusite.com.br" */
    function toFullUrl(domain: string): string {
        const t = domain.trim().toLowerCase();
        if (!t) return '';
        let s = t.replace(/^https?:\/\//, '').replace(/\/+$/, '').split('/')[0];
        return s ? `https://${s}` : '';
    }
    /** De full URL para exibição simples: "https://meusite.com.br" → "meusite.com.br" */
    function toDisplayDomain(url: string): string {
        const t = url.trim();
        if (!t) return '';
        return t.replace(/^https?:\/\//, '').replace(/\/+$/, '').split('/')[0] || '';
    }

    useEffect(() => {
        fetch('/api/admin/site-settings')
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    const d = res.data;
                    setCanonicalUrl(toDisplayDomain(d.canonicalUrl || ''));
                    setGenerateSitemap(d.generateSitemap !== false);
                    setGenerateRobots(d.generateRobots !== false);
                    setRobotsDisallow(Array.isArray(d.robotsDisallow) ? d.robotsDisallow.join('\n') : '/admin\n/api');
                    const perm = d.blogPermalinkStructure as BlogPermalinkStructure;
                    setBlogPermalinkStructure(perm && ['postname','year_month','year_month_day'].includes(perm) ? perm : 'postname');
                    const pref = d.blogUrlPrefix as BlogUrlPrefix;
                    setBlogUrlPrefix(pref && ['blog','root'].includes(pref) ? pref : 'blog');
                }
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    async function handleSave() {
        setSaving(true);
        setSaveStatus('idle');
        const disallow = robotsDisallow
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
        try {
            const fullUrl = toFullUrl(canonicalUrl);
            const res = await fetch('/api/admin/site-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    canonicalUrl: fullUrl,
                    generateSitemap,
                    generateRobots,
                    robotsDisallow: disallow,
                    blogPermalinkStructure,
                    blogUrlPrefix,
                }),
            });
            const data = await res.json();
            setSaveStatus(data.success ? 'success' : 'error');
        } catch {
            setSaveStatus('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    }

    if (!loaded) {
        return (
            <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>
                Carregando configurações...
            </div>
        );
    }

    const base = toFullUrl(canonicalUrl);
    const sitemapUrl = base ? `${base}/sitemap-index.xml` : null;
    const robotsUrl = base ? `${base}/robots.txt` : null;

    return (
        <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.2)',
            }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                    O sitemap e o robots.txt ajudam o Google a indexar seu site corretamente.
                    Submeta a URL do sitemap em <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary, #6366f1)', textDecoration: 'underline' }}>Google Search Console</a>.
                </p>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a3a3a3', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Domínio do site
                </label>
                <input
                    type="text"
                    value={canonicalUrl}
                    onChange={e => setCanonicalUrl(e.target.value)}
                    placeholder="seusite.com.br"
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#e5e5e5',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                    }}
                />
                <p style={{ fontSize: '0.7rem', color: '#52525b', marginTop: '0.35rem' }}>
                    Digite apenas o domínio (ex: meusite.com.br ou www.meusite.com.br). O https:// é adicionado automaticamente.
                </p>
            </div>

            {/* Seção destacada de URLs do Blog */}
            <div style={{
                padding: '1.5rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                border: '2px solid rgba(168,85,247,0.2)',
                position: 'relative',
            }}>
                {/* Badge de destaque */}
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '20px',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    ⚡ Mais Solicitado
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 700, 
                        color: '#e5e5e5', 
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🔗 Estrutura de URLs dos Posts
                    </h3>
                    <p style={{ 
                        fontSize: '0.85rem', 
                        color: '#c7d2fe', 
                        lineHeight: 1.5,
                        margin: 0 
                    }}>
                        Escolha se quer URLs mais limpas removendo o "/blog" ou manter a estrutura tradicional do blog.
                    </p>
                </div>

                {/* Opções de Prefixo com destaque visual */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                        display: 'block', 
                        fontSize: '0.8rem', 
                        fontWeight: 600, 
                        color: '#d8b4fe', 
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Prefixo das URLs
                    </label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Opção COM /blog */}
                        <label style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '1rem', 
                            cursor: 'pointer',
                            padding: '1rem',
                            borderRadius: '8px',
                            background: blogUrlPrefix === 'blog' 
                                ? 'rgba(99,102,241,0.15)' 
                                : 'rgba(255,255,255,0.02)',
                            border: `2px solid ${blogUrlPrefix === 'blog' 
                                ? 'rgba(99,102,241,0.3)' 
                                : 'rgba(255,255,255,0.08)'}`,
                            transition: 'all 0.2s ease'
                        }}>
                            <input
                                type="radio"
                                name="blogUrlPrefix"
                                checked={blogUrlPrefix === 'blog'}
                                onChange={() => setBlogUrlPrefix('blog')}
                                style={{ 
                                    accentColor: 'var(--primary, #6366f1)',
                                    marginTop: '0.125rem',
                                    flexShrink: 0
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontSize: '0.95rem', 
                                    fontWeight: 600, 
                                    color: '#e5e5e5',
                                    marginBottom: '0.25rem'
                                }}>
                                    📁 Com /blog (Tradicional)
                                </div>
                                <div style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#94a3b8',
                                    marginBottom: '0.5rem'
                                }}>
                                    URLs ficam organizadas em uma seção dedicada
                                </div>
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    color: '#c7d2fe',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    🌐 exemplo.com<strong>/blog</strong>/{blogPermalinkStructure === 'postname' ? 'nome-do-post' : blogPermalinkStructure === 'year_month' ? '2025/03/nome-do-post' : '2025/03/17/nome-do-post'}
                                </div>
                            </div>
                        </label>

                        {/* Opção SEM /blog */}
                        <label style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '1rem', 
                            cursor: 'pointer',
                            padding: '1rem',
                            borderRadius: '8px',
                            background: blogUrlPrefix === 'root' 
                                ? 'rgba(34,197,94,0.15)' 
                                : 'rgba(255,255,255,0.02)',
                            border: `2px solid ${blogUrlPrefix === 'root' 
                                ? 'rgba(34,197,94,0.3)' 
                                : 'rgba(255,255,255,0.08)'}`,
                            transition: 'all 0.2s ease'
                        }}>
                            <input
                                type="radio"
                                name="blogUrlPrefix"
                                checked={blogUrlPrefix === 'root'}
                                onChange={() => setBlogUrlPrefix('root')}
                                style={{ 
                                    accentColor: '#22c55e',
                                    marginTop: '0.125rem',
                                    flexShrink: 0
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontSize: '0.95rem', 
                                    fontWeight: 600, 
                                    color: '#e5e5e5',
                                    marginBottom: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    ✨ Sem /blog (URLs Limpas)
                                    <span style={{
                                        background: '#22c55e',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase'
                                    }}>
                                        Popular
                                    </span>
                                </div>
                                <div style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#94a3b8',
                                    marginBottom: '0.5rem'
                                }}>
                                    URLs mais limpas e amigáveis para SEO
                                </div>
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    color: '#86efac',
                                    background: 'rgba(34,197,94,0.05)',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(34,197,94,0.2)'
                                }}>
                                    🌐 exemplo.com/{blogPermalinkStructure === 'postname' ? 'nome-do-post' : blogPermalinkStructure === 'year_month' ? '2025/03/nome-do-post' : '2025/03/17/nome-do-post'}
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Estrutura de Data */}
                <div>
                    <label style={{ 
                        display: 'block', 
                        fontSize: '0.8rem', 
                        fontWeight: 600, 
                        color: '#d8b4fe', 
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        📅 Incluir Data na URL
                    </label>
                    
                    <select
                        value={blogPermalinkStructure}
                        onChange={e => setBlogPermalinkStructure(e.target.value as BlogPermalinkStructure)}
                        style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            borderRadius: '8px',
                            border: '2px solid rgba(168,85,247,0.2)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#e5e5e5',
                            fontSize: '0.9rem',
                            boxSizing: 'border-box',
                            fontWeight: 500,
                        }}
                    >
                        <option value="postname">
                            📝 Apenas nome — {blogUrlPrefix === 'root' ? '/nome-do-post' : '/blog/nome-do-post'}
                        </option>
                        <option value="year_month">
                            📆 Ano/mês — {blogUrlPrefix === 'root' ? '/2025/03/nome-do-post' : '/blog/2025/03/nome-do-post'}
                        </option>
                        <option value="year_month_day">
                            📊 Data completa — {blogUrlPrefix === 'root' ? '/2025/03/17/nome-do-post' : '/blog/2025/03/17/nome-do-post'}
                        </option>
                    </select>
                </div>

                {/* Aviso importante */}
                <div style={{
                    marginTop: '1rem',
                    padding: '0.875rem',
                    borderRadius: '8px',
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.25)',
                }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.5rem'
                    }}>
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                        <div>
                            <p style={{ 
                                fontSize: '0.8rem', 
                                color: '#fcd34d', 
                                fontWeight: 600, 
                                margin: '0 0 0.25rem' 
                            }}>
                                Atenção ao alterar URLs
                            </p>
                            <p style={{ 
                                fontSize: '0.75rem', 
                                color: '#e5e5e5', 
                                margin: 0,
                                lineHeight: 1.4 
                            }}>
                                Mudanças afetam posts já publicados. Configure antes de criar conteúdo ou use redirects para evitar links quebrados.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a3a3a3', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recursos de SEO técnico
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.9rem', color: '#e5e5e5' }}>
                        <input
                            type="checkbox"
                            checked={generateSitemap}
                            onChange={e => setGenerateSitemap(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary, #6366f1)' }}
                        />
                        Gerar sitemap.xml automaticamente
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.9rem', color: '#e5e5e5' }}>
                        <input
                            type="checkbox"
                            checked={generateRobots}
                            onChange={e => setGenerateRobots(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary, #6366f1)' }}
                        />
                        Gerar robots.txt automaticamente
                    </label>
                </div>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a3a3a3', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Paths bloqueados no robots.txt
                </label>
                <textarea
                    value={robotsDisallow}
                    onChange={e => setRobotsDisallow(e.target.value)}
                    rows={3}
                    placeholder="/admin&#10;/api"
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#e5e5e5',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                    }}
                />
                <p style={{ fontSize: '0.7rem', color: '#52525b', marginTop: '0.35rem' }}>
                    Um path por linha. Ex: /admin, /api (Google não vai indexar essas áreas)
                </p>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    background: saveStatus === 'success' ? '#16a34a' : saveStatus === 'error' ? '#dc2626' : 'var(--primary, #6366f1)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    border: 'none',
                    transition: 'all 0.15s',
                    alignSelf: 'flex-start',
                }}
            >
                {saving ? '⏳ Salvando...' : saveStatus === 'success' ? '✅ Salvo!' : saveStatus === 'error' ? '❌ Erro ao salvar' : '💾 Salvar Configurações'}
            </button>

            <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
            }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                    Links para testar
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <a href="/sitemap-index.xml" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary, #6366f1)', textDecoration: 'none' }}>
                        📄 Sitemap (site atual) — /sitemap-index.xml
                    </a>
                    <a href="/robots.txt" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary, #6366f1)', textDecoration: 'none' }}>
                        🤖 robots.txt (site atual) — /robots.txt
                    </a>
                    {sitemapUrl && base && (
                        <p style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.25rem' }}>
                            Em produção: <a href={sitemapUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary, #6366f1)' }}>{sitemapUrl}</a>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
