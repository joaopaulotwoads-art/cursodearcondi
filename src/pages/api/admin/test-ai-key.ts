/**
 * api/admin/test-ai-key.ts
 *
 * POST — Testa se uma API Key de IA está válida e funcional.
 * Faz uma chamada mínima ao provedor informado para verificar autenticação.
 *
 * Body:
 *   provider: 'openai' | 'gemini'
 *   apiKey:   string
 *
 * Retorna:
 *   { success: true,  message: 'Chave válida! Provedor respondeu com sucesso.' }
 *   { success: false, message: '...' }
 */

import type { APIRoute } from 'astro';

async function testOpenAI(apiKey: string): Promise<{ ok: boolean; message: string }> {
    try {
        // Usa chat/completions (mesmo endpoint da geração) — /v1/models pode falhar com chaves sk-proj-
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        };
        const orgId = (process.env.OPENAI_ORGANIZATION_ID || '').trim();
        const projId = (process.env.OPENAI_PROJECT_ID || '').trim();
        if (orgId) headers['OpenAI-Organization'] = orgId;
        if (projId) headers['OpenAI-Project'] = projId;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Hi' }],
            }),
        });
        if (res.status === 200) return { ok: true,  message: 'Chave OpenAI válida! Conexão estabelecida com sucesso.' };
        if (res.status === 401) return { ok: false, message: 'Chave inválida ou expirada. Verifique na plataforma OpenAI. Chaves sk-proj- podem exigir OPENAI_ORGANIZATION_ID e OPENAI_PROJECT_ID no .env.' };
        if (res.status === 429) return { ok: true,  message: 'Chave válida, mas limite de requisições atingido. Aguarde alguns minutos.' };
        const errBody = await res.text();
        return { ok: false, message: `OpenAI ${res.status}: ${errBody.slice(0, 150)}` };
    } catch (err: any) {
        return { ok: false, message: `Erro de conexão com OpenAI: ${err.message}` };
    }
}

async function testGemini(apiKey: string): Promise<{ ok: boolean; message: string }> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url);
        if (res.status === 200) return { ok: true,  message: 'Chave Gemini válida! Conexão estabelecida com sucesso.' };
        if (res.status === 400) return { ok: false, message: 'Chave inválida. Verifique sua API Key no Google AI Studio.' };
        if (res.status === 403) return { ok: false, message: 'Acesso negado. A API Gemini pode não estar habilitada para esta chave.' };
        if (res.status === 429) return { ok: true,  message: 'Chave válida, mas limite de requisições atingido. Aguarde alguns minutos.' };
        return { ok: false, message: `Gemini retornou status ${res.status}. Verifique sua chave.` };
    } catch (err: any) {
        return { ok: false, message: `Erro de conexão com Gemini: ${err.message}` };
    }
}

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        if (!locals.user) {
            return new Response(JSON.stringify({ success: false, message: 'Não autorizado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body     = await request.json();
        const provider = body.provider as 'openai' | 'gemini';
        const apiKey   = (body.apiKey || '').trim();

        if (!apiKey) {
            return new Response(JSON.stringify({ success: false, message: 'API Key não fornecida.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!['openai', 'gemini'].includes(provider)) {
            return new Response(JSON.stringify({ success: false, message: 'Provedor inválido.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = provider === 'openai'
            ? await testOpenAI(apiKey)
            : await testGemini(apiKey);

        return new Response(JSON.stringify({ success: result.ok, message: result.message }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('\x1b[31m✗ Erro ao testar API Key:\x1b[0m', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
