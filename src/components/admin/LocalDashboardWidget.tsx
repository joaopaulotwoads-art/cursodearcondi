/**
 * LocalDashboardWidget.tsx
 *
 * Widget do Modo Local no Dashboard — progresso visual, conquistas e próximo passo.
 * Recebe métricas do servidor para evitar fetches duplicados.
 * Design WOW: círculo de progresso, conquistas gamificadas, CTA contextual.
 */

import { useState, useEffect } from 'react';

interface Props {
    keywords: number;
    bairros: number;
    paginas: number;
    comConteudo: number;
}

const PROGRESS_GOAL = 50;

function computeAchievements(keywordsCount: number, bairrosCount: number, pagesCount: number) {
    return [
        { id: 'k1', icon: '🔑', title: 'Primeira Chave', threshold: 1, current: keywordsCount, unit: 'keywords', unlocked: keywordsCount >= 1 },
        { id: 'b1', icon: '📍', title: 'Marcando Território', threshold: 1, current: bairrosCount, unit: 'bairros', unlocked: bairrosCount >= 1 },
        { id: 'p10', icon: '🚀', title: 'Decolagem', threshold: 10, current: pagesCount, unit: 'páginas', unlocked: pagesCount >= 10 },
        { id: 'p50', icon: '🔥', title: 'Em Chamas', threshold: 50, current: pagesCount, unit: 'páginas', unlocked: pagesCount >= 50 },
        { id: 'p100', icon: '🏙️', title: 'Dono da Cidade', threshold: 100, current: pagesCount, unit: 'páginas', unlocked: pagesCount >= 100 },
        { id: 'p200', icon: '💎', title: 'Mestre do SEO', threshold: 200, current: pagesCount, unit: 'páginas', unlocked: pagesCount >= 200 },
    ];
}

