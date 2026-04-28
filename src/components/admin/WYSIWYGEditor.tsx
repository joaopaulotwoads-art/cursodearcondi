/**
 * WYSIWYGEditor.tsx
 * 
 * Editor WYSIWYG melhorado com TipTap - experiência estilo Gutenberg.
 * Inclui extensões avançadas, slash commands e interface moderna.
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Heading from '@tiptap/extension-heading';
import MediaLibrary from './MediaLibrary';
import { affiliateBlockExtensions, affiliateBlockDefaults } from './AffiliateBlocksTipTap';
import {
    PreservedHtmlExtension,
    preprocessHtmlForTipTap,
    expandPreservedHtmlBlocks,
} from './preserved-html-tiptap';

/** Headings com `class` preservada no HTML (ex.: `.review-section-label` nos reviews Curso de Ar Condicionado�e). */
const HeadingWithClass = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            class: {
                default: null,
                parseHTML: (element) => element.getAttribute('class'),
                renderHTML: (attributes) => {
                    if (!attributes.class) return {};
                    return { class: attributes.class as string };
                },
            },
        };
    },
    parseHTML() {
        return this.options.levels.map((level: number) => ({
            tag: `h${level}`,
            getAttrs: (element: HTMLElement) => ({
                level,
                class: element.getAttribute('class'),
            }),
        }));
    },
}).configure({ levels: [1, 2, 3, 4] });

