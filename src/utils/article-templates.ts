/**
 * Modelos para o assistente "Novo artigo" (admin).
 * Cada id corresponde ao query param ?t= na rota /admin/posts/new
 */

import type { PostData } from './post-utils';

export const ARTICLE_TEMPLATE_IDS = ['informative', 'ranking', 'versus', 'product'] as const;
export type ArticleTemplateId = (typeof ARTICLE_TEMPLATE_IDS)[number];

export interface ArticleTemplateApply {
    content: string;
    contentFormatHtml: boolean;
    seoSchema: NonNullable<PostData['seoSchema']>;
    /** Texto sugerido só se título ainda estiver vazio */
    titleHint?: string;
}

const isValidId = (id: string | undefined): id is ArticleTemplateId =>
    !!id && (ARTICLE_TEMPLATE_IDS as readonly string[]).includes(id);

export function getArticleTemplate(id: string | undefined): ArticleTemplateApply | null {
    if (!isValidId(id)) return null;

    switch (id) {
        case 'informative':
            return {
                titleHint: 'Titulo do artigo',
                content: [
                    '<p>Introduza o tema em uma ou duas frases.</p>',
                    '<h2>Primeiro topico</h2>',
                    '<p>Desenvolva o conteudo aqui. Use subtitulos para quebrar o texto.</p>',
                    '<h2>Conclusao</h2>',
                    '<p>Feche com um resumo objetivo.</p>',
                ].join('\n'),
                contentFormatHtml: true,
                seoSchema: 'blogPosting',
            };
        case 'ranking':
            return {
                titleHint: 'Melhores [categoria] em [ano]',
                content: [
                    '<p>Este guia apresenta uma lista ordenada com criterios claros.</p>',
                    '<h2>Criterios de escolha</h2>',
                    '<p>Explique o que foi considerado (preco, qualidade, suporte, etc.).</p>',
                    '<h2>Ranking</h2>',
                    '<p>Na barra do editor, use o bloco <strong>Lista / Roundup</strong> para montar a lista de produtos.</p>',
                ].join('\n'),
                contentFormatHtml: true,
                seoSchema: 'articleItemList',
            };
        case 'versus':
            return {
                titleHint: 'X vs Y: qual escolher',
                content: [
                    '<p>Compare duas opcoes para o leitor decidir com seguranca.</p>',
                    '<h2>Contexto</h2>',
                    '<p>Para quem este comparativo faz sentido.</p>',
                    '<h2>Comparativo</h2>',
                    '<p>Na barra do editor, insira o bloco <strong>Versus</strong> e preencha os dois lados.</p>',
                ].join('\n'),
                contentFormatHtml: true,
                seoSchema: 'blogPosting',
            };
        case 'product':
            return {
                titleHint: 'Produto X e bom? Analise',
                content: [
                    '<p>Resumo em uma frase sobre o produto e para quem serve.</p>',
                    '<h2>Ficha e impressoes</h2>',
                    '<p>Destaque peso, limites, diferenciais tecnicos.</p>',
                    '<h2>Card do produto</h2>',
                    '<p>Use o bloco <strong>Produto</strong> e, se quiser, <strong>Pros / Contras</strong> na barra do editor.</p>',
                ].join('\n'),
                contentFormatHtml: true,
                seoSchema: 'auto',
            };
        default:
            return null;
    }
}

export function describeTemplate(id: ArticleTemplateId): { title: string; description: string; icon: string } {
    switch (id) {
        case 'informative':
            return {
                icon: '📄',
                title: 'Artigo informativo',
                description: 'Texto com titulos e paragrafos. Ideal para guias e explicacoes.',
            };
        case 'ranking':
            return {
                icon: '🏆',
                title: 'Ranking / lista',
                description: 'Lista de produtos com notas. Ativa schema de lista no Google.',
            };
        case 'versus':
            return {
                icon: '⚖️',
                title: 'Comparativo',
                description: 'Dois lados lado a lado com o bloco Versus.',
            };
        case 'product':
            return {
                icon: '🛒',
                title: 'Review de produto',
                description: 'Foco em um item com card de produto e pros e contras.',
            };
        default:
            return { icon: '📝', title: 'Modelo', description: '' };
    }
}
