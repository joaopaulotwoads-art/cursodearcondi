/** Entidade principal para schema e metadados sociais */
/** Nome canônico da marca — usar sempre esta forma (sem sufixo de ano) para não fragmentar a entidade em schema/LLMs. */
export const SEO_ORGANIZATION_NAME = 'Curso de Ar Condicionado';

/** Caminho público da imagem padrão de compartilhamento (existe em public/) */
export const DEFAULT_OG_IMAGE_PATH = '/images/hero-bg.webp';

/** Logo para schema Organization */
export const DEFAULT_ORG_LOGO_PATH = '/images/cursodear/logo.png';

/** Limite recomendado para og:title (evita truncamento no Facebook/LinkedIn) */
export const OG_TITLE_MAX_LENGTH = 60;

export const ORG_SAME_AS: string[] = [
    'https://instagram.com/cursodearcondicionado/',
    'https://youtube.com/@cursodearcondicionado/',
    'https://facebook.com/cursodearcondicionado/',
];

/**
 * Especialista que assina a revisão técnica dos posts do blog (E-E-A-T).
 * Mesma pessoa citada como instrutor do curso na home e em /sobre/ —
 * mantido aqui como fonte única para não divergir entre schema e conteúdo visível.
 */
export const TECHNICAL_REVIEWER = {
    name: 'Leandro Moraes',
    jobTitle: 'Especialista em Refrigeração e Climatização',
    url: '/sobre/',
    avatar: '/images/leandro.webp',
};

export function truncateOgTitle(title: string, max = OG_TITLE_MAX_LENGTH): string {
    const t = title.trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
    return base.replace(/[\s|–-]+$/, '').trim() || t.slice(0, max);
}

export function absoluteUrl(siteOrigin: string, path: string): string {
    const base = siteOrigin.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
}

export function resolveOgImageAbs(siteOrigin: string, ogImageAbs?: string): string {
    if (ogImageAbs?.trim()) return ogImageAbs.trim();
    return absoluteUrl(siteOrigin, DEFAULT_OG_IMAGE_PATH);
}
