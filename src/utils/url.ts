/** Helpers de URL: páginas internas sempre com barra final no canonical, sitemap e JSON-LD. */

/** "/" fica "/"; demais caminhos ganham barra final: "/sobre" -> "/sobre/". */
export function canonicalPathname(pathname: string): string {
  const inner = (pathname || '/').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return inner ? `/${inner}/` : '/';
}

/** URLs absolutas no JSON-LD com barra final em páginas; URLs de arquivo (com extensão) ficam como estão. */
export function schemaPageUrl(url: string): string {
  const t = (url || '').trim();
  if (!t) return t;
  try {
    const u = new URL(t);
    const path = u.pathname;
    const last = path.split('/').filter(Boolean).pop() ?? '';
    if (/\.[a-z0-9]{2,12}$/i.test(last)) return t;
    if (path.endsWith('/')) return u.toString();
    u.pathname = path === '/' ? '/' : `${path.replace(/\/$/, '')}/`;
    return u.toString();
  } catch {
    return t;
  }
}
