/**
 * niche-utils.ts
 *
 * Utilitários para leitura e escrita de Nichos em formato YAML.
 * Um Nicho é o agrupador pai dos Serviços (keywords SEO).
 * Ex: Nicho "Cama Hospitalar" → Serviços "aluguel de cama hospitalar pequena", etc.
 *
 * Suporta filesystem local e GitHub API (mesmo padrão do service-utils).
 */

import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs/promises';
import { isGitHubConfigured, githubWriteFile, githubDeleteFile, githubListDirectory, githubReadFile } from './github-api';

export interface NichoData {
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    color?: string;
    active: boolean;
}

export interface NichoFile {
    data: NichoData;
    filename: string;
}

const NICHOS_DIR = path.resolve('./src/content/nichos');
const NICHOS_GH  = 'src/content/nichos';

async function listNichosFromGitHub(): Promise<NichoFile[]> {
    try {
        const files = await githubListDirectory(NICHOS_GH);
        const yamlFiles = files.filter((f: any) => f.name.endsWith('.yaml'));
        const results = await Promise.all(
            yamlFiles.map(async (file: any) => {
                const result = await githubReadFile(file.path);
                if (!result) return null;
                const data = yaml.load(result.content) as NichoData;
                return { data, filename: file.name };
            }),
        );
        return (results.filter(Boolean) as NichoFile[]).sort((a, b) =>
            a.data.name.localeCompare(b.data.name),
        );
    } catch (error) {
        console.error('\x1b[31m✗ Erro ao listar nichos via GitHub API:\x1b[0m', error);
        return [];
    }
}

export async function listNichos(): Promise<NichoFile[]> {
    try {
        await fs.mkdir(NICHOS_DIR, { recursive: true });
        const files = await fs.readdir(NICHOS_DIR);
        const yamlFiles = files.filter(f => f.endsWith('.yaml'));
        const loaded: NichoFile[] = [];
        for (const filename of yamlFiles) {
            try {
                const content = await fs.readFile(path.join(NICHOS_DIR, filename), 'utf-8');
                const data = yaml.load(content) as NichoData;
                if (data?.slug && data?.name) loaded.push({ data, filename });
            } catch (fileErr: unknown) {
                console.error(`\x1b[31m✗ [X] Nicho ignorado (erro): ${filename}\x1b[0m`, fileErr);
            }
        }
        return loaded.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));
    } catch (error) {
        if (isGitHubConfigured()) return listNichosFromGitHub();
        console.error('\x1b[31m✗ Erro ao listar nichos:\x1b[0m', error);
        return [];
    }
}

export async function readNicho(slug: string): Promise<NichoFile | null> {
    try {
        const filename = `${slug}.yaml`;
        const content = await fs.readFile(path.join(NICHOS_DIR, filename), 'utf-8');
        const data = yaml.load(content) as NichoData;
        return { data, filename };
    } catch {
        return null;
    }
}

export async function writeNicho(slug: string, data: NichoData): Promise<boolean> {
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
                `${NICHOS_GH}/${filename}`,
                yamlContent,
                `content: save niche "${slug}"`,
            );
        }

        await fs.mkdir(NICHOS_DIR, { recursive: true });
        await fs.writeFile(path.join(NICHOS_DIR, filename), yamlContent, 'utf-8');
        return true;
    } catch (error) {
        console.error(`\x1b[31m✗ Erro ao escrever nicho ${slug}:\x1b[0m`, error);
        return false;
    }
}

export async function deleteNicho(slug: string): Promise<boolean> {
    try {
        const filename = `${slug}.yaml`;

        if (isGitHubConfigured()) {
            return githubDeleteFile(
                `${NICHOS_GH}/${filename}`,
                `content: delete niche "${slug}"`,
            );
        }

        await fs.unlink(path.join(NICHOS_DIR, filename));
        return true;
    } catch (error) {
        console.error(`\x1b[31m✗ Erro ao deletar nicho ${slug}:\x1b[0m`, error);
        return false;
    }
}

export async function nichoSlugExists(slug: string): Promise<boolean> {
    try {
        const nichos = await listNichos();
        return nichos.some(n => n.data.slug === slug);
    } catch {
        return false;
    }
}

/** Slug automático a partir do nome */
export function nichoNameToSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}
