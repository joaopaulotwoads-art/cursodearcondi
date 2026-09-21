/**
 * leads-utils.ts
 *
 * Utilitário para leitura e gravação de leads (formulários de contato do site).
 * Armazena em data/leads.json (local) ou via GitHub API em produção.
 *
 * Estrutura de um lead:
 *   - id: string (UUID)
 *   - name, email, message: string
 *   - subject?: string (formulário classic)
 *   - phone?: string (formulário local/sidebar)
 *   - source: string (contato | local-contato | servico-sidebar)
 *   - extra?: Record (campos adicionais: serviceSlug, serviceTitle, etc.)
 *   - createdAt: string (ISO)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { isGitHubConfigured, githubReadFile, githubWriteFile } from './github-api';

const LEADS_PATH    = path.resolve('./data/leads.json');
const LEADS_GH_PATH = 'data/leads.json';

export interface Lead {
    id: string;
    name: string;
    email?: string;
    message: string;
    subject?: string;
    phone?: string;
    source: string;
    extra?: Record<string, unknown>;
    createdAt: string;
}

function generateId(): string {
    return crypto.randomUUID?.() || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function readLeadsFile(): Promise<Lead[]> {
    try {
        let content: string;
        if (isGitHubConfigured()) {
            const file = await githubReadFile(LEADS_GH_PATH);
            content = file?.content ?? '{"leads":[]}';
        } else {
            content = await fs.readFile(LEADS_PATH, 'utf-8');
        }
        const parsed = JSON.parse(content) as unknown;
        if (Array.isArray(parsed)) return parsed as Lead[];
        if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { leads?: unknown }).leads)) {
            return (parsed as { leads: Lead[] }).leads;
        }
        return [];
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao ler leads:\x1b[0m', e);
        return [];
    }
}

async function writeLeadsFile(leads: Lead[]): Promise<boolean> {
    const content = JSON.stringify({ leads }, null, 2);

    if (isGitHubConfigured()) {
        return githubWriteFile(LEADS_GH_PATH, content, 'content: novo lead');
    }

    try {
        await fs.mkdir(path.dirname(LEADS_PATH), { recursive: true });
        await fs.writeFile(LEADS_PATH, content, 'utf-8');
        return true;
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao salvar leads:\x1b[0m', e);
        return false;
    }
}

/**
 * Adiciona um novo lead e retorna o lead criado.
 */
export async function createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead | null> {
    const lead: Lead = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };

    const leads = await readLeadsFile();
    leads.unshift(lead);

    const ok = await writeLeadsFile(leads);
    return ok ? lead : null;
}

/**
 * Lista todos os leads, mais recentes primeiro.
 */
export async function listLeads(): Promise<Lead[]> {
    return readLeadsFile();
}

/**
 * Remove um lead pelo id. Retorna true se removido com sucesso.
 */
export async function deleteLead(id: string): Promise<boolean> {
    const leads = await readLeadsFile();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx < 0) return false;
    leads.splice(idx, 1);
    return writeLeadsFile(leads);
}
