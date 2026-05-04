/**
 * api/admin/posts/ai/generate.ts
 *
 * API route para gerar posts com IA.
 * Fluxo em 4 etapas para melhor coerência e qualidade:
 *   1. Visão geral — IA planeja o artigo baseado nas outlines
 *   2. Introdução — IA gera intro contextualizada
 *   3. Seções — IA gera cada outline com contexto acumulado
 *   4. Conclusão — IA gera conclusão coerente com todo o conteúdo
 *
 * Tipos de post:
 *   - Informacional: conteúdo educativo
 *   - Comercial → Guia dos melhores: listas ranqueadas
 *   - Comercial → SPR: Single Product Review
 */

import type { APIRoute } from 'astro';
import { writePost, slugExists } from '../../../../../utils/post-utils';
import type { PostData } from '../../../../../utils/post-utils';
import { loadAISettings, resolveApiKey, callAI } from '../../../../../utils/ai-provider';
import { searchPexelsPhotos, getPhotoUrl, getThumbnailUrl } from '../../../../../utils/pexels';

interface Outline {
    level: 'h1' | 'h2' | 'h3' | 'h4';
    text: string;
    imageUrl?: string;
    /** Número de palavras alvo. Padrão: 100-150 se não informado */
    minWords?: number;
}

interface Product {
    name: string;
    imageUrl: string;
}

type PostType = 'informational' | 'commercial';
type CommercialSubType = 'guia-melhores' | 'spr';

const DELAY_MS = 500;
const MAX_TOKENS_SECTION = 2048;

/** Regra de legibilidade: máx 3 linhas por parágrafo; quebra no primeiro . após a 2ª linha */
const PARAGRAPH_RULE = 'Parágrafos com no máximo 3 linhas. Quebre no primeiro ponto final (.) da segunda linha, inserindo linha em branco para novo parágrafo.';

function formatOutlines(outlines: Outline[]): string {
    return outlines.map((o, i) => `${i + 1}. ${o.level.toUpperCase()}: ${o.text}`).join('\n');
}

function getHeadingTag(level: string): string {
    const n = level === 'h1' ? 1 : level === 'h2' ? 2 : level === 'h3' ? 3 : 4;
    return '#'.repeat(n);
}

/** Pós-processa o conteúdo para aplicar a regra de legibilidade dos parágrafos */
function formatParagraphsForReadability(content: string): string {
    const blocks = content.split(/\n\n+/);
    return blocks.map(block => {
        if (block.startsWith('#') && !block.includes('\n')) return block;
        if (block.startsWith('![')) return block;
        return processParagraph(block);
    }).join('\n\n');
}

function processParagraph(para: string): string {
    const lines = para.split('\n');
    if (lines.length < 2) return para;
    const line2 = lines[1];
    const dotIdx = line2.indexOf('.');
    if (dotIdx >= 0) {
        const p1 = lines[0] + '\n' + line2.substring(0, dotIdx + 1);
        const rest = line2.substring(dotIdx + 1).trim() + (lines.length > 2 ? '\n' + lines.slice(2).join('\n') : '');
        if (rest.trim()) return p1 + '\n\n' + processParagraph(rest);
        return p1;
    }
    if (lines.length > 3) {
        const p1 = lines.slice(0, 2).join('\n');
        const rest = lines.slice(2).join('\n');
        return p1 + '\n\n' + processParagraph(rest);
    }
    return para;
}

/** Conta palavras em um texto (split por espaços). */
function countWords(text: string): number {
    return (text.trim().match(/\S+/g) || []).length;
}

/**
 * Traduz o título para inglês via IA (Pexels retorna melhores resultados em inglês).
 * Fallback: retorna o original se a tradução falhar ou não houver IA.
 */