// ── Product Review Node View (renderiza no editor) ───────────────────────────
function ProductReviewNodeView({ node, updateAttributes, deleteNode }: { node: any; updateAttributes: (attrs: Record<string, any>) => void; deleteNode: () => void }) {
    const attrs = node.attrs;
    const prosArr: string[] = Array.isArray(attrs.pros) ? attrs.pros : [];
    const consArr: string[] = Array.isArray(attrs.cons) ? attrs.cons : [];

    const [showEdit, setShowEdit]       = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [data, setData]               = useState({ ...attrs, pros: [...(attrs.pros || [])], cons: [...(attrs.cons || [])] });

    const openEdit = () => {
        setData({ ...attrs, pros: [...(attrs.pros || [])], cons: [...(attrs.cons || [])] });
        setShowEdit(true);
    };

    const handleSave = () => {
        updateAttributes({
            ...data,
            pros: data.pros.filter((p: string) => p.trim()),
            cons: data.cons.filter((c: string) => c.trim()),
        });
        setShowEdit(false);
    };

    const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.25)] text-sm';
    const inputSmCls = 'flex-1 px-3 py-1.5 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.2)] text-xs';

    return (
        <NodeViewWrapper className="not-prose">
            <div className="product-review" contentEditable={false} style={{ userSelect: 'none', position: 'relative' }}>
                {/* Botões de ação no canto superior direito */}
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                    <button
                        onClick={openEdit}
                        title="Editar review"
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.08)', color: '#a3a3a3', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                    >
                        ✏️ Editar
                    </button>
                    <button
                        onClick={() => { if (confirm('Remover este bloco de review?')) deleteNode(); }}
                        title="Remover review"
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Conteúdo do bloco */}
                <div className="product-review-header">
                    {attrs.productImage && (
                        <img src={attrs.productImage} alt={attrs.productName} className="product-review-image" />
                    )}
                    <div className="product-review-info">
                        <h3 className="product-review-name">{attrs.productName}</h3>
                        {attrs.productDescription && attrs.productDescription.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
                            <p key={i} className="product-review-description">{line}</p>
                        ))}
                    </div>
                </div>
                <table className="product-review-table">
                    <thead>
                        <tr>
                            <th className="product-review-pros-header">✅ Prós</th>
                            <th className="product-review-cons-header">❌ Contras</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="product-review-pros-col"><ul>{prosArr.map((p, i) => <li key={i}>{p}</li>)}</ul></td>
                            <td className="product-review-cons-col"><ul>{consArr.map((c, i) => <li key={i}>{c}</li>)}</ul></td>
                        </tr>
                    </tbody>
                </table>
                {attrs.ctaUrl && attrs.ctaText && (
                    <div className="product-review-cta">
                        <a href={attrs.ctaUrl} className="product-review-cta-btn" style={{ background: attrs.ctaColor || '#ef4444' }} target="_blank" rel="noopener noreferrer">
                            {attrs.ctaText}
                        </a>
                    </div>
                )}
            </div>

            {/* Modal de edição */}
            {showEdit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowEdit(false)}>
                    <div className="bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

                        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                            <h3 className="text-sm font-semibold text-[#e5e5e5]">Editar Review de Produto</h3>
                            <button onClick={() => setShowEdit(false)} className="text-[#737373] hover:text-[#e5e5e5] text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(255,255,255,0.05)]">×</button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                            {/* Produto */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-[#737373] uppercase tracking-widest">Produto</p>
                                <input type="text" value={data.productName} onChange={(e) => setData((p: any) => ({ ...p, productName: e.target.value }))} placeholder="Nome do produto *" className={inputCls} />
                                <div className="flex gap-3 items-start">
                                    {data.productImage
                                        ? <img src={data.productImage} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-[rgba(255,255,255,0.08)]" />
                                        : <div className="w-16 h-16 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] flex-shrink-0 flex items-center justify-center text-[#444] text-xl">📷</div>
                                    }
                                    <div className="flex-1 space-y-2">
                                        <input type="text" value={data.productImage} onChange={(e) => setData((p: any) => ({ ...p, productImage: e.target.value }))} placeholder="URL da imagem" className={inputCls} />
                                        <button onClick={() => { setShowEdit(false); setShowLibrary(true); }} className="text-xs text-[#737373] hover:text-[#e5e5e5] underline-offset-2 hover:underline">
                                            Escolher da biblioteca de mídia
                                        </button>
                                    </div>
                                </div>
                                <textarea value={data.productDescription} onChange={(e) => setData((p: any) => ({ ...p, productDescription: e.target.value }))} placeholder="Escreva aqui o seu review do produto..." rows={4} className={`${inputCls} resize-none`} />
                            </div>

                            <div className="border-t border-[rgba(255,255,255,0.06)]" />

                            {/* Prós e Contras */}
                            <div>
                                <p className="text-xs font-semibold text-[#737373] uppercase tracking-widest mb-3">Prós e Contras</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
                                            <span className="text-xs font-medium text-[#e5e5e5]">Pontos positivos</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {data.pros.map((pro: string, i: number) => (
                                                <div key={i} className="flex gap-1.5">
                                                    <input type="text" value={pro} onChange={(e) => { const u = [...data.pros]; u[i] = e.target.value; setData((p: any) => ({ ...p, pros: u })); }} placeholder="Ex: Boa bateria" className={inputSmCls} />
                                                    <button onClick={() => setData((p: any) => ({ ...p, pros: p.pros.filter((_: any, idx: number) => idx !== i) }))} className="w-7 text-[#555] hover:text-[#e5e5e5] text-sm">×</button>
                                                </div>
                                            ))}
                                            <button onClick={() => setData((p: any) => ({ ...p, pros: [...p.pros, ''] }))} className="text-xs text-[#737373] hover:text-[#e5e5e5] mt-1">+ Adicionar</button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0" />
                                            <span className="text-xs font-medium text-[#e5e5e5]">Pontos negativos</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {data.cons.map((con: string, i: number) => (
                                                <div key={i} className="flex gap-1.5">
                                                    <input type="text" value={con} onChange={(e) => { const u = [...data.cons]; u[i] = e.target.value; setData((p: any) => ({ ...p, cons: u })); }} placeholder="Ex: Preço alto" className={inputSmCls} />
                                                    <button onClick={() => setData((p: any) => ({ ...p, cons: p.cons.filter((_: any, idx: number) => idx !== i) }))} className="w-7 text-[#555] hover:text-[#e5e5e5] text-sm">×</button>
                                                </div>
                                            ))}
                                            <button onClick={() => setData((p: any) => ({ ...p, cons: [...p.cons, ''] }))} className="text-xs text-[#737373] hover:text-[#e5e5e5] mt-1">+ Adicionar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-[rgba(255,255,255,0.06)]" />

                            {/* CTA */}
                            <div>
                                <p className="text-xs font-semibold text-[#737373] uppercase tracking-widest mb-3">Botão de ação <span className="normal-case font-normal">(opcional)</span></p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs text-[#737373] mb-1">Texto do botão</label>
                                        <input type="text" value={data.ctaText} onChange={(e) => setData((p: any) => ({ ...p, ctaText: e.target.value }))} placeholder="Ex: Ver na Amazon" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[#737373] mb-1">Link de destino</label>
                                        <input type="url" value={data.ctaUrl} onChange={(e) => setData((p: any) => ({ ...p, ctaUrl: e.target.value }))} placeholder="https://..." className={inputCls} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <label className="text-xs text-[#737373] whitespace-nowrap">Cor:</label>
                                    <input type="color" value={data.ctaColor} onChange={(e) => setData((p: any) => ({ ...p, ctaColor: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border border-[rgba(255,255,255,0.08)] bg-transparent p-0.5" />
                                    <input type="text" value={data.ctaColor} onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setData((p: any) => ({ ...p, ctaColor: v })); }} maxLength={7} className="w-20 px-2 py-1 rounded bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] font-mono text-xs focus:outline-none" />
                                    <div className="flex gap-1">
                                        {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4','#374151','#e5e5e5'].map(color => (
                                            <button key={color} type="button" onClick={() => setData((p: any) => ({ ...p, ctaColor: color }))} className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ background: color, borderColor: data.ctaColor === color ? '#fff' : 'transparent' }} />
                                        ))}
                                    </div>
                                    {data.ctaText && (
                                        <span className="ml-auto px-3 py-1 rounded text-xs font-semibold text-white whitespace-nowrap" style={{ background: data.ctaColor }}>
                                            {data.ctaText}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 px-6 py-4 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
                            <button onClick={handleSave} disabled={!data.productName} className="flex-1 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                Salvar alterações
                            </button>
                            <button onClick={() => setShowEdit(false)} className="px-5 py-2 rounded-lg text-[#737373] hover:text-[#e5e5e5] text-sm transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Biblioteca de mídia no modo edição */}
            <MediaLibrary
                isOpen={showLibrary}
                onClose={() => { setShowLibrary(false); setShowEdit(true); }}
                onSelect={(url) => { setData((p: any) => ({ ...p, productImage: url })); setShowLibrary(false); setShowEdit(true); }}
            />
        </NodeViewWrapper>
    );
}

// ── Product Review TipTap Extension ─────────────────────────────────────────
const ProductReviewExtension = Node.create({
    name: 'productReview',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            productName:        { default: '' },
            productImage:       { default: '' },
            productDescription: { default: '' },
            ctaText:  { default: '' },
            ctaUrl:   { default: '' },
            ctaColor: { default: '#ef4444' },
            pros: {
                default: [],
                parseHTML: (el) => {
                    const items = el.querySelectorAll('.product-review-pros-col li');
                    return Array.from(items).map(li => li.textContent || '');
                },
            },
            cons: {
                default: [],
                parseHTML: (el) => {
                    const items = el.querySelectorAll('.product-review-cons-col li');
                    return Array.from(items).map(li => li.textContent || '');
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div.product-review' }];
    },

    renderHTML({ node }) {
        const { productName, productImage, productDescription, pros, cons, ctaText, ctaUrl, ctaColor } = node.attrs;
        const prosArr: string[] = Array.isArray(pros) ? pros : [];
        const consArr: string[] = Array.isArray(cons) ? cons : [];

        const prosItems = prosArr.map(p => ['li', {}, p] as any);
        const consItems = consArr.map(c => ['li', {}, c] as any);
        const imgPart   = productImage ? [['img', { src: productImage, alt: productName, class: 'product-review-image' }] as any] : [];
        const descPart  = productDescription
            ? productDescription.split('\n').filter((l: string) => l.trim()).map((line: string) => ['p', { class: 'product-review-description' }, line] as any)
            : [];
        const btnColor  = ctaColor || '#ef4444';
        const ctaPart   = (ctaText && ctaUrl) ? [['div', { class: 'product-review-cta' },
            ['a', { href: ctaUrl, class: 'product-review-cta-btn', style: `background:${btnColor}`, target: '_blank', rel: 'noopener noreferrer' }, ctaText],
        ] as any] : [];

        return ['div', { class: 'product-review' },
            ['div', { class: 'product-review-header' },
                ...imgPart,
                ['div', { class: 'product-review-info' },
                    ['h3', { class: 'product-review-name' }, productName],
                    ...descPart,
                ],
            ],
            ['table', { class: 'product-review-table' },
                ['thead', {},
                    ['tr', {},
                        ['th', { class: 'product-review-pros-header' }, '✅ Prós'],
                        ['th', { class: 'product-review-cons-header' }, '❌ Contras'],
                    ],
                ],
                ['tbody', {},
                    ['tr', {},
                        ['td', { class: 'product-review-pros-col' }, ['ul', {}, ...prosItems]],
                        ['td', { class: 'product-review-cons-col' }, ['ul', {}, ...consItems]],
                    ],
                ],
            ],
            ...ctaPart,
        ] as any;
    },

    addNodeView() {
        return ReactNodeViewRenderer(ProductReviewNodeView);
    },
});

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function WYSIWYGEditor({ value, onChange, placeholder = 'Digite "/" para inserir blocos...' }: Props) {
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [mediaLibraryTarget, setMediaLibraryTarget] = useState<'post' | 'review'>('post');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewData, setReviewData] = useState({
        productName: '',
        productImage: '',
        productDescription: '',
        ctaText: '',
        ctaUrl: '',
        ctaColor: '#ef4444',
        pros: [''],
        cons: [''],
    });

    /**
     * Evita reaplicar o mesmo `value` ao editor (e alinha com o que o pai já tem após onChange).
     */
    const lastSyncedFromParentRef = useRef<string | undefined>(undefined);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                codeBlock: {
                    HTMLAttributes: {
                        class: 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 font-mono text-sm',
                    },
                },
            }),
            HeadingWithClass,
            PreservedHtmlExtension,
            Placeholder.configure({
                placeholder,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-[#3b82f6] hover:underline cursor-pointer',
                    // Links editoriais (internos/externos de conteúdo) devem ser follow por padrão.
                    rel: null,
                    target: null,
                },
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-lg my-4',
                },
            }),
            HorizontalRule.configure({
                HTMLAttributes: {
                    class: 'my-8 border-t border-[rgba(255,255,255,0.08)]',
                },
            }),
            ProductReviewExtension,
            ...affiliateBlockExtensions,
        ],
        // Conteúdo real vem do useEffect — evita 1.º onUpdate a chamar onChange() com doc vazio/truncado.
        content: '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] p-6 text-[#e5e5e5]',
                style: 'color: rgb(229 231 235);',
            },
            handleKeyDown: (view, event) => {
                // Slash command - digite "/" para menu de blocos
                if (event.key === '/' && !event.shiftKey) {
                    const { selection } = view.state;
                    const { $from } = selection;
                    const textBefore = $from.nodeBefore?.textContent || '';
                    
                    // Se o caractere antes do cursor é "/", mostra menu
                    if (textBefore.endsWith('/')) {
                        // Aqui você pode adicionar um menu de blocos
                        // Por enquanto, apenas previne o comportamento padrão
                        return false;
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            const expanded = expandPreservedHtmlBlocks(editor.getHTML());
            lastSyncedFromParentRef.current = expanded;
            onChange(expanded);
        },
    });

    useEffect(() => {
        if (!editor) return;
        const v = value ?? '';
        if (lastSyncedFromParentRef.current === v) return;
        lastSyncedFromParentRef.current = v;
        const parsed = preprocessHtmlForTipTap(v);
        // emitUpdate: false → não dispara onUpdate; evita sobrescrever o estado do post com HTML a meio.
        editor.commands.setContent(parsed || '<p></p>', { emitUpdate: false });
    }, [value, editor]);

    const insertImage = () => {
        if (imageUrl) {
            editor?.chain().focus().setImage({ src: imageUrl }).run();
            setImageUrl('');
            setShowImageModal(false);
        }
    };

    const openLibraryForReview = () => {
        setMediaLibraryTarget('review');
        setShowReviewModal(false);   // esconde o review modal para evitar conflito
        setShowMediaLibrary(true);
    };

    const handleSelectFromLibrary = (url: string) => {
        setShowMediaLibrary(false);
        if (mediaLibraryTarget === 'review') {
            setReviewData(prev => ({ ...prev, productImage: url }));
            setShowReviewModal(true);  // volta para o review modal
        } else {
            editor?.chain().focus().setImage({ src: url }).run();
        }
    };

    const handleCloseLibrary = () => {
        setShowMediaLibrary(false);
        if (mediaLibraryTarget === 'review') {
            setShowReviewModal(true);  // volta para o review modal ao cancelar
        }
    };

    const insertProductReview = () => {
        const { productName, productImage, productDescription, ctaText, ctaUrl, ctaColor, pros, cons } = reviewData;
        if (!productName) return;

        editor?.chain().focus().insertContent({
            type: 'productReview',
            attrs: {
                productName,
                productImage,
                productDescription,
                ctaText,
                ctaUrl,
                ctaColor,
                pros: pros.filter(p => p.trim()),
                cons: cons.filter(c => c.trim()),
            },
        }).run();

        setShowReviewModal(false);
        setReviewData({ productName: '', productImage: '', productDescription: '', ctaText: '', ctaUrl: '', ctaColor: '#ef4444', pros: [''], cons: [''] });
    };

    const insertLink = () => {
        const { from, to } = editor?.state.selection || {};
        const selectedText = editor?.state.doc.textBetween(from || 0, to || 0, ' ');
        
        // Se houver texto selecionado, usa como texto do link
        if (selectedText) {
            setLinkText(selectedText);
        }
        
        setShowLinkModal(true);
    };

    const handleInsertLink = () => {
        if (!linkUrl) return;
        
        const { from, to } = editor?.state.selection || {};
        const selectedText = editor?.state.doc.textBetween(from || 0, to || 0, ' ');
        
        if (selectedText) {
            // Se há texto selecionado, transforma em link
            editor?.chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: linkUrl, target: null, rel: null })
                .run();
        } else {
            // Se não há texto selecionado, insere link com texto
            const text = linkText || linkUrl;
            editor?.chain()
                .focus()
                .insertContent(`<a href="${linkUrl}">${text}</a>`)
                .run();
        }
        
        setLinkUrl('');
        setLinkText('');
        setShowLinkModal(false);
    };

    const removeLink = () => {
        editor?.chain().focus().unsetLink().run();
    };

    if (!editor) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg">
                <p className="text-[#a3a3a3]">Carregando editor...</p>
            </div>
        );
    }

    /** Evita perder seleção ao clicar na toolbar (TipTap). */
    const tpHold = (fn: () => void) => (e: MouseEvent) => {
        e.preventDefault();
        fn();
    };

    const runReviewHeading = () => {
        const h = editor.getAttributes('heading');
        const isReviewH2 = editor.isActive('heading', { level: 2 }) && h.class === 'review-section-label';
        if (isReviewH2) {
            editor.chain().focus().updateAttributes('heading', { class: null }).run();
            return;
        }
        if (editor.isActive('heading', { level: 2 })) {
            editor.chain().focus().updateAttributes('heading', { class: 'review-section-label' }).run();
            return;
        }
        if (editor.isActive('heading')) {
            editor.chain().focus().setHeading({ level: 2, class: 'review-section-label' }).run();
            return;
        }
        editor
            .chain()
            .focus()
            .insertContent({
                type: 'heading',
                attrs: { level: 2, class: 'review-section-label' },
                content: [{ type: 'text', text: 'Título da seção ou do produto' }],
            })
            .run();
    };

    const pill = (active: boolean) =>
        `rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
            active
                ? 'border-teal-400/60 bg-teal-950/50 text-teal-100'
                : 'border-white/10 bg-black/30 text-neutral-400 hover:border-teal-500/30 hover:text-neutral-200'
        }`;

    const menuPanel = 'absolute left-0 top-full z-[60] mt-1 min-w-[16rem] max-w-[min(100vw-2rem,28rem)] rounded-xl border border-violet-500/20 bg-[#12121a] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)]';

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
            {/* Painel novo: menus suspensos + etiqueta visível (confirma deploy do bundle) */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 border-b border-violet-500/25 bg-gradient-to-r from-[#0a0a12] via-[#0c0c14] to-[#0a1014] shrink-0 max-w-full">
                <span
                    className="select-none rounded-md border border-teal-500/40 bg-teal-950/40 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200"
                    title="Se vês isto, o JS novo carregou"
                >
                    Editor · 2026
                </span>

                <details className="group relative">
                    <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-950/25 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-950/40 [&::-webkit-details-marker]:hidden">
                        Formatação
                        <span className="text-violet-400/80" aria-hidden>
                            ▾
                        </span>
                    </summary>
                    <div className={menuPanel} onMouseDown={(e) => e.preventDefault()}>
                        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Estilo</p>
                        <div className="flex flex-wrap gap-1">
                            <button type="button" className={pill(editor.isActive('bold'))} onMouseDown={tpHold(() => editor.chain().focus().toggleBold().run())} disabled={!editor.can().chain().focus().toggleBold().run()}>
                                <strong>Negrito</strong>
                            </button>
                            <button type="button" className={pill(editor.isActive('italic'))} onMouseDown={tpHold(() => editor.chain().focus().toggleItalic().run())} disabled={!editor.can().chain().focus().toggleItalic().run()}>
                                <em>Itálico</em>
                            </button>
                            <button type="button" className={pill(editor.isActive('strike'))} onMouseDown={tpHold(() => editor.chain().focus().toggleStrike().run())} disabled={!editor.can().chain().focus().toggleStrike().run()}>
                                <s>Riscado</s>
                            </button>
                            <button type="button" className={pill(editor.isActive('code'))} onMouseDown={tpHold(() => editor.chain().focus().toggleCode().run())} disabled={!editor.can().chain().focus().toggleCode().run()}>
                                Código
                            </button>
                        </div>
                        <p className="mb-1.5 mt-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Títulos</p>
                        <div className="flex flex-wrap gap-1">
                            <button type="button" className={pill(editor.isActive('heading', { level: 1 }))} onMouseDown={tpHold(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}>
                                Seção 1
                            </button>
                            <button
                                type="button"
                                className={pill(editor.isActive('heading', { level: 2 }) && !editor.getAttributes('heading').class)}
                                onMouseDown={tpHold(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                            >
                                Seção 2
                            </button>
                            <button type="button" className={pill(editor.isActive('heading', { level: 3 }))} onMouseDown={tpHold(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>
                                Seção 3
                            </button>
                            <button
                                type="button"
                                className={pill(editor.isActive('heading', { level: 2 }) && editor.getAttributes('heading').class === 'review-section-label')}
                                onMouseDown={tpHold(runReviewHeading)}
                            >
                                H2 review
                            </button>
                        </div>
                        <p className="mb-1.5 mt-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Listas</p>
                        <div className="flex flex-wrap gap-1">
                            <button type="button" className={pill(editor.isActive('bulletList'))} onMouseDown={tpHold(() => editor.chain().focus().toggleBulletList().run())}>
                                Marcadores
                            </button>
                            <button type="button" className={pill(editor.isActive('orderedList'))} onMouseDown={tpHold(() => editor.chain().focus().toggleOrderedList().run())}>
                                Numerada
                            </button>
                        </div>
                    </div>
                </details>

                <details className="group relative">
                    <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-950/35 [&::-webkit-details-marker]:hidden">
                        Blocos de artigo
                        <span className="text-amber-400/80" aria-hidden>
                            ▾
                        </span>
                    </summary>
                    <div className={menuPanel} onMouseDown={(e) => e.preventDefault()}>
                        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Base</p>
                        <div className="flex flex-wrap gap-1">
                            <button type="button" className={pill(editor.isActive('blockquote'))} onMouseDown={tpHold(() => editor.chain().focus().toggleBlockquote().run())}>
                                Citação
                            </button>
                            <button type="button" className={pill(editor.isActive('codeBlock'))} onMouseDown={tpHold(() => editor.chain().focus().toggleCodeBlock().run())}>
                                Código bloco
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => editor.chain().focus().setHorizontalRule().run())}>
                                Divisor
                            </button>
                        </div>
                        <p className="mb-1.5 mt-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Afiliados / review</p>
                        <div className="flex flex-wrap gap-1">
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => setShowReviewModal(true))}>
                                Caixa review
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => editor.chain().focus().insertContent(affiliateBlockDefaults.productCard).run())}>
                                Card produto
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => editor.chain().focus().insertContent(affiliateBlockDefaults.roundup).run())}>
                                Ranking
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => editor.chain().focus().insertContent(affiliateBlockDefaults.compare).run())}>
                                Comparativo
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => editor.chain().focus().insertContent(affiliateBlockDefaults.prosCons).run())}>
                                Prós / contras
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => editor.chain().focus().insertContent(affiliateBlockDefaults.versus).run())}>
                                Versus
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => editor.chain().focus().insertContent(affiliateBlockDefaults.techSheet).run())}>
                                Ficha técnica
                            </button>
                        </div>
                    </div>
                </details>

                <details className="group relative">
                    <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border border-sky-500/35 bg-sky-950/20 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-950/35 [&::-webkit-details-marker]:hidden">
                        Ligações e mídia
                        <span className="text-sky-400/80" aria-hidden>
                            ▾
                        </span>
                    </summary>
                    <div className={menuPanel} onMouseDown={(e) => e.preventDefault()}>
                        <div className="flex flex-wrap gap-1">
                            {editor.isActive('link') ? (
                                <>
                                    <button type="button" className={pill(true)} onMouseDown={tpHold(insertLink)}>
                                        Editar ligação
                                    </button>
                                    <button type="button" className={pill(false)} onMouseDown={tpHold(removeLink)}>
                                        Remover ligação
                                    </button>
                                </>
                            ) : (
                                <button type="button" className={pill(false)} onMouseDown={tpHold(insertLink)}>
                                    Inserir ligação
                                </button>
                            )}
                            <button
                                type="button"
                                className={pill(false)}
                                onMouseDown={tpHold(() => {
                                    setMediaLibraryTarget('post');
                                    setShowMediaLibrary(true);
                                })}
                            >
                                Galeria
                            </button>
                            <button type="button" className={pill(false)} onMouseDown={tpHold(() => setShowImageModal(true))}>
                                Imagem por URL
                            </button>
                        </div>
                    </div>
                </details>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
                <EditorContent editor={editor} />
            </div>

            {/* Modal de Link */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkModal(false)}>
                    <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#e5e5e5] mb-4">
                            {editor?.isActive('link') ? 'Editar Link' : 'Inserir Link'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                    URL *
                                </label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://exemplo.com"
                                    className="w-full px-4 py-2 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#737373] focus:outline-none focus:border-[#3b82f6]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleInsertLink();
                                        }
                                    }}
                                />
                            </div>
                            {!editor?.state.selection.empty && (
                                <div>
                                    <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                        Texto do Link (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={linkText}
                                        onChange={(e) => setLinkText(e.target.value)}
                                        placeholder="Texto do link"
                                        className="w-full px-4 py-2 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#737373] focus:outline-none focus:border-[#3b82f6]"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={handleInsertLink}
                                disabled={!linkUrl}
                                className="flex-1 px-4 py-2 rounded-lg bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editor?.isActive('link') ? 'Atualizar' : 'Inserir'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowLinkModal(false);
                                    setLinkUrl('');
                                    setLinkText('');
                                }}
                                className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] font-semibold hover:bg-[#222222] transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Imagem */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
                    <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#e5e5e5] mb-4">Inserir Imagem</h3>
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Cole a URL da imagem"
                            className="w-full px-4 py-2 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#737373] focus:outline-none focus:border-[#3b82f6] mb-4"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    insertImage();
                                }
                            }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={insertImage}
                                disabled={!imageUrl}
                                className="flex-1 px-4 py-2 rounded-lg bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Inserir
                            </button>
                            <button
                                onClick={() => {
                                    setShowImageModal(false);
                                    setImageUrl('');
                                }}
                                className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] font-semibold hover:bg-[#222222] transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Biblioteca de Mídia */}
            <MediaLibrary
                isOpen={showMediaLibrary}
                onClose={handleCloseLibrary}
                onSelect={handleSelectFromLibrary}
            />

            {/* Modal de Review de Produto */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowReviewModal(false)}>
                    <div className="bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

                        {/* Cabeçalho */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                            <h3 className="text-sm font-semibold text-[#e5e5e5]">Inserir Review de Produto</h3>
                            <button
                                onClick={() => { setShowReviewModal(false); setReviewData({ productName: '', productImage: '', productDescription: '', ctaText: '', ctaUrl: '', ctaColor: '#ef4444', pros: [''], cons: [''] }); }}
                                className="text-[#737373] hover:text-[#e5e5e5] text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-[rgba(255,255,255,0.05)]"
                            >
                                ×
                            </button>
                        </div>

                        {/* Corpo com scroll */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                            {/* ── Seção 1: Produto ── */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-[#737373] uppercase tracking-widest">Produto</p>

                                <input
                                    type="text"
                                    value={reviewData.productName}
                                    onChange={(e) => setReviewData(prev => ({ ...prev, productName: e.target.value }))}
                                    placeholder="Nome do produto *"
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.25)] text-sm"
                                />

                                <div className="flex gap-3 items-start">
                                    {reviewData.productImage
                                        ? <img src={reviewData.productImage} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-[rgba(255,255,255,0.08)]" />
                                        : <div className="w-16 h-16 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] flex-shrink-0 flex items-center justify-center text-[#444] text-xl">📷</div>
                                    }
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            value={reviewData.productImage}
                                            onChange={(e) => setReviewData(prev => ({ ...prev, productImage: e.target.value }))}
                                            placeholder="URL da imagem do produto"
                                            className="w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.25)] text-sm"
                                        />
                                        <button
                                            onClick={openLibraryForReview}
                                            className="text-xs text-[#737373] hover:text-[#e5e5e5] underline-offset-2 hover:underline"
                                        >
                                            Escolher da biblioteca de mídia
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    value={reviewData.productDescription}
                                    onChange={(e) => setReviewData(prev => ({ ...prev, productDescription: e.target.value }))}
                                    placeholder="Escreva aqui o seu review do produto..."
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.25)] text-sm resize-none"
                                />
                            </div>

                            <div className="border-t border-[rgba(255,255,255,0.06)]" />

                            {/* ── Seção 2: Prós e Contras em 2 colunas ── */}
                            <div>
                                <p className="text-xs font-semibold text-[#737373] uppercase tracking-widest mb-3">Prós e Contras</p>
                                <div className="grid grid-cols-2 gap-4">

                                    {/* Prós */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
                                            <span className="text-xs font-medium text-[#e5e5e5]">Pontos positivos</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {reviewData.pros.map((pro, i) => (
                                                <div key={i} className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={pro}
                                                        onChange={(e) => {
                                                            const updated = [...reviewData.pros];
                                                            updated[i] = e.target.value;
                                                            setReviewData(prev => ({ ...prev, pros: updated }));
                                                        }}
                                                        placeholder={`Ex: Boa bateria`}
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.2)] text-xs"
                                                    />
                                                    <button
                                                        onClick={() => setReviewData(prev => ({ ...prev, pros: prev.pros.filter((_, idx) => idx !== i) }))}
                                                        className="w-7 text-[#555] hover:text-[#e5e5e5] text-sm flex-shrink-0"
                                                    >×</button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setReviewData(prev => ({ ...prev, pros: [...prev.pros, ''] }))}
                                                className="text-xs text-[#737373] hover:text-[#e5e5e5] mt-1"
                                            >+ Adicionar</button>
                                        </div>
                                    </div>

                                    {/* Contras */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0" />
                                            <span className="text-xs font-medium text-[#e5e5e5]">Pontos negativos</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {reviewData.cons.map((con, i) => (
                                                <div key={i} className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={con}
                                                        onChange={(e) => {
                                                            const updated = [...reviewData.cons];
                                                            updated[i] = e.target.value;
                                                            setReviewData(prev => ({ ...prev, cons: updated }));
                                                        }}
                                                        placeholder={`Ex: Preço alto`}
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.2)] text-xs"
                                                    />
                                                    <button
                                                        onClick={() => setReviewData(prev => ({ ...prev, cons: prev.cons.filter((_, idx) => idx !== i) }))}
                                                        className="w-7 text-[#555] hover:text-[#e5e5e5] text-sm flex-shrink-0"
                                                    >×</button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setReviewData(prev => ({ ...prev, cons: [...prev.cons, ''] }))}
                                                className="text-xs text-[#737373] hover:text-[#e5e5e5] mt-1"
                                            >+ Adicionar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-[rgba(255,255,255,0.06)]" />

                            {/* ── Seção 3: Botão CTA ── */}
                            <div>
                                <p className="text-xs font-semibold text-[#737373] uppercase tracking-widest mb-3">Botão de ação <span className="normal-case font-normal">(opcional)</span></p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs text-[#737373] mb-1">Texto do botão</label>
                                        <input
                                            type="text"
                                            value={reviewData.ctaText}
                                            onChange={(e) => setReviewData(prev => ({ ...prev, ctaText: e.target.value }))}
                                            placeholder="Ex: Ver na Amazon"
                                            className="w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.25)] text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[#737373] mb-1">Link de destino</label>
                                        <input
                                            type="url"
                                            value={reviewData.ctaUrl}
                                            onChange={(e) => setReviewData(prev => ({ ...prev, ctaUrl: e.target.value }))}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[rgba(255,255,255,0.25)] text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Seletor de cor compacto */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <label className="text-xs text-[#737373] whitespace-nowrap">Cor:</label>
                                    <input
                                        type="color"
                                        value={reviewData.ctaColor}
                                        onChange={(e) => setReviewData(prev => ({ ...prev, ctaColor: e.target.value }))}
                                        className="w-7 h-7 rounded cursor-pointer border border-[rgba(255,255,255,0.08)] bg-transparent p-0.5"
                                        title="Abrir seletor de cor"
                                    />
                                    <input
                                        type="text"
                                        value={reviewData.ctaColor}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setReviewData(prev => ({ ...prev, ctaColor: v }));
                                        }}
                                        maxLength={7}
                                        className="w-20 px-2 py-1 rounded bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] font-mono text-xs focus:outline-none focus:border-[rgba(255,255,255,0.25)]"
                                    />
                                    <div className="flex gap-1">
                                        {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4','#374151','#e5e5e5'].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setReviewData(prev => ({ ...prev, ctaColor: color }))}
                                                title={color}
                                                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
                                                style={{ background: color, borderColor: reviewData.ctaColor === color ? '#fff' : 'transparent' }}
                                            />
                                        ))}
                                    </div>
                                    {reviewData.ctaText && (
                                        <span className="ml-auto px-3 py-1 rounded text-xs font-semibold text-white whitespace-nowrap" style={{ background: reviewData.ctaColor }}>
                                            {reviewData.ctaText}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Rodapé fixo */}
                        <div className="flex gap-2 px-6 py-4 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
                            <button
                                onClick={insertProductReview}
                                disabled={!reviewData.productName}
                                className="flex-1 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Inserir no post
                            </button>
                            <button
                                onClick={() => { setShowReviewModal(false); setReviewData({ productName: '', productImage: '', productDescription: '', ctaText: '', ctaUrl: '', ctaColor: '#ef4444', pros: [''], cons: [''] }); }}
                                className="px-5 py-2 rounded-lg text-[#737373] hover:text-[#e5e5e5] text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
