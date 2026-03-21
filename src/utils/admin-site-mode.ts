/**
 * admin-site-mode.ts
 *
 * Utilitário para obter o siteMode no painel admin com troca instantânea via cookie.
 * Prioridade: cookie (cnx-site-mode) > settings do content layer (build).
 * Suporta modos Blog e Local.
 */

export type SiteMode = 'blog' | 'local';

interface CookiesLike {
    get(name: string): { value: string } | undefined;
}

interface SettingsLike {
    data?: { siteMode?: string };
}

/**
 * Retorna o siteMode ativo no admin, priorizando o cookie (troca instantânea).
 */
export function getAdminSiteMode(
    cookies: CookiesLike,
    settingsFromBuild: { data?: { siteMode?: string } } | null
): SiteMode {
    const cookieVal = cookies.get('cnx-site-mode')?.value;
    if (cookieVal === 'local' || cookieVal === 'blog') return cookieVal;
    return settingsFromBuild?.data?.siteMode === 'local' ? 'local' : 'blog';
}

/**
 * Retorna o siteMode efetivo (alias para getAdminSiteMode).
 */
export function getEffectiveSiteMode(
    cookies: CookiesLike,
    settings: SettingsLike | null
): SiteMode {
    return getAdminSiteMode(cookies, settings);
}

/** Sempre true — suporta Blog e Local. */
export function themeSupportsBlogAndLocal(_settings: SettingsLike | null): boolean {
    return true;
}

export const SITE_MODE_COOKIE = 'cnx-site-mode';
export const SITE_MODE_COOKIE_MAX_AGE = 31536000; // 1 ano
export const SITE_MODE_COOKIE_PATH = '/admin';
