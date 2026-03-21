/**
 * Constrói listas de navegação a partir dos singletons menu/footer (vários temas).
 */

export interface SimpleNavItem {
    href: string;
    label: string;
}

/** URL do logo quando `logoType` é `image` e `logoImage` está preenchido. */
export function logoSrcFromMenu(menu: Record<string, unknown> | null | undefined): string | undefined {
    if (!menu || menu.logoType !== 'image') return undefined;
    const src = (menu.logoImage as string | undefined)?.trim();
    return src || undefined;
}

export function navFromMenu(menu: Record<string, unknown> | null | undefined): SimpleNavItem[] {
    const items = menu?.items as Array<{ href?: string; label?: string }> | undefined;
    if (!items?.length) return [{ href: '/', label: 'Home' }];
    return items.map((i) => ({
        href: (i.href || '/').toString(),
        label: (i.label || 'Link').toString(),
    }));
}

export function footerNavFromSingleton(footer: Record<string, unknown> | null | undefined): SimpleNavItem[] {
    const direct = footer?.footerNav as SimpleNavItem[] | undefined;
    if (direct?.length) {
        return direct.map((i) => ({ href: i.href || '/', label: i.label || '' }));
    }
    const columns = footer?.columns as Array<{ links?: SimpleNavItem[] }> | undefined;
    if (columns?.length) {
        const links = columns.flatMap((c) => c.links || []);
        if (links.length) return links.map((i) => ({ href: i.href || '/', label: i.label || '' }));
    }
    return [
        { href: '/', label: 'Início' },
        { href: '/blog', label: 'Blog' },
    ];
}
