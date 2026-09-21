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
 * Lê um arquivo de post e retorna dados parseados
 */
export async function readPost(slug: string): Promise<PostFile | null> {
    try {
        const filename = slugToFilename(slug);
        const filePath = path.join(POSTS_DIR, filename);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(fileContent);
        
        return {
            data: parsed.data as PostData,
            content: parsed.content,
            filename,
        };
    } catch (error) {
        console.error(`❌ Erro ao ler post ${slug}:`, error);
        return null;
    }
}

/**
 * Lista todos os posts disponíveis
 */
export async function listPosts(): Promise<PostFile[]> {
    try {
        const files = await fs.readdir(POSTS_DIR);
        const mdocFiles = files.filter(f => f.endsWith('.mdoc'));
        
        const posts = await Promise.all(
            mdocFiles.map(async (filename) => {
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
        const filename = slugToFilename(slug);

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
        const filename = slugToFilename(slug);

        if (isGitHubConfigured()) {
            return githubDeleteFile(
                `src/content/posts/${filename}`,
                `content: delete post "${slug}"`,
            );
        }

        const filePath = path.join(POSTS_DIR, filename);

        try {
            await fs.access(filePath);
        } catch {
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
