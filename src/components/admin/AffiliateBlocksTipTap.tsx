/**
 * Blocos estilo Affiliatable para posts (produto, roundup, tabela, prós/contras, versus).
 * HTML estável + classes cnx-aff-* para Turndown preservar no .mdoc.
 */

import { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

const inputCls =
    'w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.25)] text-sm';

function BlockChrome({
    children,
    onEdit,
    onDelete,
}: {
    children: React.ReactNode;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <NodeViewWrapper>
            <div style={{ position: 'relative' }} contentEditable={false}>
                <div
                    style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        display: 'flex',
                        gap: '0.25rem',
                        zIndex: 2,
                    }}
                >
                    <button
                        type="button"
                        onClick={onEdit}
                        style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#a3a3a3',
                            fontSize: '0.75rem',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        ✏️ Editar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm('Remover este bloco?')) onDelete();
                        }}
                        style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            background: 'rgba(239,68,68,0.15)',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </NodeViewWrapper>
    );
}

// ── Produto único ───────────────────────────────────────────────────────────
function ProductCardView({ node, updateAttributes, deleteNode }: any) {
    const a = node.attrs;
    const features: string[] = Array.isArray(a.features) ? a.features : [];
    const [open, setOpen] = useState(false);
    const [d, setD] = useState({ ...a, features: [...features] });

    const save = () => {
        updateAttributes({
            ...d,
            features: d.features.filter((x: string) => x.trim()),
        });
        setOpen(false);
    };

    return (
        <BlockChrome onEdit={() => { setD({ ...node.attrs, features: [...(node.attrs.features || [])] }); setOpen(true); }} onDelete={deleteNode}>
            <div className="cnx-aff-product cnx-aff-block-wrap">
                {a.badge && <div className="cnx-aff-product-badge">{a.badge}</div>}
                <div className="cnx-aff-product-body">
                    {a.productImage && (
                        <img src={a.productImage} alt="" className="cnx-aff-product-img" />
                    )}
                    <div className="cnx-aff-product-main">
                        <h2 className="cnx-aff-product-title">{a.productName || 'Produto'}</h2>
                        {a.subtitle && <p className="cnx-aff-product-sub">{a.subtitle}</p>}
                        {a.rating && <div className="cnx-aff-product-score">Nota {a.rating}</div>}
                        {features.length > 0 && (
                            <ul className="cnx-aff-product-features">
                                {features.map((f, i) => (
                                    <li key={i}>{f}</li>
                                ))}
                            </ul>
                        )}
                        {a.ctaText && a.ctaUrl && (
                            <div className="cnx-aff-product-cta">
                                <a href={a.ctaUrl} target="_blank" rel="noopener noreferrer">
                                    {a.ctaText}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
                    <div
                        className="bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-sm font-semibold text-[#e5e5e5]">Produto (card)</h3>
                        <input className={inputCls} placeholder="Selo opcional (ex.: Destaque)" value={d.badge} onChange={(e) => setD({ ...d, badge: e.target.value })} />
                        <input className={inputCls} placeholder="Nome do produto *" value={d.productName} onChange={(e) => setD({ ...d, productName: e.target.value })} />
                        <input className={inputCls} placeholder="Subtítulo curto" value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} />
                        <input className={inputCls} placeholder="URL da imagem" value={d.productImage} onChange={(e) => setD({ ...d, productImage: e.target.value })} />
                        <input className={inputCls} placeholder="Nota (ex.: 9,2)" value={d.rating} onChange={(e) => setD({ ...d, rating: e.target.value })} />
                        <textarea
                            className={inputCls}
                            rows={4}
                            placeholder="Destaques (um por linha)"
                            value={d.features.join('\n')}
                            onChange={(e) => setD({ ...d, features: e.target.value.split('\n') })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input className={inputCls} placeholder="Texto do botão" value={d.ctaText} onChange={(e) => setD({ ...d, ctaText: e.target.value })} />
                            <input className={inputCls} placeholder="URL afiliado" value={d.ctaUrl} onChange={(e) => setD({ ...d, ctaUrl: e.target.value })} />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={save} disabled={!d.productName?.trim()} className="flex-1 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold disabled:opacity-40">
                                Salvar
                            </button>
                            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-[#737373] text-sm">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BlockChrome>
    );
}

export const AffiliateProductCardExtension = Node.create({
    name: 'affiliateProductCard',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            badge: { default: '' },
            productName: { default: '' },
            subtitle: { default: '' },
            productImage: { default: '' },
            rating: { default: '' },
            features: {
                default: [],
                parseHTML: (el) =>
                    Array.from(el.querySelectorAll('.cnx-aff-product-features li')).map((li) => li.textContent || ''),
            },
            ctaText: { default: '' },
            ctaUrl: { default: '' },
        };
    },
    parseHTML() {
        return [{ tag: 'div.cnx-aff-product.cnx-aff-block-wrap' }];
    },
    renderHTML({ node }) {
        const { badge, productName, subtitle, productImage, rating, features, ctaText, ctaUrl } = node.attrs;
        const feats = Array.isArray(features) ? features : [];
        const li = feats.map((t: string) => ['li', {}, t]);
        const img = productImage ? [['img', { src: productImage, alt: '', class: 'cnx-aff-product-img' }]] : [];
        const badgeEl = badge ? [['div', { class: 'cnx-aff-product-badge' }, badge]] : [];
        const sub = subtitle ? [['p', { class: 'cnx-aff-product-sub' }, subtitle]] : [];
        const score = rating ? [['div', { class: 'cnx-aff-product-score' }, `Nota ${rating}`]] : [];
        const featBlock = li.length ? [['ul', { class: 'cnx-aff-product-features' }, ...li]] : [];
        const cta =
            ctaText && ctaUrl
                ? [
                      [
                          'div',
                          { class: 'cnx-aff-product-cta' },
                          ['a', { href: ctaUrl, target: '_blank', rel: 'noopener noreferrer' }, ctaText],
                      ],
                  ]
                : [];
        return [
            'div',
            { class: 'cnx-aff-product cnx-aff-block-wrap' },
            ...badgeEl,
            [
                'div',
                { class: 'cnx-aff-product-body' },
                ...img,
                [
                    'div',
                    { class: 'cnx-aff-product-main' },
                    ['h2', { class: 'cnx-aff-product-title' }, productName || 'Produto'],
                    ...sub,
                    ...score,
                    ...featBlock,
                    ...cta,
                ],
            ],
        ] as any;
    },
    addNodeView() {
        return ReactNodeViewRenderer(ProductCardView);
    },
});

// ── Prós / contras só ───────────────────────────────────────────────────────
function ProsConsView({ node, updateAttributes, deleteNode }: any) {
    const pros: string[] = Array.isArray(node.attrs.pros) ? node.attrs.pros : [];
    const cons: string[] = Array.isArray(node.attrs.cons) ? node.attrs.cons : [];
    const [open, setOpen] = useState(false);
    const [d, setD] = useState({ pros: [...pros], cons: [...cons] });

    return (
        <BlockChrome
            onEdit={() => {
                setD({ pros: [...pros], cons: [...cons] });
                setOpen(true);
            }}
            onDelete={deleteNode}
        >
            <div className="cnx-aff-pros-cons cnx-aff-block-wrap">
                <table className="cnx-aff-pros-cons-table">
                    <thead>
                        <tr>
                            <th className="cnx-aff-pc-pros-h">Prós</th>
                            <th className="cnx-aff-pc-cons-h">Contras</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="cnx-aff-pc-pros-td">
                                <ul>
                                    {pros.map((p, i) => (
                                        <li key={i}>{p}</li>
                                    ))}
                                </ul>
                            </td>
                            <td className="cnx-aff-pc-cons-td">
                                <ul>
                                    {cons.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
                    <div className="bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-sm font-semibold text-[#e5e5e5]">Prós e contras</h3>
                        <textarea
                            className={inputCls}
                            rows={5}
                            placeholder="Prós (um por linha)"
                            value={d.pros.join('\n')}
                            onChange={(e) => setD({ ...d, pros: e.target.value.split('\n') })}
                        />
                        <textarea
                            className={inputCls}
                            rows={5}
                            placeholder="Contras (um por linha)"
                            value={d.cons.join('\n')}
                            onChange={(e) => setD({ ...d, cons: e.target.value.split('\n') })}
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    updateAttributes({
                                        pros: d.pros.filter((x) => x.trim()),
                                        cons: d.cons.filter((x) => x.trim()),
                                    });
                                    setOpen(false);
                                }}
                                className="flex-1 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold"
                            >
                                Salvar
                            </button>
                            <button type="button" onClick={() => setOpen(false)} className="px-4 text-[#737373] text-sm">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BlockChrome>
    );
}

