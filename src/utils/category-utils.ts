/**
 * category-utils.ts
 * 
 * Utilitários para manipulação de categorias em formato YAML.
 */

import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs/promises';
import { isGitHubConfigured, githubWriteFile, githubDeleteFile } from './github-api';

export interface CategoryData {
    name: string;
    slug: string;
}

export interface CategoryFile {
    data: CategoryData;
    filename: string;
}

const CATEGORIES_DIR = path.resolve('./src/content/categories');

export function slugToFilename(slug: string): string {
    return `${slug}.yaml`;
}

export function filenameToSlug(filename: string): string {
    return filename.replace(/\.yaml$/, '');
}

/**
 * Lista todas as categorias
 */
export async function listCategories(): Promise<CategoryFile[]> {
    try {
        const files = await fs.readdir(CATEGORIES_DIR);
        const yamlFiles = files.filter(f => f.endsWith('.yaml'));
        
        const categories = await Promise.all(
            yamlFiles.map(async (filename) => {
                const filePath = path.join(CATEGORIES_DIR, filename);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = yaml.load(content) as CategoryData;
                return { data, filename };
            })
        );
        
        return categories.sort((a, b) => a.data.name.localeCompare(b.data.name));
    } catch (error) {
        console.error('❌ Erro ao listar categorias:', error);
        return [];
    }
}

/**
 * Lê uma categoria específica
 */
export async function readCategory(slug: string): Promise<CategoryFile | null> {
    try {
        const filename = slugToFilename(slug);
        const filePath = path.join(CATEGORIES_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as CategoryData;
        return { data, filename };
    } catch (error) {
        console.error(`❌ Erro ao ler categoria ${slug}:`, error);
        return null;
    }
}

/**
 * Escreve uma categoria (cria ou atualiza)
 */
export async function writeCategory(slug: string, data: CategoryData): Promise<boolean> {
    try {
        const yamlContent = yaml.dump(data, {
            lineWidth: -1, noRefs: true, quotingType: '"',
        });
        const filename = slugToFilename(slug);

        if (isGitHubConfigured()) {
            return githubWriteFile(
                `src/content/categories/${filename}`,
                yamlContent,
                `content: save category "${slug}"`,
            );
        }

        const filePath = path.join(CATEGORIES_DIR, filename);
        await fs.writeFile(filePath, yamlContent, 'utf-8');
        return true;
    } catch (error) {
        console.error(`❌ Erro ao escrever categoria ${slug}:`, error);
        return false;
    }
}

/**
 * Deleta uma categoria
 */
export async function deleteCategory(slug: string): Promise<boolean> {
    try {
        const filename = slugToFilename(slug);

        if (isGitHubConfigured()) {
            return githubDeleteFile(
                `src/content/categories/${filename}`,
                `content: delete category "${slug}"`,
            );
        }

        const filePath = path.join(CATEGORIES_DIR, filename);
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao deletar categoria ${slug}:`, error);
        return false;
    }
}

/**
 * Verifica se um slug já existe
 */
export async function categorySlugExists(slug: string, excludeSlug?: string): Promise<boolean> {
    try {
        const categories = await listCategories();
        return categories.some(c => c.data.slug === slug && c.data.slug !== excludeSlug);
    } catch {
        return false;
    }
}
