/**
 * location-utils.ts
 *
 * Utilitários para leitura e escrita de localidades (cidades/bairros) em formato YAML.
 * Segue o mesmo padrão do service-utils — suporta filesystem local e GitHub API.
 * Usado pelo Gerador de Páginas Locais do Modo Local (rank and rent).
 *
 * Funções exportadas:
 *   - listLocations()             → lista todas as localidades
 *   - readLocation(slug)          → lê uma localidade pelo slug
 *   - writeLocation(slug, data)   → persiste no disco ou GitHub
 *   - deleteLocation(slug)        → remove do disco ou GitHub
 *   - locationSlugExists(slug)    → valida unicidade do slug
 *   - applyTemplateVars(text, vars) → substitui {variáveis} no template
 */

import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs/promises';
import { isGitHubConfigured, githubWriteFile, githubDeleteFile, githubListDirectory, githubReadFile } from './github-api';

export interface LocationData {
    name: string;
    slug: string;
    state: string;
    city?: string;
    citySlug?: string;
    type?: 'cidade' | 'bairro' | 'regiao' | 'zona';
    active: boolean;
}

export interface LocationFile {
    data: LocationData;
    filename: string;
}

export interface LocationTemplateData {
    heroTitle?: string;
    heroSubtitle?: string;
    pageContent?: string;
    benefits?: string[];
    metaTitle?: string;
    metaDescription?: string;
}

const LOCATIONS_DIR    = path.resolve('./src/content/locations');
const LOCATIONS_GH    = 'src/content/locations';
const TEMPLATE_PATH   = path.resolve('./src/content/singletons/local/location-template.yaml');
const TEMPLATE_GH     = 'src/content/singletons/local/location-template.yaml';

// ── CRUD de Localidades ──────────────────────────────────────────────────────

async function listLocationsFromGitHub(): Promise<LocationFile[]> {
    try {
        const files = await githubListDirectory(LOCATIONS_GH);
        const yamlFiles = files.filter((f: any) => f.name.endsWith('.yaml'));
        const results = await Promise.all(
            yamlFiles.map(async (file: any) => {
                const result = await githubReadFile(file.path);
                if (!result) return null;
                const data = yaml.load(result.content) as LocationData;
                return { data, filename: file.name };
            }),
        );
        return (results.filter(Boolean) as LocationFile[]).sort((a, b) =>
            a.data.name.localeCompare(b.data.name),
        );
    } catch (error) {
        console.error('\x1b[31m✗ Erro ao listar localidades via GitHub API:\x1b[0m', error);
        return [];
    }
}

export async function listLocations(): Promise<LocationFile[]> {
    try {
        await fs.mkdir(LOCATIONS_DIR, { recursive: true });
        const files = await fs.readdir(LOCATIONS_DIR);
        const yamlFiles = files.filter(f => f.endsWith('.yaml'));
        const loaded: LocationFile[] = [];
        for (const filename of yamlFiles) {
            try {
                const content = await fs.readFile(path.join(LOCATIONS_DIR, filename), 'utf-8');
                const data = yaml.load(content) as LocationData;
                if (data?.slug && data?.name) loaded.push({ data, filename });
            } catch (fileErr: unknown) {
                console.error(`\x1b[31m✗ [X] Localidade ignorada (erro): ${filename}\x1b[0m`, fileErr);
            }
        }
        return loaded.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));
    } catch (error) {
        if (isGitHubConfigured()) return listLocationsFromGitHub();
        console.error('\x1b[31m✗ Erro ao listar localidades:\x1b[0m', error);
        return [];
    }
}

export async function readLocation(slug: string): Promise<LocationFile | null> {
    try {
        const filename = `${slug}.yaml`;
        const content = await fs.readFile(path.join(LOCATIONS_DIR, filename), 'utf-8');
        const data = yaml.load(content) as LocationData;
        return { data, filename };
    } catch {
        return null;
    }
}

export async function writeLocation(slug: string, data: LocationData): Promise<boolean> {
    try {
        const cleanedData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
        );
        const yamlContent = yaml.dump(cleanedData, {
            lineWidth: -1, noRefs: true, quotingType: '"',
        });
        const filename = `${slug}.yaml`;

        if (isGitHubConfigured()) {
            return githubWriteFile(
                `${LOCATIONS_GH}/${filename}`,
                yamlContent,
                `content: save location "${slug}"`,
            );
        }

        await fs.mkdir(LOCATIONS_DIR, { recursive: true });
        await fs.writeFile(path.join(LOCATIONS_DIR, filename), yamlContent, 'utf-8');
        return true;
    } catch (error) {
        console.error(`\x1b[31m✗ Erro ao escrever localidade ${slug}:\x1b[0m`, error);
        return false;
    }
}

export async function deleteLocation(slug: string): Promise<boolean> {
    try {
        const filename = `${slug}.yaml`;

        if (isGitHubConfigured()) {
            return githubDeleteFile(
                `${LOCATIONS_GH}/${filename}`,
                `content: delete location "${slug}"`,
            );
        }

        await fs.unlink(path.join(LOCATIONS_DIR, filename));
        return true;
    } catch (error) {
        console.error(`\x1b[31m✗ Erro ao deletar localidade ${slug}:\x1b[0m`, error);
        return false;
    }
}

