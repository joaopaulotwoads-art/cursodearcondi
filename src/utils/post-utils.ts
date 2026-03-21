/**
 * post-utils.ts
 * 
 * Utilitários para manipulação de posts em formato .mdoc (Markdoc com frontmatter YAML).
 * Funções para ler, escrever, parsear e formatar arquivos de posts.
 * 
 * Formato esperado:
 * ---
 * title: "..."
 * slug: "..."
 * author: "..."
 * category: "..."
 * publishedDate: "..."
 * metaDescription: "..."
 * metaImage: "..."
 * ---
 * 
 * Conteúdo em Markdown/Markdoc aqui...
 */

import matter from 'gray-matter';
import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs/promises';
import { isGitHubConfigured, githubWriteFile, githubDeleteFile } from './github-api';

export interface PostData {
    title: string;
    slug: string;
    author?: string;
    category?: string;
    publishedDate?: string;
    thumbnail?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaImage?: string;
    contentFormat?: 'markdown' | 'html';
    seoSchema?: 'auto' | 'blogPosting' | 'articleItemList' | 'none';
}

export interface PostFile {
    data: PostData;
    content: string;
    filename: string;
}

const POSTS_DIR = path.resolve('./src/content/posts');
const DELETED_DIR = path.join(POSTS_DIR, '_deleted');

/**
 * Gera nome de arquivo baseado no slug
 */
export function slugToFilename(slug: string): string {
    return `${slug}.mdoc`;
}

/**
 * Lê um arquivo de post e retorna dados parseados (.mdoc ou .md).
 */
export async function readPost(slug: string): Promise<PostFile | null> {
    const exts = ['.mdoc', '.md'];
    for (const ext of exts) {
        const filename = `${slug}${ext}`;
        const filePath = path.join(POSTS_DIR, filename);
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const parsed = matter(fileContent);
            return {
                data: parsed.data as PostData,
                content: parsed.content,
                filename,
            };
        } catch {
            continue;
        }
    }
    return null;
}

/**
 * Lista todos os posts disponíveis
 */
export async function listPosts(): Promise<PostFile[]> {
    try {
        const files = await fs.readdir(POSTS_DIR);
        const postFiles = files.filter(f => f.endsWith('.mdoc') || f.endsWith('.md'));
        
        const posts = await Promise.all(
            postFiles.map(async (filename) => {
                const filePath = path.join(POSTS_DIR, filename);
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const parsed = matter(fileContent);
                
                return {
                    data: parsed.data as PostData,
                    content: parsed.content,
                    filename,
                };
            })
        );
        
        return posts;
    } catch (error) {
        console.error('❌ Erro ao listar posts:', error);
        return [];
    }
}

/**
 * Escreve um post em arquivo .mdoc (local ou via GitHub API em produção)
 */
export async function writePost(
    slug: string,
    data: PostData,
    content: string
): Promise<boolean> {
    try {
        const cleanData: Record<string, unknown> = {};
        Object.keys(data).forEach(key => {
            const value = (data as Record<string, unknown>)[key];
            if (value !== undefined && value !== null && value !== '') {
                cleanData[key] = value;
            }
        });

        const frontmatter = yaml.dump(cleanData, {
            lineWidth: -1, noRefs: true, quotingType: '"',
        });
        const fileContent = `---\n${frontmatter}---\n\n${content || ''}`;
        let filename = slugToFilename(slug);
        for (const ext of ['.mdoc', '.md']) {
            const fp = path.join(POSTS_DIR, `${slug}${ext}`);
            try {
                await fs.access(fp);
                filename = `${slug}${ext}`;
                break;
            } catch {
                /* next */
            }
        }

        if (isGitHubConfigured()) {
            return githubWriteFile(
                `src/content/posts/${filename}`,
                fileContent,
                `content: save post "${slug}"`,
            );
        }

        const filePath = path.join(POSTS_DIR, filename);
        await fs.writeFile(filePath, fileContent, 'utf-8');
        return true;
    } catch (error) {
        console.error(`❌ Erro ao escrever post ${slug}:`, error);
        return false;
    }
}

/**
 * Deleta um post (local ou via GitHub API em produção).
 * Em ambiente local: faz soft delete (move para _deleted) para evitar
 * UnknownFilesystemError da Astro Content Layer ao usar fs.unlink.
 */
export async function deletePost(slug: string): Promise<boolean> {
    try {
        const exts = ['.mdoc', '.md'];
        let filePath: string | null = null;
        let filename: string | null = null;
        for (const ext of exts) {
            const fn = `${slug}${ext}`;
            const fp = path.join(POSTS_DIR, fn);
            try {
                await fs.access(fp);
                filePath = fp;
                filename = fn;
                break;
            } catch {
                continue;
            }
        }

        if (isGitHubConfigured()) {
            const fn = filename || slugToFilename(slug);
            return githubDeleteFile(
                `src/content/posts/${fn}`,
                `content: delete post "${slug}"`,
            );
        }

        if (!filePath || !filename) {
            console.error(`\x1b[31m✗ [X] Post não encontrado: ${slug}\x1b[0m`);
            return false;
        }

        await fs.mkdir(DELETED_DIR, { recursive: true });
        const deletedPath = path.join(DELETED_DIR, `${filename}.deleted`);
        await fs.rename(filePath, deletedPath);
        return true;
    } catch (error) {
        console.error('\x1b[31m✗ [X] Erro ao deletar post', slug, ':\x1b[0m', error);
        return false;
    }
}

/**
 * Verifica se um slug já existe
 */
export async function slugExists(slug: string, excludeSlug?: string): Promise<boolean> {
    const posts = await listPosts();
    return posts.some(
        post => post.data.slug === slug && post.data.slug !== excludeSlug
    );
}

/**
 * Gera slug a partir de título
 */
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-') // Substitui não-alfanuméricos por hífen
        .replace(/^-+|-+$/g, ''); // Remove hífens do início/fim
}