export const AffiliateProsConsExtension = Node.create({
    name: 'affiliateProsCons',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            pros: {
                default: [],
                parseHTML: (el) =>
                    Array.from(el.querySelectorAll('.cnx-aff-pc-pros-td li')).map((li) => li.textContent || ''),
            },
            cons: {
                default: [],
                parseHTML: (el) =>
                    Array.from(el.querySelectorAll('.cnx-aff-pc-cons-td li')).map((li) => li.textContent || ''),
            },
        };
    },
    parseHTML() {
        return [{ tag: 'div.cnx-aff-pros-cons.cnx-aff-block-wrap' }];
    },
    renderHTML({ node }) {
        const pros = (Array.isArray(node.attrs.pros) ? node.attrs.pros : []).map((t: string) => ['li', {}, t]);
        const cons = (Array.isArray(node.attrs.cons) ? node.attrs.cons : []).map((t: string) => ['li', {}, t]);
        return [
            'div',
            { class: 'cnx-aff-pros-cons cnx-aff-block-wrap' },
            [
                'table',
                { class: 'cnx-aff-pros-cons-table' },
                [
                    'thead',
                    {},
                    [
                        'tr',
                        {},
                        ['th', { class: 'cnx-aff-pc-pros-h' }, 'Prós'],
                        ['th', { class: 'cnx-aff-pc-cons-h' }, 'Contras'],
                    ],
                ],
                [
                    'tbody',
                    {},
                    [
                        'tr',
                        {},
                        ['td', { class: 'cnx-aff-pc-pros-td' }, ['ul', {}, ...pros]],
                        ['td', { class: 'cnx-aff-pc-cons-td' }, ['ul', {}, ...cons]],
                    ],
                ],
            ],
        ] as any;
    },
    addNodeView() {
        return ReactNodeViewRenderer(ProsConsView);
    },
});

