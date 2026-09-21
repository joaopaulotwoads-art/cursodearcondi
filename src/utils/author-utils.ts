/**
 * author-utils.ts
 * 
 * Utilitários para manipulação de autores em formato YAML.
 */

import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs/promises';
import { isGitHubConfigured, githubReadFile, githubWriteFile, githubDeleteFile, githubListDirectory } from './github-api';

export interface AuthorData {
    name: string;
    slug: string;
    role: string;
    avatar?: string;
    bio: string;
    // Acesso ao painel admin
    email?: string;
    adminRole?: 'admin' | 'editor' | 'none';
    adminPasswordHash?: string;
}

export interface AuthorFile {
    data: AuthorData;
    filename: string;
}

const AUTHORS_DIR = path.resolve('./src/content/authors');
const AUTHORS_GH_PATH = 'src/content/authors';

export function slugToFilename(slug: string): string {
    return `${slug}.yaml`;
}

export function filenameToSlug(filename: string): string {
    return filename.replace(/\.yaml$/, '');
}

/**
 * Busca autores diretamente da GitHub API.
 * Usado como fallback quando o filesystem local ainda não tem os arquivos
 * (ex: logo após o setup, antes do rebuild da Vercel completar).
 */
async function listAuthorsFromGitHub(): Promise<AuthorFile[]> {
    try {
        const files = await githubListDirectory(AUTHORS_GH_PATH);
        const yamlFiles = files.filter(f => f.name.endsWith('.yaml'));
        const results = await Promise.all(
            yamlFiles.map(async (file) => {
                const result = await githubReadFile(file.path);
                if (!result) return null;
                const data = yaml.load(result.content) as AuthorData;
                return { data, filename: file.name };
            }),
        );
        return (results.filter(Boolean) as AuthorFile[]).sort((a, b) =>
            a.data.name.localeCompare(b.data.name),
        );
    } catch (error) {
        console.error('❌ Erro ao listar autores via GitHub API:', error);
        return [];
    }
}

/**
 * Lista todos os autores.
 * Lê do filesystem local (rápido, usado após rebuild).
 * Fallback para GitHub API quando nenhum admin é encontrado localmente
 * e GitHub está configurado — cobre a janela entre setup e rebuild da Vercel.
 */
export async function listAuthors(): Promise<AuthorFile[]> {
    let authors: AuthorFile[] = [];

    try {
        const files = await fs.readdir(AUTHORS_DIR);
        const yamlFiles = files.filter(f => f.endsWith('.yaml'));
        const loaded = await Promise.all(
            yamlFiles.map(async (filename) => {
                const content = await fs.readFile(path.join(AUTHORS_DIR, filename), 'utf-8');
                const data = yaml.load(content) as AuthorData;
                return { data, filename };
            }),
        );
        authors = loaded.sort((a, b) => a.data.name.localeCompare(b.data.name));
    } catch (error) {
        console.error('❌ Erro ao listar autores (filesystem):', error);
    }

    // Fallback: se não há admin com senha localmente mas GitHub está configurado,
    // buscar diretamente da API (janela pós-setup antes do rebuild completar)
    const hasLocalAdmin = authors.some(
        a => a.data.adminRole === 'admin' && a.data.adminPasswordHash,
    );
    if (!hasLocalAdmin && isGitHubConfigured()) {
        const ghAuthors = await listAuthorsFromGitHub();
        if (ghAuthors.some(a => a.data.adminRole === 'admin' && a.data.adminPasswordHash)) {
            return ghAuthors;
        }
    }

    return authors;
}

/**
 * Lê um autor específico
 */
export async function readAuthor(slug: string): Promise<AuthorFile | null> {
    try {
        const filename = slugToFilename(slug);
        const filePath = path.join(AUTHORS_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as AuthorData;
        return { data, filename };
    } catch (error) {
        console.error(`❌ Erro ao ler autor ${slug}:`, error);
        return null;
    }
}

/**
 * Escreve um autor (cria ou atualiza)
 */
export async function writeAuthor(slug: string, data: AuthorData): Promise<boolean> {
    try {
        const cleanedData = Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined)
        );
        const yamlContent = yaml.dump(cleanedData, {
            lineWidth: -1, noRefs: true, quotingType: '"',
        });
        const filename = slugToFilename(slug);

        if (isGitHubConfigured()) {
            return githubWriteFile(
                `src/content/authors/${filename}`,
                yamlContent,
                `content: save author "${slug}"`,
            );
        }

        const filePath = path.join(AUTHORS_DIR, filename);
        await fs.writeFile(filePath, yamlContent, 'utf-8');
        return true;
    } catch (error) {
        console.error(`❌ Erro ao escrever autor ${slug}:`, error);
        return false;
    }
}

/**
 * Deleta um autor
 */
export async function deleteAuthor(slug: string): Promise<boolean> {
    try {
        const filename = slugToFilename(slug);

        if (isGitHubConfigured()) {
            return githubDeleteFile(
                `src/content/authors/${filename}`,
                `content: delete author "${slug}"`,
            );
        }

        const filePath = path.join(AUTHORS_DIR, filename);
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao deletar autor ${slug}:`, error);
        return false;
    }
}

/**
 * Verifica se um slug já existe
 */
export async function authorSlugExists(slug: string, excludeSlug?: string): Promise<boolean> {
    try {
        const authors = await listAuthors();
        return authors.some(a => a.data.slug === slug && a.data.slug !== excludeSlug);
    } catch {
        return false;
    }
}
