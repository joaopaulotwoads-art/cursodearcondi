import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/posts',
        generateId: ({ entry }) => entry.replace(/\.(md|mdoc)$/i, ''),
    }),
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        author: z.string().optional(),
        /** Compatibilidade com posts antigos (date) e atuais (publishedDate). */
        date: z.string().optional(),
        publishedDate: z.string().optional(),
        /** Data da última revisão de conteúdo (ex.: dado salarial atualizado); usada em dateModified do schema. */
        updatedDate: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        thumbnail: z.string().optional(),
        /** Imagem principal do post (hero/OG); alias semntico de thumbnail quando usado sozinho. */
        image: z.string().optional(),
        imageAlt: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaImage: z.string().optional(),
        /** `html` = corpo guardado como HTML (ex.: import Ghost); render com set:html. */
        contentFormat: z.enum(['markdown', 'html']).optional(),
        /**
         * JSON-LD do post: auto = detecta cards Curso de Ar Condicionadoe (ItemList) ou BlogPosting;
         * blogPosting = artigo informativo; articleItemList = ranking/review; none = desliga.
         */
        seoSchema: z.enum(['auto', 'blogPosting', 'articleItemList', 'none']).optional(),
        /** Layout editorial: reviewRoundup = artigo tipo ranking (fundo rosado, CTAs amarelos, blocos de review). */
        articleLayout: z.enum(['default', 'reviewRoundup']).optional(),
        /** Perguntas frequentes (corpo do artigo + FAQPage no JSON-LD). */
        faq: z
            .array(
                z.object({
                    q: z.string(),
                    a: z.string(),
                }),
            )
            .optional(),
    }),
});

const authors = defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/authors' }),
    schema: z.object({
        name: z.string(),
        slug: z.string(),
        role: z.string(),
        avatar: z.string().optional(),
        bio: z.string(),
        /** URL do perfil completo (E-E-A-T), ex.: /sobre/ */
        profilePath: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        certifications: z
            .array(
                z.object({
                    title: z.string(),
                    detail: z.string().optional(),
                }),
            )
            .optional(),
        projects: z
            .array(
                z.object({
                    title: z.string(),
                    description: z.string(),
                }),
            )
            .optional(),
    }),
});

const categories = defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/categories' }),
    schema: z.object({
        name: z.string(),
        slug: z.string(),
    }),
});

export const collections = { posts, authors, categories };
