/**
 * template-utils.ts
 *
 * Utilitários para leitura de templates de nicho do Modo Local.
 * Templates definem copy da home, template de páginas locais, nicho e serviços iniciais.
 * Arquivos em src/data/templates/*.yaml
 */

import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs/promises';

const TEMPLATES_DIR = path.resolve('./src/data/templates');

export interface TemplateService {
    title: string;
    slug: string;
    shortDescription?: string;
    icon?: string;
    niche: string;
}

export interface TemplateNiche {
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    color?: string;
    active: boolean;
}

export interface TemplateHomeCopy {
    heroBadge?: string;
    heroTitle?: string;
    heroTitleHighlight?: string;
    heroSubtitle?: string;
    heroCtaText?: string;
    heroCtaSecondaryText?: string;
    heroWhatsappMessage?: string;
    servicesTitle?: string;
    servicesSubtitle?: string;
    aboutTitle?: string;
    aboutSubtitle?: string;
    aboutText?: string;
    aboutStats?: { number: string; label: string }[];
}

export interface TemplateLocationCopy {
    heroTitle?: string;
    heroSubtitle?: string;
    pageContent?: string;
    benefits?: string[];
    metaTitle?: string;
    metaDescription?: string;
}

export interface TemplateData {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    niche: TemplateNiche;
    homeCopy: TemplateHomeCopy;
    locationTemplateCopy: TemplateLocationCopy;
    services: TemplateService[];
}

/**
 * Lista todos os templates disponíveis.
 * Se um arquivo falhar ao parsear, ele é ignorado (resiliente a um template corrompido).
 */
export async function listTemplates(): Promise<TemplateData[]> {
    try {
        await fs.mkdir(TEMPLATES_DIR, { recursive: true });
        const files = await fs.readdir(TEMPLATES_DIR);
        const yamlFiles = files.filter((f) => f.endsWith('.yaml'));
        const templates: TemplateData[] = [];

        for (const filename of yamlFiles) {
            try {
                const content = await fs.readFile(path.join(TEMPLATES_DIR, filename), 'utf-8');
                const data = yaml.load(content) as TemplateData;
                if (data?.id && Array.isArray(data?.services)) templates.push(data);
            } catch (fileErr: unknown) {
                console.error(`\x1b[31m✗ [X] Template ignorado (erro): ${filename}\x1b[0m`, fileErr);
            }
        }

        return templates.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error('\x1b[31m✗ Erro ao listar templates:\x1b[0m', error);
        return [];
    }
}

/**
 * Lê um template pelo id (slug).
 */
export async function readTemplate(id: string): Promise<TemplateData | null> {
    try {
        const templates = await listTemplates();
        return templates.find((t) => t.id === id) ?? null;
    } catch {
        return null;
    }
}
