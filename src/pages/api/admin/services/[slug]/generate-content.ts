/**
 * api/admin/services/[slug]/generate-content
 *
 * POST — Gera conteúdo completo em Markdown para uma keyword (serviço)
 * com base na outline definida + instruções do usuário.
 *
 * Suporta dois provedores de IA:
 *   - Google Gemini (gemini-1.5-flash) — gratuito, recomendado
 *   - OpenAI        (gpt-4o-mini)      — pago, alta qualidade
 *
 * Ordem de prioridade para a API Key:
 *   1. settings.yaml (aiProvider + aiApiKey) — configurado pelo usuário no admin
 *   2. Variáveis de ambiente (OPENAI_API_KEY / GEMINI_API_KEY) — fallback
 *   3. Placeholder estruturado — quando nenhuma chave está configurada
 *
 * O conteúdo é gerado com variáveis {cidade}, {servico}, {estado}, {empresa}
 * para que uma única geração sirva para TODOS os bairros/localidades.
 *
 * Body:
 *   outline:    OutlineItem[]  — seções da página
 *   tone:       string         — tom de voz (profissional, amigavel, tecnico, casual)
 *   extras:     string         — instruções adicionais para a IA
 *   includeFaq: boolean        — incluir seção FAQ ao final
 */

import type { APIRoute } from 'astro';
import { readService, writeService } from '../../../../../utils/service-utils';
import { loadAISettings, resolveApiKey, callAI } from '../../../../../utils/ai-provider';

type Tone = 'profissional' | 'amigavel' | 'tecnico' | 'casual';
interface OutlineItem { level: 'h1' | 'h2' | 'h3' | 'h4'; text: string; }

const TONE_DESCRIPTIONS: Record<Tone, string> = {
    profissional: 'tom profissional, confiante e direto. Use linguagem formal mas acessível.',
    amigavel:     'tom amigável, próximo e acolhedor. Use linguagem simples e casual, como se estivesse conversando.',
    tecnico:      'tom técnico e especialista. Inclua detalhes técnicos e terminologia do setor.',
    casual:       'tom casual e descontraído. Use linguagem leve, com expressões do dia a dia.',
};

const SEO_SYSTEM_PROMPT = 'Você é um redator especializado em SEO local para o mercado brasileiro. Escreve conteúdo de alta qualidade que ranqueia no Google e converte visitantes em clientes.';

// ── Prompt unificado ──────────────────────────────────────────────────────────

function buildPrompt(serviceTitle: string, outline: OutlineItem[], tone: Tone, extras: string, includeFaq: boolean): string {
    const toneDesc    = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.profissional;
    const outlineText = outline.map((o, i) => `${i + 1}. ${o.level.toUpperCase()}: ${o.text}`).join('\n');
    const faqNote     = includeFaq
        ? '\n- Inclua ao final uma seção "## FAQ sobre {servico} em {cidade}" com pelo menos 5 perguntas (H3) e respostas. Essa seção será exibida em área DEDICADA na página, separada do corpo do texto.'
        : '';

    return `Você é um especialista em SEO local para o mercado brasileiro.

KEYWORD ALVO: "${serviceTitle}"

Escreva o conteúdo COMPLETO desta página de serviço local com ${toneDesc}

OUTLINE OBRIGATÓRIA (siga esta estrutura exatamente):
${outlineText}${faqNote}

REGRAS FUNDAMENTAIS:
1. Use SEMPRE as seguintes variáveis no lugar dos valores específicos:
   - {servico}   = o nome do serviço
   - {cidade}    = nome da cidade/bairro
   - {estado}    = sigla do estado (ex: SP, RJ)
   - {empresa}   = nome da empresa

   Exemplo: "Nossos serviços de {servico} em {cidade} estão disponíveis 24 horas..."

2. NÃO escreva o nome de nenhuma cidade específica — use apenas {cidade}
3. NÃO escreva o nome de nenhuma empresa específica — use apenas {empresa}
4. Formato: Markdown com # ## ### para headings
5. Mínimo de 200 palavras por seção H2
6. Inclua bullet points onde adequado
7. O conteúdo deve ser persuasivo e voltado para conversão (CTA natural)
8. Foco em SEO local: mencione {cidade} e {estado} naturalmente ao longo do texto
9. O FAQ (se solicitado) vai AO FINAL — área dedicada na página; não misture no meio do conteúdo
${extras ? `\nINSTRUÇÕES EXTRAS DO USUÁRIO:\n${extras}` : ''}

Escreva agora o conteúdo COMPLETO em Markdown:`;
}