type ComparePayload = { headers: string[]; rows: { label: string; values: string[] }[] };

function emptyCompare(): ComparePayload {
    return {
        headers: ['Produto A', 'Produto B', 'Produto C'],
        rows: [
            { label: 'Característica 1', values: ['', '', ''] },
            { label: 'Característica 2', values: ['', '', ''] },
        ],
    };
}

function parseComparePayload(raw: string): ComparePayload {
    try {
        const j = JSON.parse(raw) as ComparePayload;
        if (!j.headers || !j.rows) return emptyCompare();
        return j;
    } catch {
        return emptyCompare();
    }
}

function CompareView({ node, updateAttributes, deleteNode }: any) {
    const data = parseComparePayload(node.attrs.payload || '');
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState<ComparePayload>(data);

    const table = (p: ComparePayload) => {
        const n = Math.max(1, Math.min(5, p.headers.length));
        const heads = p.headers.slice(0, n);
        return (
            <div className="cnx-aff-compare cnx-aff-block-wrap">
                <table>
                    <thead>
                        <tr>
                            <th />
                            {heads.map((h, i) => (
                                <th key={i}>{h || `—`}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {p.rows.map((row, ri) => (
                            <tr key={ri}>
                                <th>{row.label}</th>
                                {heads.map((_, ci) => (
                                    <td key={ci}>{row.values[ci] ?? ''}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <BlockChrome
            onEdit={() => {
                setEdit(parseComparePayload(node.attrs.payload));
                setOpen(true);
            }}
            onDelete={deleteNode}
        >
            {table(data)}
            {open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
                    <div
                        className="bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 space-y-4 my-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-sm font-semibold text-[#e5e5e5]">Tabela comparativa (até 5 produtos)</h3>
                        <p className="text-xs text-[#737373]">Colunas = produtos. Linhas = características.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <input
                                    key={i}
                                    className={inputCls}
                                    placeholder={`Produto ${i + 1}`}
                                    value={edit.headers[i] || ''}
                                    onChange={(e) => {
                                        const h = [...edit.headers];
                                        h[i] = e.target.value;
                                        setEdit({ ...edit, headers: h });
                                    }}
                                />
                            ))}
                        </div>
                        <div className="space-y-2">
                            {edit.rows.map((row, ri) => (
                                <div key={ri} className="flex flex-col sm:flex-row gap-2 items-start">
                                    <input
                                        className={inputCls + ' sm:w-48 flex-shrink-0'}
                                        placeholder="Nome da característica"
                                        value={row.label}
                                        onChange={(e) => {
                                            const rows = [...edit.rows];
                                            rows[ri] = { ...rows[ri], label: e.target.value };
                                            setEdit({ ...edit, rows });
                                        }}
                                    />
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-1 w-full">
                                        {[0, 1, 2, 3, 4].map((ci) => (
                                            <input
                                                key={ci}
                                                className={inputCls + ' text-xs'}
                                                placeholder={`C${ci + 1}`}
                                                value={row.values[ci] || ''}
                                                onChange={(e) => {
                                                    const rows = [...edit.rows];
                                                    const vals = [...(rows[ri].values || [])];
                                                    vals[ci] = e.target.value;
                                                    while (vals.length < 5) vals.push('');
                                                    rows[ri] = { ...rows[ri], values: vals };
                                                    setEdit({ ...edit, rows });
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setEdit({ ...edit, rows: [...edit.rows, { label: '', values: ['', '', '', '', ''] }] })}
                                className="px-3 py-1.5 rounded-lg bg-[#222] text-[#e5e5e5] text-xs"
                            >
                                + Linha
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (edit.rows.length > 1) setEdit({ ...edit, rows: edit.rows.slice(0, -1) });
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#222] text-[#e5e5e5] text-xs"
                            >
                                − Linha
                            </button>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const trimmed = edit.headers.map((h) => h.trim()).filter(Boolean);
                                    const n = Math.max(2, Math.min(5, trimmed.length || 2));
                                    const headers = [...trimmed, ...Array(5)].slice(0, n);
                                    const rows = edit.rows.map((r) => ({
                                        label: r.label,
                                        values: (r.values || []).slice(0, n),
                                    }));
                                    updateAttributes({ payload: JSON.stringify({ headers, rows }) });
                                    setOpen(false);
                                }}
                                className="flex-1 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold"
                            >
                                Salvar
                            </button>
                            <button type="button" onClick={() => setOpen(false)} className="px-4 text-[#737373] text-sm">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BlockChrome>
    );
}

export const AffiliateCompareExtension = Node.create({
    name: 'affiliateCompare',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            payload: {
                default: JSON.stringify(emptyCompare()),
                parseHTML: (el) => (el as HTMLElement).getAttribute('data-cnx-compare') || JSON.stringify(emptyCompare()),
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'div.cnx-aff-compare.cnx-aff-block-wrap',
                getAttrs: (el) => ({
                    payload:
                        (el as HTMLElement).getAttribute('data-cnx-compare') || JSON.stringify(emptyCompare()),
                }),
            },
        ];
    },
    renderHTML({ node }) {
        const p = parseComparePayload(node.attrs.payload);
        const n = Math.max(2, Math.min(5, p.headers.filter((h) => h && h.trim()).length || 2));
        const headers = p.headers.filter((h) => h && h.trim()).slice(0, n);
        const rows = p.rows.map((r) => ({
            label: r.label,
            values: (r.values || []).slice(0, n),
        }));
        const headCells = headers.map((h) => ['th', {}, h]);
        const bodyRows = rows.map((r) => [
            'tr',
            {},
            ['th', {}, r.label],
            ...r.values.map((v) => ['td', {}, v]),
        ]);
        return [
            'div',
            mergeAttributes(
                {},
                {
                    class: 'cnx-aff-compare cnx-aff-block-wrap',
                    'data-cnx-compare': JSON.stringify({ headers, rows }),
                },
            ),
            [
                'table',
                {},
                ['thead', {}, ['tr', {}, ['th', {}, ''], ...headCells]],
                ['tbody', {}, ...bodyRows],
            ],
        ] as any;
    },
    addNodeView() {
        return ReactNodeViewRenderer(CompareView);
    },
});

type RoundupItem = {
    rank: string;
    itemBadge: string;
    title: string;
    image: string;
    score: string;
    features: string[];
    cta1: string;
    cta1Url: string;
    cta2: string;
    cta2Url: string;
};

function defaultRoundup(): RoundupItem[] {
    return [
        {
            rank: '1',
            itemBadge: '',
            title: 'Produto 1',
            image: '',
            score: '',
            features: [''],
            cta1: 'Ver na loja',
            cta1Url: '',
            cta2: '',
            cta2Url: '',
        },
    ];
}

function parseRoundup(raw: string): RoundupItem[] {
    try {
        const j = JSON.parse(raw) as RoundupItem[];
        return Array.isArray(j) && j.length ? j : defaultRoundup();
    } catch {
        return defaultRoundup();
    }
}

function RoundupView({ node, updateAttributes, deleteNode }: any) {
    const items = parseRoundup(node.attrs.itemsJson || '[]');
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState<RoundupItem[]>(items);

    const renderItems = (list: RoundupItem[]) => (
        <div className="cnx-aff-roundup cnx-aff-block-wrap">
            {list.map((it, idx) => (
                <div key={idx} className="cnx-aff-roundup-item">
                    <div className="cnx-aff-roundup-rank">{it.rank}</div>
                    {it.image && <img src={it.image} alt="" className="cnx-aff-roundup-img" />}
                    <div className="cnx-aff-roundup-core">
                        {it.itemBadge && <div className="cnx-aff-roundup-item-badge">{it.itemBadge}</div>}
                        <h3 className="cnx-aff-roundup-item-title">{it.title}</h3>
                        {it.score && <div className="cnx-aff-roundup-item-score">Nota {it.score}</div>}
                        {it.features.filter((f) => f.trim()).length > 0 && (
                            <ul>
                                {it.features.filter((f) => f.trim()).map((f, i) => (
                                    <li key={i}>{f}</li>
                                ))}
                            </ul>
                        )}
                        <div className="cnx-aff-roundup-ctas">
                            {it.cta1 && it.cta1Url && (
                                <a className="cnx-aff-roundup-cta-primary" href={it.cta1Url} target="_blank" rel="noopener noreferrer">
                                    {it.cta1}
                                </a>
                            )}
                            {it.cta2 && it.cta2Url && (
                                <a href={it.cta2Url} target="_blank" rel="noopener noreferrer">
                                    {it.cta2}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <BlockChrome
            onEdit={() => {
                setEdit(parseRoundup(node.attrs.itemsJson));
                setOpen(true);
            }}
            onDelete={deleteNode}
        >
            {renderItems(items)}
            {open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
                    <div
                        className="bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 space-y-6 my-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-sm font-semibold text-[#e5e5e5]">Lista de produtos (roundup)</h3>
                        {edit.map((it, idx) => (
                            <div key={idx} className="border border-[rgba(255,255,255,0.06)] rounded-lg p-4 space-y-2">
                                <p className="text-xs text-[#737373]">Item {idx + 1}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <input className={inputCls} placeholder="#" value={it.rank} onChange={(e) => {
                                        const n = [...edit];
                                        n[idx] = { ...it, rank: e.target.value };
                                        setEdit(n);
                                    }} />
                                    <input className={inputCls} placeholder="Selo (ex.: Melhor custo)" value={it.itemBadge} onChange={(e) => {
                                        const n = [...edit];
                                        n[idx] = { ...it, itemBadge: e.target.value };
                                        setEdit(n);
                                    }} />
                                </div>
                                <input className={inputCls} placeholder="Nome do produto" value={it.title} onChange={(e) => {
                                    const n = [...edit];
                                    n[idx] = { ...it, title: e.target.value };
                                    setEdit(n);
                                }} />
                                <input className={inputCls} placeholder="URL imagem" value={it.image} onChange={(e) => {
                                    const n = [...edit];
                                    n[idx] = { ...it, image: e.target.value };
                                    setEdit(n);
                                }} />
                                <input className={inputCls} placeholder="Nota" value={it.score} onChange={(e) => {
                                    const n = [...edit];
                                    n[idx] = { ...it, score: e.target.value };
                                    setEdit(n);
                                }} />
                                <textarea
                                    className={inputCls}
                                    rows={3}
                                    placeholder="Destaques (um por linha)"
                                    value={it.features.join('\n')}
                                    onChange={(e) => {
                                        const n = [...edit];
                                        n[idx] = { ...it, features: e.target.value.split('\n') };
                                        setEdit(n);
                                    }}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input className={inputCls} placeholder="CTA 1 texto" value={it.cta1} onChange={(e) => {
                                        const n = [...edit];
                                        n[idx] = { ...it, cta1: e.target.value };
                                        setEdit(n);
                                    }} />
                                    <input className={inputCls} placeholder="CTA 1 URL" value={it.cta1Url} onChange={(e) => {
                                        const n = [...edit];
                                        n[idx] = { ...it, cta1Url: e.target.value };
                                        setEdit(n);
                                    }} />
                                    <input className={inputCls} placeholder="CTA 2 texto" value={it.cta2} onChange={(e) => {
                                        const n = [...edit];
                                        n[idx] = { ...it, cta2: e.target.value };
                                        setEdit(n);
                                    }} />
                                    <input className={inputCls} placeholder="CTA 2 URL" value={it.cta2Url} onChange={(e) => {
                                        const n = [...edit];
                                        n[idx] = { ...it, cta2Url: e.target.value };
                                        setEdit(n);
                                    }} />
                                </div>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setEdit([
                                        ...edit,
                                        {
                                            rank: String(edit.length + 1),
                                            itemBadge: '',
                                            title: '',
                                            image: '',
                                            score: '',
                                            features: [''],
                                            cta1: 'Ver na loja',
                                            cta1Url: '',
                                            cta2: '',
                                            cta2Url: '',
                                        },
                                    ])
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#222] text-[#e5e5e5] text-xs"
                            >
                                + Produto
                            </button>
                            {edit.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setEdit(edit.slice(0, -1))}
                                    className="px-3 py-1.5 rounded-lg bg-[#222] text-[#e5e5e5] text-xs"
                                >
                                    − Último
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                updateAttributes({ itemsJson: JSON.stringify(edit) });
                                setOpen(false);
                            }}
                            className="w-full py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold"
                        >
                            Salvar lista
                        </button>
                    </div>
                </div>
            )}
        </BlockChrome>
    );
}

export const AffiliateRoundupExtension = Node.create({
    name: 'affiliateRoundup',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            itemsJson: {
                default: JSON.stringify(defaultRoundup()),
                parseHTML: (el) => (el as HTMLElement).getAttribute('data-cnx-roundup') || JSON.stringify(defaultRoundup()),
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'div.cnx-aff-roundup.cnx-aff-block-wrap',
                getAttrs: (el) => ({
                    itemsJson:
                        (el as HTMLElement).getAttribute('data-cnx-roundup') || JSON.stringify(defaultRoundup()),
                }),
            },
        ];
    },
    renderHTML({ node }) {
        const list = parseRoundup(node.attrs.itemsJson);
        const children = list.map((it) => {
            const feats = it.features.filter((f) => f.trim()).map((f) => ['li', {}, f]);
            const ctas: any[] = [];
            if (it.cta1 && it.cta1Url) {
                ctas.push(['a', { class: 'cnx-aff-roundup-cta-primary', href: it.cta1Url, target: '_blank', rel: 'noopener noreferrer' }, it.cta1]);
            }
            if (it.cta2 && it.cta2Url) {
                ctas.push(['a', { href: it.cta2Url, target: '_blank', rel: 'noopener noreferrer' }, it.cta2]);
            }
            return [
                'div',
                { class: 'cnx-aff-roundup-item' },
                ['div', { class: 'cnx-aff-roundup-rank' }, it.rank],
                ...(it.image ? [['img', { src: it.image, alt: '', class: 'cnx-aff-roundup-img' }]] : []),
                [
                    'div',
                    { class: 'cnx-aff-roundup-core' },
                    ...(it.itemBadge ? [['div', { class: 'cnx-aff-roundup-item-badge' }, it.itemBadge]] : []),
                    ['h3', { class: 'cnx-aff-roundup-item-title' }, it.title],
                    ...(it.score ? [['div', { class: 'cnx-aff-roundup-item-score' }, `Nota ${it.score}`]] : []),
                    ...(feats.length ? [['ul', {}, ...feats]] : []),
                    ...(ctas.length ? [['div', { class: 'cnx-aff-roundup-ctas' }, ...ctas]] : []),
                ],
            ];
        });
        return [
            'div',
            mergeAttributes(
                {},
                {
                    class: 'cnx-aff-roundup cnx-aff-block-wrap',
                    'data-cnx-roundup': JSON.stringify(list),
                },
            ),
            ...children,
        ] as any;
    },
    addNodeView() {
        return ReactNodeViewRenderer(RoundupView);
    },
});

function VersusView({ node, updateAttributes, deleteNode }: any) {
    const a = node.attrs;
    const leftPts = Array.isArray(a.leftPoints) ? a.leftPoints : [];
    const rightPts = Array.isArray(a.rightPoints) ? a.rightPoints : [];
    const [open, setOpen] = useState(false);
    const [d, setD] = useState({ ...a, leftPoints: [...leftPts], rightPoints: [...rightPts] });

    return (
        <BlockChrome
            onEdit={() => {
                setD({
                    ...node.attrs,
                    leftPoints: [...(node.attrs.leftPoints || [])],
                    rightPoints: [...(node.attrs.rightPoints || [])],
                });
                setOpen(true);
            }}
            onDelete={deleteNode}
        >
            <div className="cnx-aff-versus cnx-aff-block-wrap">
                <div className="cnx-aff-versus-grid">
                    <div className="cnx-aff-versus-side">
                        <div className="cnx-aff-versus-label">{a.leftLabel || 'Opção A'}</div>
                        <h3 className="cnx-aff-versus-title">{a.leftTitle}</h3>
                        <ul>
                            {leftPts.filter((x: string) => x.trim()).map((x: string, i: number) => (
                                <li key={i}>{x}</li>
                            ))}
                        </ul>
                        {a.leftCta && a.leftUrl && (
                            <a href={a.leftUrl} target="_blank" rel="noopener noreferrer">
                                {a.leftCta}
                            </a>
                        )}
                    </div>
                    <div className="cnx-aff-versus-side">
                        <div className="cnx-aff-versus-label">{a.rightLabel || 'Opção B'}</div>
                        <h3 className="cnx-aff-versus-title">{a.rightTitle}</h3>
                        <ul>
                            {rightPts.filter((x: string) => x.trim()).map((x: string, i: number) => (
                                <li key={i}>{x}</li>
                            ))}
                        </ul>
                        {a.rightCta && a.rightUrl && (
                            <a href={a.rightUrl} target="_blank" rel="noopener noreferrer">
                                {a.rightCta}
                            </a>
                        )}
                    </div>
                </div>
            </div>
            {open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
                    <div className="bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-sm font-semibold text-[#e5e5e5]">Versus (dois produtos)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <input className={inputCls} placeholder="Rótulo esq." value={d.leftLabel} onChange={(e) => setD({ ...d, leftLabel: e.target.value })} />
                                <input className={inputCls} placeholder="Nome produto esq." value={d.leftTitle} onChange={(e) => setD({ ...d, leftTitle: e.target.value })} />
                                <textarea
                                    className={inputCls}
                                    rows={4}
                                    placeholder="Pontos (um por linha)"
                                    value={d.leftPoints.join('\n')}
                                    onChange={(e) => setD({ ...d, leftPoints: e.target.value.split('\n') })}
                                />
                                <input className={inputCls} placeholder="CTA texto" value={d.leftCta} onChange={(e) => setD({ ...d, leftCta: e.target.value })} />
                                <input className={inputCls} placeholder="CTA URL" value={d.leftUrl} onChange={(e) => setD({ ...d, leftUrl: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <input className={inputCls} placeholder="Rótulo dir." value={d.rightLabel} onChange={(e) => setD({ ...d, rightLabel: e.target.value })} />
                                <input className={inputCls} placeholder="Nome produto dir." value={d.rightTitle} onChange={(e) => setD({ ...d, rightTitle: e.target.value })} />
                                <textarea
                                    className={inputCls}
                                    rows={4}
                                    placeholder="Pontos (um por linha)"
                                    value={d.rightPoints.join('\n')}
                                    onChange={(e) => setD({ ...d, rightPoints: e.target.value.split('\n') })}
                                />
                                <input className={inputCls} placeholder="CTA texto" value={d.rightCta} onChange={(e) => setD({ ...d, rightCta: e.target.value })} />
                                <input className={inputCls} placeholder="CTA URL" value={d.rightUrl} onChange={(e) => setD({ ...d, rightUrl: e.target.value })} />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                updateAttributes({
                                    ...d,
                                    leftPoints: d.leftPoints.filter((x: string) => x.trim()),
                                    rightPoints: d.rightPoints.filter((x: string) => x.trim()),
                                });
                                setOpen(false);
                            }}
                            className="w-full py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            )}
        </BlockChrome>
    );
}

export const AffiliateVersusExtension = Node.create({
    name: 'affiliateVersus',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            leftLabel: { default: 'Melhor escolha' },
            leftTitle: { default: '' },
            leftPoints: {
                default: [],
                parseHTML: (el) =>
                    Array.from(el.querySelectorAll('.cnx-aff-versus-side:first-child li')).map((li) => li.textContent || ''),
            },
            leftCta: { default: '' },
            leftUrl: { default: '' },
            rightLabel: { default: 'Alternativa' },
            rightTitle: { default: '' },
            rightPoints: {
                default: [],
                parseHTML: (el) =>
                    Array.from(el.querySelectorAll('.cnx-aff-versus-side:last-child li')).map((li) => li.textContent || ''),
            },
            rightCta: { default: '' },
            rightUrl: { default: '' },
        };
    },
    parseHTML() {
        return [{ tag: 'div.cnx-aff-versus.cnx-aff-block-wrap' }];
    },
    renderHTML({ node }) {
        const a = node.attrs;
        const lul = (a.leftPoints || []).map((t: string) => ['li', {}, t]);
        const rul = (a.rightPoints || []).map((t: string) => ['li', {}, t]);
        const lcta =
            a.leftCta && a.leftUrl ? [['a', { href: a.leftUrl, target: '_blank', rel: 'noopener noreferrer' }, a.leftCta]] : [];
        const rcta =
            a.rightCta && a.rightUrl ? [['a', { href: a.rightUrl, target: '_blank', rel: 'noopener noreferrer' }, a.rightCta]] : [];
        return [
            'div',
            { class: 'cnx-aff-versus cnx-aff-block-wrap' },
            [
                'div',
                { class: 'cnx-aff-versus-grid' },
                [
                    'div',
                    { class: 'cnx-aff-versus-side' },
                    ['div', { class: 'cnx-aff-versus-label' }, a.leftLabel || 'Opção A'],
                    ['h3', { class: 'cnx-aff-versus-title' }, a.leftTitle],
                    ['ul', {}, ...lul],
                    ...lcta,
                ],
                [
                    'div',
                    { class: 'cnx-aff-versus-side' },
                    ['div', { class: 'cnx-aff-versus-label' }, a.rightLabel || 'Opção B'],
                    ['h3', { class: 'cnx-aff-versus-title' }, a.rightTitle],
                    ['ul', {}, ...rul],
                    ...rcta,
                ],
            ],
        ] as any;
    },
    addNodeView() {
        return ReactNodeViewRenderer(VersusView);
    },
});

export const affiliateBlockExtensions = [
    AffiliateProductCardExtension,
    AffiliateProsConsExtension,
    AffiliateCompareExtension,
    AffiliateRoundupExtension,
    AffiliateVersusExtension,
];

/** Defaults para inserção rápida no editor */
export const affiliateBlockDefaults = {
    productCard: {
        type: 'affiliateProductCard',
        attrs: {
            badge: 'Destaque',
            productName: 'Nome do produto',
            subtitle: 'Uma linha sobre o produto',
            productImage: '',
            rating: '9,0',
            features: ['Destaque 1', 'Destaque 2', 'Destaque 3'],
            ctaText: 'Ver oferta',
            ctaUrl: 'https://',
        },
    },
    prosCons: {
        type: 'affiliateProsCons',
        attrs: {
            pros: ['Ponto positivo 1', 'Ponto positivo 2'],
            cons: ['Ponto negativo 1'],
        },
    },
    compare: {
        type: 'affiliateCompare',
        attrs: { payload: JSON.stringify(emptyCompare()) },
    },
    roundup: {
        type: 'affiliateRoundup',
        attrs: { itemsJson: JSON.stringify(defaultRoundup()) },
    },
    versus: {
        type: 'affiliateVersus',
        attrs: {
            leftLabel: 'Melhor escolha',
            leftTitle: 'Produto A',
            leftPoints: ['Vantagem 1', 'Vantagem 2'],
            leftCta: 'Ver na Amazon',
            leftUrl: 'https://',
            rightLabel: 'Alternativa',
            rightTitle: 'Produto B',
            rightPoints: ['Vantagem 1', 'Vantagem 2'],
            rightCta: 'Ver na Amazon',
            rightUrl: 'https://',
        },
    },
} as const;
