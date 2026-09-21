/**
 * ai-provider.ts
 *
 * Utilitário compartilhado para integração com provedores de IA (OpenAI e Gemini).
 * Usado pelo gerador de posts e pelo gerador de conteúdo de serviços.
 *
 * Funções:
 *   - loadAISettings(): carrega aiProvider e aiApiKey do settings.yaml (ou GitHub)
 *   - callOpenAI(): chama a API OpenAI (gpt-4o-mini)
 *   - callGemini(): chama a API Google Gemini (gemini-1.5-flash)
 *
 * Ordem de prioridade para API Key:
 *   1. settings.yaml (aiProvider + aiApiKey)
 *   2. Variáveis de ambiente (OPENAI_API_KEY / GEMINI_API_KEY)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { isGitHubConfigured, githubReadFile } from './github-api';

export type AIProvider = 'openai' | 'gemini';

export interface AISettings {
    provider: AIProvider;
    apiKey: string;
    /** Chave Pexels para inserção de imagens em posts gerados por IA */
    pexelsApiKey?: string;
}

const SETTINGS_PATH = path.resolve('./src/content/singletons/settings.yaml');
const SETTINGS_GH_PATH = 'src/content/singletons/settings.yaml';

/**
 * Carrega configurações de IA do settings.yaml (ou GitHub em produção).
 */
export async function loadAISettings(): Promise<AISettings> {
    try {
        let raw = '';
        if (isGitHubConfigured()) {
            const file = await githubReadFile(SETTINGS_GH_PATH);
            raw = file?.content || '';
        } else {
            raw = await fs.readFile(SETTINGS_PATH, 'utf-8').catch(() => '');
        }

        const data = (yaml.load(raw) as Record<string, unknown>) || {};
        const provider = (data.aiProvider as AIProvider) || 'gemini';
        const apiKey = (data.aiApiKey as string) || '';
        const pexelsApiKey = (data.pexelsApiKey as string) || '';
        return { provider, apiKey, pexelsApiKey };
    } catch {
        return { provider: 'gemini', apiKey: '' };
    }
}

/**
 * Resolve a API Key efetiva: settings.yaml primeiro, depois env vars.
 */
export function resolveApiKey(settings: AISettings): string {
    if (settings.apiKey?.trim()) return settings.apiKey.trim();
    if (settings.provider === 'openai') return (process.env.OPENAI_API_KEY || '').trim();
    return (process.env.GEMINI_API_KEY || '').trim();
}

/**
 * Chama a API OpenAI (gpt-4o-mini).
 */
export async function callOpenAI(
    prompt: string,
    apiKey: string,
    options?: { systemPrompt?: string; maxTokens?: number }
): Promise<string> {
    const systemPrompt = options?.systemPrompt ?? 'Você é um redator profissional especializado em criar conteúdo de alta qualidade para blogs.';
    const maxTokens = options?.maxTokens ?? 4096;

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
            temperature: 0.7,
            max_tokens: maxTokens,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() || '';
}

/**
 * Chama a API Google Gemini (gemini-1.5-flash).
 */
export async function callGemini(
    prompt: string,
    apiKey: string,
    options?: { systemPrompt?: string; maxTokens?: number }
): Promise<string> {
    const systemPrompt = options?.systemPrompt ?? 'Você é um redator profissional especializado em criar conteúdo de alta qualidade para blogs.';
    const maxTokens = options?.maxTokens ?? 4096;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `${systemPrompt}\n\n${prompt}`,
                }],
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: maxTokens,
            },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

/**
 * Chama o provedor de IA configurado (OpenAI ou Gemini).
 */
export async function callAI(
    prompt: string,
    settings: AISettings,
    apiKey: string,
    options?: { systemPrompt?: string; maxTokens?: number }
): Promise<string> {
    if (settings.provider === 'gemini') {
        return callGemini(prompt, apiKey, options);
    }
    return callOpenAI(prompt, apiKey, options);
}