export async function locationSlugExists(slug: string, excludeSlug?: string): Promise<boolean> {
    try {
        const locations = await listLocations();
        return locations.some(l => l.data.slug === slug && l.data.slug !== excludeSlug);
    } catch {
        return false;
    }
}

/**
 * Retorna o NOME da cidade que tem mais bairros cadastrados (ex: "São Paulo", "Fortaleza").
 * Usado no hero da home local para "em {cidade}" quando heroTitleHighlight está vazio.
 */
export async function getPrincipalCityName(): Promise<string | null> {
    const all = await listLocations();
    const bairros = all.filter(l => l.data.active && l.data.type !== 'cidade');

    if (bairros.length === 0) {
        const firstCidade = all.find(l => l.data.active && l.data.type === 'cidade');
        return firstCidade?.data.name ?? firstCidade?.data.city ?? null;
    }

    const byCitySlug = new Map<string, { cityName: string; locs: LocationFile[] }>();
    for (const loc of bairros) {
        const key = loc.data.citySlug || cityNameToSlug(loc.data.city || loc.data.name) || 'default';
        const cityName = loc.data.city || loc.data.name;
        if (!byCitySlug.has(key)) byCitySlug.set(key, { cityName, locs: [] });
        byCitySlug.get(key)!.locs.push(loc);
    }

    let principalCityName: string | null = null;
    let maxCount = 0;
    for (const [, { cityName, locs }] of byCitySlug) {
        if (locs.length > maxCount) {
            maxCount = locs.length;
            principalCityName = cityName;
        }
    }
    return principalCityName;
}

/**
 * Retorna o slug da localidade "principal" para links padrão (ex: da lista de serviços).
 * Sempre retorna um BAIRRO (não a cidade), da cidade que tem mais bairros cadastrados.
 * Usado para que /servicos e links de serviços → apontem para /{bairro}/{servico}.
 */
export async function getPrincipalLocationSlug(): Promise<string | null> {
    const all = await listLocations();
    const bairros = all.filter(l => l.data.active && l.data.type !== 'cidade');

    if (bairros.length === 0) {
        const first = all.find(l => l.data.active);
        return first?.data.slug ?? null;
    }

    const byCitySlug = new Map<string, LocationFile[]>();
    for (const loc of bairros) {
        const key = loc.data.citySlug || cityNameToSlug(loc.data.city || loc.data.name) || 'default';
        if (!byCitySlug.has(key)) byCitySlug.set(key, []);
        byCitySlug.get(key)!.push(loc);
    }

    let principalCitySlug: string | null = null;
    let maxCount = 0;
    for (const [citySlug, locs] of byCitySlug) {
        if (locs.length > maxCount) {
            maxCount = locs.length;
            principalCitySlug = citySlug;
        }
    }

    if (!principalCitySlug) return null;

    const bairrosDaCidade = byCitySlug.get(principalCitySlug) ?? [];
    const primeiroBairro = bairrosDaCidade.sort((a, b) => a.data.name.localeCompare(b.data.name))[0];
    return primeiroBairro?.data.slug ?? null;
}

// ── Template de Páginas Locais ────────────────────────────────────────────────

export async function readLocationTemplate(): Promise<LocationTemplateData> {
    try {
        const content = await fs.readFile(TEMPLATE_PATH, 'utf-8');
        return yaml.load(content) as LocationTemplateData;
    } catch {
        return {
            heroTitle:       '{servico} em {cidade} - {estado}',
            heroSubtitle:    'Atendimento profissional de {servico} em {cidade}. Rápido e confiável.',
            pageContent:     'Procurando {servico} em {cidade}? A {empresa} oferece o melhor serviço da região.',
            benefits:        ['Atendimento rápido em {cidade}', 'Orçamento gratuito', 'Garantia nos serviços'],
            metaTitle:       '{servico} em {cidade} | {empresa}',
            metaDescription: 'Precisa de {servico} em {cidade}? Ligue agora! Orçamento grátis.',
        };
    }
}

export async function writeLocationTemplate(data: LocationTemplateData): Promise<boolean> {
    try {
        const cleanedData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
        );
        const yamlContent = yaml.dump(cleanedData, {
            lineWidth: -1, noRefs: true, quotingType: '"',
        });

        if (isGitHubConfigured()) {
            return githubWriteFile(TEMPLATE_GH, yamlContent, 'content: update location page template');
        }

        const dir = path.dirname(TEMPLATE_PATH);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(TEMPLATE_PATH, yamlContent, 'utf-8');
        return true;
    } catch (error) {
        console.error('\x1b[31m✗ Erro ao salvar template de localidade:\x1b[0m', error);
        return false;
    }
}

// ── Substituição de Variáveis ─────────────────────────────────────────────────

/**
 * Substitui variáveis no formato {variavel} em um texto.
 * Exemplo: applyTemplateVars("{servico} em {cidade}", { servico: "Encanador", cidade: "São Paulo" })
 */
export function applyTemplateVars(text: string, vars: Record<string, string>): string {
    if (!text) return '';
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

/**
 * Gera o slug a partir de um nome de cidade.
 * Ex: "São Paulo" → "sao-paulo"
 */
export function cityNameToSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}
