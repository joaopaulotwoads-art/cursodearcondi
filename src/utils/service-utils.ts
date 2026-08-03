/**
 * service-utils.ts
 *
 * Utilitários para leitura e escrita de serviços locais em formato YAML.
 * Segue o mesmo padrão do author-utils — suporta filesystem local e GitHub API.
 * Usado pelo Modo Local (rank and rent) do CNX CMS.
 */

import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs/promises';
import { isGitHubConfigured, githubWriteFile, githubDeleteFile, githubListDirectory, githubReadFile } from './github-api';

export interface OutlineItem {
    level: 'h1' | 'h2' | 'h3' | 'h4';
    text: string;
}

export interface ServiceData {
    niche?: string;
    title: string;
    slug: string;
    icon?: string;
    shortDescription?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    description?: string;
    benefits?: string[];
    metaTitle?: string;
    metaDescription?: string;
    active?: boolean;
    image?: string;
    thumbnail?: string;
    outline?: OutlineItem[];
    generatedContent?: string;
    outlineSource?: string;
    contentGeneratedAt?: string;
}

export interface ServiceFile {
    data: ServiceData;
    filename: string;
}

const SERVICES_DIR    = path.resolve('./src/content/services');
const SERVICES_GH_PATH = 'src/content/services';

export function slugToFilename(slug: string): string {
    return `${slug}.yaml`;
}

async function listServicesFromGitHub(): Promise<ServiceFile[]> {
    try {
        const files = await githubListDirectory(SERVICES_GH_PATH);
        const yamlFiles = files.filter((f: any) => f.name.endsWith('.yaml'));
        const results = await Promise.all(
            yamlFiles.map(async (file: any) => {
                const result = await githubReadFile(file.path);
                if (!result) return null;
                const data = yaml.load(result.content) as ServiceData;
                return { data, filename: file.name };
            }),
        );
        return (results.filter(Boolean) as ServiceFile[]).sort((a, b) =>
            a.data.title.localeCompare(b.data.title),
        );
    } catch (error) {
        console.error('❌ Erro ao listar serviços via GitHub API:', error);
        return [];
    }
}

export async function listServices(): Promise<ServiceFile[]> {
    try {
        await fs.mkdir(SERVICES_DIR, { recursive: true });
        const files = await fs.readdir(SERVICES_DIR);
        const yamlFiles = files.filter(f => f.endsWith('.yaml'));
        const loaded: ServiceFile[] = [];
        for (const filename of yamlFiles) {
            try {
                const content = await fs.readFile(path.join(SERVICES_DIR, filename), 'utf-8');
                const data = yaml.load(content) as ServiceData;
                if (data?.slug && data?.title) loaded.push({ data, filename });
            } catch (fileErr: unknown) {
                console.error(`\x1b[31m✗ [X] Serviço ignorado (erro): ${filename}\x1b[0m`, fileErr);
            }
        }
        return loaded.sort((a, b) => (a.data.title || '').localeCompare(b.data.title || ''));
    } catch (error) {
        if (isGitHubConfigured()) return listServicesFromGitHub();
        console.error('❌ Erro ao listar serviços:', error);
        return [];
    }
}

export async function readService(slug: string): Promise<ServiceFile | null> {
    try {
        const filename = slugToFilename(slug);
        const filePath = path.join(SERVICES_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as ServiceData;
        return { data, filename };
    } catch {
        return null;
    }
}

export async function writeService(slug: string, data: ServiceData): Promise<boolean> {
    try {
        const cleanedData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
        );
        const yamlContent = yaml.dump(cleanedData, {
            lineWidth: -1, noRefs: true, quotingType: '"',
        });
        const filename = slugToFilename(slug);

        if (isGitHubConfigured()) {
            return githubWriteFile(
                `${SERVICES_GH_PATH}/${filename}`,
                yamlContent,
                `content: save service "${slug}"`,
            );
        }

        await fs.mkdir(SERVICES_DIR, { recursive: true });
        await fs.writeFile(path.join(SERVICES_DIR, filename), yamlContent, 'utf-8');
        return true;
    } catch (error) {
        console.error(`❌ Erro ao escrever serviço ${slug}:`, error);
        return false;
    }
}

export async function deleteService(slug: string): Promise<boolean> {
    try {
        const filename = slugToFilename(slug);

        if (isGitHubConfigured()) {
            return githubDeleteFile(
                `${SERVICES_GH_PATH}/${filename}`,
                `content: delete service "${slug}"`,
            );
        }

        await fs.unlink(path.join(SERVICES_DIR, filename));
        return true;
    } catch (error) {
        console.error(`❌ Erro ao deletar serviço ${slug}:`, error);
        return false;
    }
}

export async function serviceSlugExists(slug: string, excludeSlug?: string): Promise<boolean> {
    try {
        const services = await listServices();
        return services.some(s => s.data.slug === slug && s.data.slug !== excludeSlug);
    } catch {
        return false;
    }
}

/** Lista serviços filtrados por nicho */
export async function listServicesByNiche(nicheSlug: string): Promise<ServiceFile[]> {
    const all = await listServices();
    return all.filter(s => s.data.niche === nicheSlug);
}