export default function LocalDashboardWidget({ keywords, bairros, paginas, comConteudo }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const achievements = computeAchievements(keywords, bairros, paginas);
    const unlocked = achievements.filter(a => a.unlocked).length;
    const nextAchievement = achievements.find(a => !a.unlocked);
    const progressPct = Math.min(100, (paginas / PROGRESS_GOAL) * 100);

    // Próximo passo contextual
    const needsPrimeiroPasso = paginas === 0;
    const needsConteudo = comConteudo < keywords && keywords > 0;
    const tudoOk = !needsPrimeiroPasso && !needsConteudo;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Progresso — círculo + meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div
                    className="local-dash-progress"
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        background: `conic-gradient(#10b981 ${mounted ? progressPct : 0}%, rgba(255,255,255,0.08) 0%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.6s ease-out',
                    }}
                >
                    <div
                        style={{
                            width: 92,
                            height: 92,
                            borderRadius: '50%',
                            background: 'var(--admin-surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--admin-border)',
                        }}
                    >
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', fontFamily: 'Outfit,sans-serif', lineHeight: 1 }}>
                            {paginas >= PROGRESS_GOAL ? `${PROGRESS_GOAL}+` : paginas}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--admin-text-subtle)', textTransform: 'uppercase' }}>
                            / {PROGRESS_GOAL} meta
                        </span>
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '0.5rem' }}>
                        Sua cobertura SEO
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', margin: 0, lineHeight: 1.5 }}>
                        {paginas} páginas ativas · {keywords} keywords × {bairros} bairros
                        {needsConteudo && (
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}> · {keywords - comConteudo} precisam de conteúdo IA</span>
                        )}
                    </p>
                    <a
                        href="/admin/gerar-paginas?tab=paginas"
                        style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#10b981', textDecoration: 'none' }}
                    >
                        Ver matriz completa →
                    </a>
                </div>
            </div>

            {/* Próximo passo */}
            <div
                style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    border: '1px solid',
                    background: tudoOk ? 'rgba(34,197,94,0.06)' : needsConteudo ? 'rgba(245,158,11,0.06)' : 'rgba(99,102,241,0.06)',
                    borderColor: tudoOk ? 'rgba(34,197,94,0.25)' : needsConteudo ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)',
                }}
            >
                {needsPrimeiroPasso && (
                    <>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                            🚦 Por onde começar?
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {[
                                { step: 1, label: 'Cadastre suas Keywords (serviços SEO)', href: '/admin/gerar-paginas?tab=keywords', done: keywords > 0 },
                                { step: 2, label: 'Adicione Bairros para atacar', href: '/admin/gerar-paginas?tab=bairros', done: bairros > 0 },
                                { step: 3, label: 'Gere suas primeiras páginas!', href: '/admin/gerar-paginas?tab=paginas', done: paginas > 0 },
                            ].map(s => (
                                <a
                                    key={s.step}
                                    href={s.done ? '#' : s.href}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        background: s.done ? 'rgba(74,222,128,0.08)' : 'transparent',
                                        opacity: s.done ? 0.85 : 1,
                                        pointerEvents: s.done ? 'none' : 'auto',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: s.done ? '#22c55e' : 'var(--admin-border)',
                                            color: s.done ? '#fff' : 'var(--admin-text-subtle)',
                                        }}
                                    >
                                        {s.done ? '✓' : s.step}
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: s.done ? '#4ade80' : 'var(--admin-text)' }}>{s.label}</span>
                                    {!s.done && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6366f1' }}>→</span>}
                                </a>
                            ))}
                        </div>
                    </>
                )}
                {needsConteudo && !needsPrimeiroPasso && (
                    <>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            ✍️ Próximo passo
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--admin-text)', marginBottom: '0.75rem' }}>
                            {keywords - comConteudo} keyword(s) ainda sem conteúdo. Gere com IA para ranquear melhor!
                        </p>
                        <a
                            href="/admin/gerar-paginas?tab=keywords"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: '#f59e0b',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                            }}
                        >
                            Gerar conteúdo com IA →
                        </a>
                    </>
                )}
                {tudoOk && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>✅</span>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#22c55e' }}>Tudo em dia!</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                                Continue crescendo: adicione mais bairros ou keywords.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Conquistas */}
            <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        🏆 Conquistas
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{unlocked}/{achievements.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {achievements.map(a => (
                        <div
                            key={a.id}
                            title={a.title}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                transition: 'all 0.2s',
                                background: a.unlocked ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${a.unlocked ? 'rgba(16,185,129,0.35)' : 'var(--admin-border)'}`,
                                opacity: a.unlocked ? 1 : 0.4,
                                filter: a.unlocked ? 'none' : 'grayscale(1)',
                            }}
                        >
                            {a.icon}
                        </div>
                    ))}
                </div>
                {nextAchievement && (
                    <div
                        style={{
                            marginTop: '1rem',
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            background: 'rgba(245,158,11,0.07)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}
                    >
                        <span style={{ fontSize: '1.25rem', opacity: 0.6 }}>{nextAchievement.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24' }}>Próxima: {nextAchievement.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-subtle)', marginTop: '0.2rem' }}>
                                {nextAchievement.current}/{nextAchievement.threshold} {nextAchievement.unit}
                            </div>
                            <div style={{ height: 4, borderRadius: 999, background: 'var(--admin-border)', marginTop: '0.35rem', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${Math.min(100, (nextAchievement.current / nextAchievement.threshold) * 100)}%`,
                                        background: '#f59e0b',
                                        borderRadius: 999,
                                        transition: 'width 0.4s ease',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {unlocked === achievements.length && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>
                        👑 Parabéns! Todas as conquistas desbloqueadas!
                    </div>
                )}
            </div>

            {/* Links blog */}
            <div style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    📝 Conteúdo do blog
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <a href="/admin/posts" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: '6px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', textDecoration: 'none' }}>
                        Posts
                    </a>
                    <a href="/admin/authors" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: '6px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', textDecoration: 'none' }}>
                        Autores
                    </a>
                    <a href="/admin/categories" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: '6px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', textDecoration: 'none' }}>
                        Categorias
                    </a>
                </div>
            </div>
        </div>
    );
}
