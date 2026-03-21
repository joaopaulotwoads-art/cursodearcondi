import { defineCollection, z } from 'astro:content';
// Force reload v2
import { glob } from 'astro/loaders';

const posts = defineCollection({
    loader: glob({
        pattern: '**/*.{md,mdoc}',
        base: './src/content/posts',
        generateId: ({ entry }) => entry.replace(/\.(md|mdoc)$/i, ''),
    }),
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        author: z.string().optional(),
        publishedDate: z.string().optional(),
        category: z.string().optional(),
        thumbnail: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaImage: z.string().optional(),
        /** `html` = corpo guardado como HTML (ex.: import Ghost); render com set:html. */
        contentFormat: z.enum(['markdown', 'html']).optional(),
        /**
         * JSON-LD do post: auto = detecta cards Bem Mãe (ItemList) ou BlogPosting;
         * blogPosting = artigo informativo; articleItemList = ranking/review; none = desliga.
         */
        seoSchema: z.enum(['auto', 'blogPosting', 'articleItemList', 'none']).optional(),
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
        // Campos de acesso ao painel admin
        email: z.string().optional(),
        adminRole: z.enum(['admin', 'editor', 'none']).optional(),
        adminPasswordHash: z.string().optional(),
    }),
});

const categories = defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/categories' }),
    schema: z.object({
        name: z.string(),
        slug: z.string(),
    }),
});

const homepage = defineCollection({
    loader: glob({ pattern: 'classic/home.yaml', base: './src/content/singletons' }),
    schema: z.object({
        // Hero Section
        heroBadge: z.string().optional(),
        heroTitle: z.string().optional(),
        heroSubtitle: z.string().optional(),
        heroCtaText: z.string().optional(),
        heroCtaUrl: z.string().optional(),
        heroImage: z.string().nullable().optional(),
        // Prova Social
        socialProofTitle: z.string().optional(),
        clientLogos: z.array(z.object({
            name: z.string(),
            logo: z.string().nullable().optional(),
            url: z.string().nullable().optional(),
        })).optional(),
        // Quem Somos
        aboutTitle: z.string().optional(),
        aboutSubtitle: z.string().optional(),
        aboutContent: z.string().optional(),
        aboutImage: z.string().nullable().optional(),
        aboutStats: z.array(z.object({
            number: z.string(),
            label: z.string(),
        })).optional(),
        // Artigos em Destaque
        featuredPostsLayout: z.enum(['grid', 'single']).optional(),
        // Serviços
        servicesTitle: z.string().optional(),
        servicesSubtitle: z.string().optional(),
        services: z.array(z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string().optional(),
            url: z.string().optional(),
        })).optional(),
        // Campos legados (para compatibilidade)
        heroTitlePart1: z.string().optional(),
        heroTitleHighlight: z.string().optional(),
        heroTitlePart2: z.string().optional(),
        featuresHeadline: z.string().optional(),
        features: z.array(z.object({
            icon: z.string(),
            title: z.string(),
            description: z.string(),
            gradient: z.string(),
        })).optional(),
    }).passthrough(), // Permite campos adicionais
});

const siteThemes = defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/themes' }),
    schema: z.object({
        name: z.string(),
        slug: z.string(),
        primaryColor: z.string(),
        secondaryColor: z.string(),
        borderRadius: z.string(),
        layout: z.enum(['classic', 'bento', 'stellar', 'blog-adsense']).default('classic'),
        screenshot: z.string().optional(),
    }),
});

const siteSettings = defineCollection({
    loader: glob({
        pattern: 'settings.yaml',
        base: './src/content/singletons',
        generateId: ({ entry }) => entry.replace(/\.yaml$/, ''), // id = 'settings'
    }),
    schema: z.object({
        siteName: z.string(),
        /** Tema visual do site público (pastas em src/themes/ e singletons). */
        activeTheme: z.string().default('bemmae'),
        colorScheme: z.enum(['dark', 'light']).default('dark'),
        siteMode: z.enum(['blog', 'local']).default('blog'),
        aiProvider: z.enum(['openai', 'gemini']).default('gemini').optional(),
        aiApiKey: z.string().optional(),
        // Pexels API — imagens em posts gerados por IA (1 a cada ~400 palavras, máx 5)
        pexelsApiKey: z.string().optional(),
        // SEO Técnico (sitemap, robots.txt) — configurável no admin
        canonicalUrl: z.string().optional(),
        generateSitemap: z.boolean().default(true),
        generateRobots: z.boolean().default(true),
        robotsDisallow: z.array(z.string()).optional(),
        // Estrutura de permalink dos posts
        blogPermalinkStructure: z.enum(['postname', 'year_month', 'year_month_day']).default('postname'),
        blogUrlPrefix: z.enum(['blog', 'root']).default('blog'), // 'root' = sem /blog na URL
        // Contato centralizado — usado em Header, Footer, páginas locais, schema JSON-LD
        companyPhone: z.string().optional(),
        companyWhatsapp: z.string().optional(),
        // Atualizações automáticas do template (workflow .github)
        autoUpdateEnabled: z.boolean().optional(),
    }),
});

const outlineItem = z.object({
    level: z.enum(['h1', 'h2', 'h3', 'h4']),
    text:  z.string(),
});