// ── Placeholder quando não há IA configurada ─────────────────────────────────

function generatePlaceholder(serviceTitle: string, outline: OutlineItem[], includeFaq: boolean): string {
    const lines: string[] = [];

    for (const item of outline) {
        const hTag = '#'.repeat(['h1','h2','h3','h4'].indexOf(item.level) + 1);
        lines.push(`${hTag} ${item.text}\n`);
        lines.push(`[Conteúdo sobre "${item.text}" será gerado aqui. Configure sua API Key em Configurações → Inteligência Artificial.]\n`);
        lines.push('');
    }

    if (includeFaq) {
        lines.push(`## FAQ sobre {servico} em {cidade}\n`);
        lines.push(`### O que é {servico}?`);
        lines.push(`{servico} é um serviço especializado disponível em {cidade} e região.\n`);
        lines.push(`### Quanto custa {servico} em {cidade}?`);
        lines.push(`O preço de {servico} em {cidade} varia conforme o serviço solicitado. Entre em contato com a {empresa} para um orçamento gratuito.\n`);
        lines.push(`### Como contratar {servico} em {cidade}?`);
        lines.push(`Para contratar {servico} em {cidade}, entre em contato com a {empresa} pelo WhatsApp ou telefone. Atendemos em {cidade} e região com agilidade e garantia.\n`);
    }

    return lines.join('\n');
}

// ── Handler principal ─────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ params, request, locals }) => {
    try {
        if (!locals.user) {
            return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const slug        = params.slug as string;
        const serviceFile = await readService(slug);
        if (!serviceFile) {
            return new Response(JSON.stringify({ success: false, error: 'Serviço não encontrado' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body        = await request.json();
        const outline: OutlineItem[] = body.outline || serviceFile.data.outline || [];
        const tone: Tone             = body.tone       || 'profissional';
        const extras: string         = body.extras     || '';
        const includeFaq: boolean    = body.includeFaq !== false;
        const saveToService: boolean = body.save       !== false;

        if (outline.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Defina uma outline antes de gerar conteúdo' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Carrega configurações de IA (settings.yaml → env vars → placeholder)
        const aiSettings = await loadAISettings();
        const apiKey = resolveApiKey(aiSettings);

        let content = '';
        let usedAI  = false;
        let providerUsed = aiSettings.provider === 'gemini' ? 'Gemini' : 'OpenAI';

        if (apiKey) {
            try {
                const prompt = buildPrompt(serviceFile.data.title, outline, tone, extras, includeFaq);
                content = await callAI(prompt, aiSettings, apiKey, {
                    systemPrompt: SEO_SYSTEM_PROMPT,
                    maxTokens: 4096,
                });
                usedAI = true;
            } catch (aiErr: any) {
                console.warn('\x1b[33m⚠ IA falhou, usando placeholder:\x1b[0m', aiErr.message);
                content = generatePlaceholder(serviceFile.data.title, outline, includeFaq);
            }
        } else {
            content = generatePlaceholder(serviceFile.data.title, outline, includeFaq);
        }

        if (saveToService && content) {
            await writeService(slug, {
                ...serviceFile.data,
                generatedContent:   content,
                contentGeneratedAt: new Date().toISOString().split('T')[0],
                outline,
            });
        }

        return new Response(JSON.stringify({
            success: true,
            content,
            usedAI,
            provider: usedAI ? providerUsed : null,
            message: usedAI
                ? `Conteúdo gerado com ${providerUsed} e salvo com sucesso!`
                : 'Configure sua API Key em Configurações → Inteligência Artificial para gerar com IA.',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao gerar conteúdo:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
