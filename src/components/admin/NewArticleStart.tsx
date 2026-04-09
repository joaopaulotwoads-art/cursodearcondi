/**
 * Assistente inicial para criar post: escolhe modelo e abre o editor com ?t=
 */

import { ARTICLE_TEMPLATE_IDS, describeTemplate, type ArticleTemplateId } from '../../utils/article-templates';

export default function NewArticleStart() {
    const go = (id: ArticleTemplateId) => {
        window.location.href = `/admin/posts/new?t=${encodeURIComponent(id)}`;
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-2">Novo artigo</h2>
                <p className="text-[#a3a3a3] text-sm">
                    Escolha um modelo para comecar com texto guia, SEO sugerido e formato HTML. Voce pode editar tudo depois.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ARTICLE_TEMPLATE_IDS.map((id) => {
                    const d = describeTemplate(id);
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => go(id)}
                            className="text-left rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 p-5 hover:bg-white/[0.08] hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <div className="text-2xl mb-2">{d.icon}</div>
                            <div className="font-heading font-bold text-[#e5e5e5] mb-1">{d.title}</div>
                            <div className="text-xs text-[#a3a3a3] leading-relaxed">{d.description}</div>
                        </button>
                    );
                })}
            </div>

            <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.15)] p-6 text-center">
                <p className="text-sm text-[#737373] mb-3">Prefere comecar do zero, sem modelo?</p>
                <a href="/admin/posts/new" className="admin-btn admin-btn-secondary inline-flex items-center gap-2">
                    Abrir editor em branco
                </a>
            </div>

            <p className="text-xs text-[#737373]">
                Dica: no editor, use a barra de ferramentas para inserir blocos <strong>Produto</strong>,{' '}
                <strong>Lista / Roundup</strong>, <strong>Versus</strong> e outros.
            </p>
        </div>
    );
}