const services = defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/services' }),
    schema: z.object({
        niche: z.string().optional(),
        title: z.string(),
        slug: z.string(),
        icon: z.string().optional(),
        shortDescription: z.string().optional(),
        heroTitle: z.string().optional(),
        heroSubtitle: z.string().optional(),
        description: z.string().optional(),
        benefits: z.array(z.string()).optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        active: z.boolean().default(true),
        image: z.string().optional(),
        thumbnail: z.string().optional(),
        // Campos de SEO programático
        outline: z.array(outlineItem).optional(),
        generatedContent: z.string().optional(),
        outlineSource: z.string().optional(),
        contentGeneratedAt: z.string().optional(),
    }).passthrough(),
});

const lp1 = defineCollection({
    loader: glob({ pattern: 'lp1.yaml', base: './src/content/singletons' }),
    schema: z.object({
        // Hero Section
        heroBadge: z.string().optional(),
        heroTitleLine1: z.string().optional(),
        heroTitleHighlight: z.string().optional(),
        heroTitleLine2: z.string().optional(),
        heroSubtitle: z.string().optional(),
        heroCtaText: z.string().optional(),
        heroCtaUrl: z.string().optional(),
        heroFeatures: z.string().optional(),
        heroImage: z.string().nullable().optional(),
        // Velho vs Novo Caminho
        oldVsNewTitle: z.string().optional(),
        oldVsNewSubtitle: z.string().optional(),
        oldPathTitle: z.string().optional(),
        oldPathItems: z.array(z.string()).optional(),
        newPathTitle: z.string().optional(),
        newPathItems: z.array(z.string()).optional(),
        // Ponte da Epifania
        epiphanyTitle: z.string().optional(),
        epiphanyContent: z.string().optional(),
        epiphanyQuote: z.string().optional(),
        epiphanyStats: z.array(z.object({
            number: z.string(),
            label: z.string(),
            icon: z.string().optional(),
        })).optional(),
        epiphanyImage: z.string().nullable().optional(),
        // Mecanismo Único
        mechanismTitle: z.string().optional(),
        mechanismItems: z.array(z.object({
            number: z.string(),
            icon: z.string(),
            title: z.string(),
            description: z.string(),
        })).optional(),
        mechanismFooter: z.string().optional(),
        // Demonstração Técnica
        demoTitle: z.string().optional(),
        demoDescription: z.string().optional(),
        demoVideoUrl: z.string().optional(),
        demoImage: z.string().nullable().optional(),
        demoFeatures: z.array(z.object({
            icon: z.string(),
            title: z.string(),
            description: z.string(),
        })).optional(),
        // O Caminho Completo
        pathTitle: z.string().optional(),
        pathSubtitle: z.string().optional(),
        pathSteps: z.array(z.object({
            number: z.string(),
            icon: z.string(),
            title: z.string(),
            description: z.string(),
        })).optional(),
        // Depoimentos
        testimonialsTitle: z.string().optional(),
        testimonialsSubtitle: z.string().optional(),
        testimonials: z.array(z.object({
            name: z.string(),
            role: z.string().optional(),
            rating: z.string().optional(),
            text: z.string(),
            image: z.string().nullable().optional(),
            videoUrl: z.string().optional(),
        })).optional(),
        // A Oferta
        offerTitle: z.string().optional(),
        offerItems: z.array(z.object({
            title: z.string(),
            description: z.string(),
        })).optional(),
        offerBadge: z.string().optional(),
        offerPriceTitle: z.string().optional(),
        offerPriceSubtitle: z.string().optional(),
        offerCtaText: z.string().optional(),
        offerCtaUrl: z.string().optional(),
        offerStack: z.array(z.object({
            title: z.string(),
            description: z.string(),
        })).optional(),
        offerBonuses: z.array(z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string().optional(),
        })).optional(),
        // Garantia
        guaranteeTitle: z.string().optional(),
        guaranteeText: z.string().optional(),
        guaranteeBadge: z.string().optional(),
        // FAQ
        faqTitle: z.string().optional(),
        faqItems: z.array(z.object({
            question: z.string(),
            answer: z.string(),
        })).optional(),
        // A Escolha é Sua
        choiceTitle: z.string().optional(),
        choiceOption1Title: z.string().optional(),
        choiceOption1Text: z.string().optional(),
        choiceOption2Title: z.string().optional(),
        choiceOption2Text: z.string().optional(),
        choiceCtaText: z.string().optional(),
        choiceCtaUrl: z.string().optional(),
        choiceFooter: z.string().optional(),
    }).passthrough(),
});

const locations = defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/locations' }),
    schema: z.object({
        name: z.string(),
        slug: z.string(),
        state: z.string(),
        city: z.string().optional(),
        citySlug: z.string().optional(),
        type: z.enum(['cidade', 'bairro', 'regiao', 'zona']).default('cidade'),
        active: z.boolean().default(true),
    }),
});

const nichos = defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/nichos' }),
    schema: z.object({
        name: z.string(),
        slug: z.string(),
        icon: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        active: z.boolean().default(true),
    }),
});

export const collections = { posts, authors, categories, homepage, siteThemes, siteSettings, lp1, services, locations, nichos };