async function translateTitleToEnglish(
    title: string,
    callAIFn: (prompt: string) => Promise<string>
): Promise<string> {
    if (!title?.trim()) return title;
    try {
        const translated = await callAIFn(
            `Traduza para inglês APENAS o texto abaixo. Responda somente com a tradução, sem aspas nem explicações.\n\n${title}`
        );
        const cleaned = translated?.trim().replace(/^["']|["']$/g, '');
        return cleaned && cleaned.length > 2 ? cleaned : title;
    } catch {
        return title;
    }
}

/**
 * Insere imagens do Pexels no conteúdo: 1 a cada ~400 palavras, máx 5.
 * Usa searchQuery (título em inglês) para buscar no Pexels; title original para alt text.
 * Retorna também a URL da primeira foto para usar como thumbnail.
 */
async function insertImagesByWordCount(
    content: string,
    title: string,
    pexelsApiKey: string,
    searchQuery: string
): Promise<{ content: string; thumbnailUrl?: string }> {
    if (!pexelsApiKey?.trim() || !searchQuery?.trim()) return { content };

    const photos = await searchPexelsPhotos(pexelsApiKey, searchQuery, 5);
    if (!photos.length) return { content };

    const totalWords = countWords(content);
    const numImages = Math.min(5, Math.floor(totalWords / 400));
    const thumbnailUrl = photos[0] ? getThumbnailUrl(photos[0]) : undefined;

    if (numImages <= 0) return { content, thumbnailUrl };

    const blocks = content.split(/\n\n+/);
    const result: string[] = [];
    let wordCount = 0;
    let nextImageAt = 400;
    let photoIndex = 0;

    for (const block of blocks) {
        result.push(block);
        wordCount += countWords(block);

        while (wordCount >= nextImageAt && photoIndex < photos.length && photoIndex < numImages) {
            const photo = photos[photoIndex];
            const url = getPhotoUrl(photo);
            const alt = `${title} - imagem ${photoIndex + 1}`;
            result.push(`![${alt}](${url})`);
            photoIndex++;
            nextImageAt += 400;
        }
    }

    return { content: result.join('\n\n'), thumbnailUrl };
}

// ── Prompts por tipo ─────────────────────────────────────────────────────────

function buildVisionPrompt(
    title: string,
    outlines: Outline[],
    postType: PostType,
    commercialSubType?: CommercialSubType
): string {
    const outlineText = formatOutlines(outlines);

    if (postType === 'informational') {
        return `Título do artigo: ${title}

Estrutura do artigo:
${outlineText}

Crie uma VISÃO GERAL (plano) deste artigo informacional em 2-4 parágrafos. Defina:
- O ângulo/abordagem principal
- O público-alvo
- Os principais pontos que serão cobertos
- O tom (educativo, acessível, baseado em evidências)

Responda APENAS com a visão geral, sem escrever o conteúdo do artigo.`;
    }

    if (commercialSubType === 'guia-melhores') {
        return `Título do artigo: ${title}

Estrutura do artigo:
${outlineText}

Este é um GUIA DOS MELHORES (lista ranqueada). Crie uma VISÃO GERAL em 2-4 parágrafos definindo:
- Os critérios de ranqueamento que serão usados
- A metodologia de comparação
- O público-alvo e suas necessidades
- O tom (persuasivo mas informativo, foco em ajudar na decisão de compra)

Responda APENAS com a visão geral, sem escrever o conteúdo do artigo.`;
    }

    // SPR
    return `Título do artigo: ${title}

Estrutura do artigo:
${outlineText}

Este é um SPR (Single Product Review). Crie uma VISÃO GERAL em 2-4 parágrafos definindo:
- O produto/serviço em foco
- Os principais aspectos que serão avaliados
- O público-alvo
- O tom (analítico, honesto, com prós e contras, CTA natural)

Responda APENAS com a visão geral, sem escrever o conteúdo do artigo.`;
}

function buildIntroPrompt(
    title: string,
    outlines: Outline[],
    vision: string,
    postType: PostType,
    commercialSubType?: CommercialSubType
): string {
    const outlineText = formatOutlines(outlines);

    let instructions = '';
    if (postType === 'informational') {
        instructions = 'Escreva uma introdução que contextualize o tema, antecipe o que será abordado e engaje o leitor. Use # Introdução como título. Formato Markdown.';
    } else if (commercialSubType === 'guia-melhores') {
        instructions = 'Escreva uma introdução que apresente o guia, explique como a lista foi montada e prometa valor ao leitor. Use # Introdução como título. Formato Markdown.';
    } else {
        instructions = 'Escreva uma introdução que apresente o produto/serviço e o contexto do review. Use # Introdução como título. Formato Markdown.';
    }

    return `Título: ${title}

Estrutura:
${outlineText}

Visão geral do artigo:
${vision}

${instructions}

Entre 50 e 100 palavras. NÃO inclua outras seções além da introdução.

${PARAGRAPH_RULE}`;
}

function buildSectionPrompt(
    title: string,
    outline: Outline,
    outlines: Outline[],
    vision: string,
    intro: string,
    previousSections: string,
    postType: PostType,
    commercialSubType?: CommercialSubType
): string {
    const outlineText = formatOutlines(outlines);
    const minWords = outline.minWords && outline.minWords >= 50 ? outline.minWords : 125;
    const wordInstruction = `RESPEITE RIGOROSAMENTE: escreva com aproximadamente ${minWords} palavras (entre ${Math.max(50, minWords - 25)} e ${minWords + 25}).`;

    let requirements = '';
    if (postType === 'informational') {
        requirements = `- ${wordInstruction}\n- ${PARAGRAPH_RULE}\n- Conteúdo baseado em evidências\n- Linguagem clara e acessível\n- Formato Markdown\n- Não inclua o título da seção (já será adicionado)\n- Seja objetivo e educativo`;
    } else if (commercialSubType === 'guia-melhores') {
        requirements = `- ${wordInstruction}\n- ${PARAGRAPH_RULE}\n- Análise detalhada do item\n- Prós e contras quando fizer sentido\n- Comparação com alternativas se aplicável\n- Formato Markdown\n- Não inclua o título da seção\n- Foco em ajudar na decisão de compra`;
    } else {
        requirements = `- ${wordInstruction}\n- ${PARAGRAPH_RULE}\n- Análise detalhada do aspecto\n- Prós e contras quando aplicável\n- Formato Markdown\n- Não inclua o título da seção\n- Tom analítico e honesto`;
    }

    return `Título do artigo: ${title}

Estrutura completa:
${outlineText}

Visão geral:
${vision}

Introdução já escrita:
${intro.slice(0, 800)}${intro.length > 800 ? '...' : ''}

Conteúdo já escrito (seções anteriores):
${previousSections ? previousSections.slice(-2000) : '(nenhuma)'}

---

Agora escreva APENAS o conteúdo da seção "${outline.text}" (${outline.level.toUpperCase()}).

Requisitos:
${requirements}

${PARAGRAPH_RULE}

Conteúdo da seção (sem o título):`;
}

function buildConclusionPrompt(
    title: string,
    vision: string,
    fullContent: string,
    postType: PostType,
    commercialSubType?: CommercialSubType
): string {
    const contentPreview = fullContent.slice(-3000);

    let instructions = '';
    if (postType === 'informational') {
        instructions = 'Escreva uma conclusão que resuma os principais pontos, reforce o valor do conteúdo e sugira próximos passos. Use ## Conclusão como título.';
    } else if (commercialSubType === 'guia-melhores') {
        instructions = 'Escreva uma conclusão que destaque a melhor opção ou resuma as recomendações, com CTA natural. Use ## Conclusão como título.';
    } else {
        instructions = 'Escreva uma conclusão com veredicto final sobre o produto, prós e contras resumidos, e CTA. Use ## Conclusão como título.';
    }

    return `Título: ${title}

Visão geral:
${vision}

Conteúdo do artigo (últimas partes):
${contentPreview}

${instructions}

Formato Markdown. Entre 50 e 100 palavras. Apenas a seção de conclusão.

${PARAGRAPH_RULE}`;
}

// ── Placeholder quando não há IA ─────────────────────────────────────────────

function generatePlaceholderSection(outline: Outline, postType: PostType): string {
    const heading = `${getHeadingTag(outline.level)} ${outline.text}\n\n`;
    const img = outline.imageUrl ? `![${outline.text}](${outline.imageUrl})\n\n` : '';
    const body = postType === 'informational'
        ? `Conteúdo informacional sobre "${outline.text}". Configure a API Key em Configurações → Inteligência Artificial para gerar com IA.\n\n`
        : `Conteúdo comercial sobre "${outline.text}". Configure a API Key em Configurações → Inteligência Artificial para gerar com IA.\n\n`;
    return heading + img + body;
}

function generatePlaceholderIntro(title: string, postType: PostType): string {
    return postType === 'informational'
        ? `# Introdução\n\nNeste artigo, vamos explorar: ${title}. Configure a API Key em Configurações → IA para gerar conteúdo com inteligência artificial.\n\n`
        : `# Introdução\n\nBem-vindo ao nosso guia sobre: ${title}. Configure a API Key em Configurações → IA para gerar conteúdo com inteligência artificial.\n\n`;
}

function generatePlaceholderConclusion(title: string): string {
    return `\n## Conclusão\n\nEsperamos que este artigo sobre ${title} tenha sido útil. Configure a API Key em Configurações → IA para gerar conclusões personalizadas.\n\n`;
}

// ── Fluxo principal de geração ──────────────────────────────────────────────

async function generatePostContent(
    title: string,
    outlines: Outline[],
    postType: PostType,
    commercialSubType: CommercialSubType | undefined,
    callAIFn: (prompt: string) => Promise<string>,
    onProgress: (msg: string) => void
): Promise<string> {
    let content = '';
    let vision = '';
    let intro = '';
    let previousSections = '';

    // Etapa 1: Visão geral
    onProgress('📋 Criando visão geral do artigo...');
    try {
        vision = await callAIFn(buildVisionPrompt(title, outlines, postType, commercialSubType));
        if (!vision?.trim()) vision = `Artigo sobre ${title} seguindo a estrutura definida.`;
    } catch (e) {
        console.warn('\x1b[33m⚠ Visão geral falhou, usando fallback:\x1b[0m', e);
        vision = `Artigo sobre ${title} seguindo a estrutura definida.`;
    }

    await new Promise(r => setTimeout(r, DELAY_MS));

    // Etapa 2: Introdução
    onProgress('✍️ Gerando introdução...');
    try {
        intro = await callAIFn(buildIntroPrompt(title, outlines, vision, postType, commercialSubType));
        if (!intro?.trim()) intro = generatePlaceholderIntro(title, postType);
        else if (!intro.includes('#')) intro = `# Introdução\n\n${intro}`;
        content += intro.trim() + '\n\n';
    } catch (e) {
        console.warn('\x1b[33m⚠ Introdução falhou, usando placeholder:\x1b[0m', e);
        content += generatePlaceholderIntro(title, postType);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));

    // Etapa 3: Seções
    for (let i = 0; i < outlines.length; i++) {
        const outline = outlines[i];
        onProgress(`📝 Gerando seção ${i + 1}/${outlines.length}: ${outline.text}`);
        try {
            const sectionContent = await callAIFn(
                buildSectionPrompt(title, outline, outlines, vision, intro, previousSections, postType, commercialSubType)
            );
            const heading = `${getHeadingTag(outline.level)} ${outline.text}\n\n`;
            const img = outline.imageUrl ? `![${outline.text}](${outline.imageUrl})\n\n` : '';
            const section = heading + img + (sectionContent?.trim() || '') + '\n\n';
            content += section;
            previousSections += section;
        } catch (e) {
            console.warn(`\x1b[33m⚠ Seção "${outline.text}" falhou:\x1b[0m`, e);
            content += generatePlaceholderSection(outline, postType);
        }
        if (i < outlines.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
    }

    // Etapa 4: Conclusão
    onProgress('🏁 Gerando conclusão...');
    try {
        const conclusion = await callAIFn(
            buildConclusionPrompt(title, vision, content, postType, commercialSubType)
        );
        if (conclusion?.trim()) {
            content += '\n' + conclusion.trim() + '\n\n';
        } else {
            content += generatePlaceholderConclusion(title);
        }
    } catch (e) {
        console.warn('\x1b[33m⚠ Conclusão falhou, usando placeholder:\x1b[0m', e);
        content += generatePlaceholderConclusion(title);
    }

    return formatParagraphsForReadability(content.trim());
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const {
            postType = 'informational',
            commercialSubType,
            title,
            slug,
            author,
            category,
            outlines,
            products,
            commercialItems,
        } = body;

        if (!title || !slug) {
            return new Response(JSON.stringify({ success: false, error: 'Título e slug são obrigatórios' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!author || !category) {
            return new Response(JSON.stringify({ success: false, error: 'Autor e categoria são obrigatórios' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let effectiveOutlines: Outline[];

        if (postType === 'commercial' && Array.isArray(commercialItems) && commercialItems.length > 0) {
            // Lista unificada: ordem preservada (outline ou produto)
            effectiveOutlines = commercialItems
                .filter((item: { type: string }) => item?.type === 'outline' || item?.type === 'product')
                .map((item: { type: string; level?: string; text?: string; name?: string; imageUrl?: string; minWords?: number }) => {
                    if (item.type === 'outline' && item.text?.trim()) {
                        const n = item.minWords != null ? Number(item.minWords) : undefined;
                        return { level: (item.level || 'h2') as 'h1' | 'h2' | 'h3' | 'h4', text: item.text.trim(), imageUrl: undefined, minWords: n && n >= 50 ? n : undefined };
                    }
                    if (item.type === 'product' && item.name?.trim()) {
                        return { level: 'h2' as const, text: item.name.trim(), imageUrl: item.imageUrl?.trim() || undefined };
                    }
                    return null;
                })
                .filter((o: Outline | null): o is Outline => o !== null);
        } else if (postType === 'commercial' && (products?.length || outlines?.length)) {
            // Retrocompatibilidade: outlines + products separados
            const outlineItems: Outline[] = (outlines || [])
                .filter((o: Outline) => o?.text?.trim())
                .map((o: Outline) => {
                    const n = o.minWords != null ? Number(o.minWords) : undefined;
                    return { level: o.level, text: o.text.trim(), imageUrl: undefined, minWords: n && n >= 50 ? n : undefined };
                });
            const productItems: Outline[] = (products || [])
                .filter((p: Product) => p?.name?.trim())
                .map((p: Product) => ({ level: 'h2' as const, text: p.name.trim(), imageUrl: p.imageUrl?.trim() || undefined }));
            effectiveOutlines = [...outlineItems, ...productItems];
        } else {
            // Informacional: só outlines
            effectiveOutlines = (outlines || [])
                .filter((o: Outline) => o?.text?.trim())
                .map((o: Outline) => {
                    const n = o.minWords != null ? Number(o.minWords) : undefined;
                    return { level: o.level, text: o.text.trim(), imageUrl: undefined, minWords: n && n >= 50 ? n : undefined };
                });
        }

        if (!effectiveOutlines.length) {
            return new Response(JSON.stringify({
                success: false,
                error: postType === 'commercial'
                    ? 'Adicione pelo menos um produto ou uma outline'
                    : 'Adicione pelo menos uma outline',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (postType === 'commercial' && !['guia-melhores', 'spr'].includes(commercialSubType)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Posts comerciais exigem sub-tipo: guia-melhores ou spr',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const exists = await slugExists(slug);
        if (exists) {
            return new Response(JSON.stringify({ success: false, error: 'Um post com este slug já existe' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const aiSettings = await loadAISettings();
        const apiKey = resolveApiKey(aiSettings);

        const encoder = new TextEncoder();
        const send = (data: object) => `data: ${JSON.stringify(data)}\n\n`;

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(encoder.encode(send({ step: 'progress', message: 'Conectando à inteligência artificial...' })));

                    const onProgress = (msg: string) => {
                        controller.enqueue(encoder.encode(send({ step: 'progress', message: msg })));
                        console.log(msg);
                    };

                    let content: string;

                    if (apiKey) {
                        const callAIFn = (prompt: string) =>
                            callAI(prompt, aiSettings, apiKey, { maxTokens: MAX_TOKENS_SECTION });
                        content = await generatePostContent(
                            title,
                            effectiveOutlines,
                            postType,
                            postType === 'commercial' ? commercialSubType : undefined,
                            callAIFn,
                            onProgress
                        );
                    } else {
                        controller.enqueue(encoder.encode(send({ step: 'progress', message: 'Nenhuma API Key configurada. Gerando placeholders...' })));
                        content = await generatePostContent(
                            title,
                            effectiveOutlines,
                            postType,
                            postType === 'commercial' ? commercialSubType : undefined,
                            async () => { throw new Error('No API Key'); },
                            onProgress
                        );
                    }

                    let thumbnailUrl: string | undefined;
                    if (aiSettings.pexelsApiKey?.trim()) {
                        onProgress('🖼️ Traduzindo título para busca no Pexels...');
                        let searchQuery = title;
                        if (apiKey) {
                            try {
                                const callAIFn = (p: string) =>
                                    callAI(p, aiSettings, apiKey, { maxTokens: 64 });
                                searchQuery = await translateTitleToEnglish(title, callAIFn);
                            } catch (e) {
                                console.warn('\x1b[33m⚠ Tradução do título falhou, usando original:\x1b[0m', e);
                            }
                        }
                        onProgress('🖼️ Inserindo imagens do Pexels...');
                        try {
                            const result = await insertImagesByWordCount(
                                content,
                                title,
                                aiSettings.pexelsApiKey.trim(),
                                searchQuery
                            );
                            content = result.content;
                            thumbnailUrl = result.thumbnailUrl;
                        } catch (e) {
                            console.warn('\x1b[33m⚠ Pexels: falha ao inserir imagens:\x1b[0m', e);
                        }
                    }

                    controller.enqueue(encoder.encode(send({ step: 'progress', message: 'Salvando o post...' })));

                    const metaDescription = title.length > 160 ? title.substring(0, 157) + '...' : title;
                    const postData: PostData = {
                        title,
                        slug,
                        author,
                        category,
                        publishedDate: new Date().toISOString().split('T')[0],
                        metaDescription,
                        ...(thumbnailUrl && { thumbnail: thumbnailUrl, metaImage: thumbnailUrl }),
                    };

                    const success = await writePost(slug, postData, content);

                    if (!success) {
                        controller.enqueue(encoder.encode(send({ step: 'error', error: 'Erro ao salvar post' })));
                    } else {
                        controller.enqueue(encoder.encode(send({ step: 'done', success: true, slug, title })));
                    }
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
                    controller.enqueue(encoder.encode(send({ step: 'error', error: msg })));
                    console.error('\x1b[31m✗ Erro ao gerar post com IA:\x1b[0m', err);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao gerar post com IA:\x1b[0m', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Erro desconhecido ao gerar post',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
