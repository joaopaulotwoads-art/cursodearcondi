/**
 * Expande tags declarativas no HTML de posts (contentFormat: html) em markup Bem Mãe / afiliado.
 * Uso (uma linha, data-json entre aspas simples; o JSON usa aspas duplas):
 * <ProsContras data-json='{"pros":["…"],"contras":["…"]}' />
 * <CardProduto data-json='{"title":"…","image":"…","features":[],"ctaUrl":"…"}' />
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type ProsContrasPayload = {
  pros: string[];
  contras: string[];
  ctaUrl?: string;
  ctaLabel?: string;
};

export function buildProsContrasHtml(data: ProsContrasPayload): string {
  const prosLis = data.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  const contrasLis = data.contras.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
  const cta =
    data.ctaUrl && data.ctaLabel
      ? `<div class="cnx-aff-pros-cons-cta"><a href="${escapeHtml(data.ctaUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer">${escapeHtml(data.ctaLabel)}</a></div>`
      : '';
  return `<div class="cnx-aff-pros-cons cnx-aff-block-wrap"><div class="cnx-aff-pros-cons-sections"><section class="cnx-aff-pros-section"><h3 class="cnx-aff-pros-title">Prós</h3><ul class="cnx-aff-pros-list">${prosLis}</ul></section><section class="cnx-aff-cons-section"><h3 class="cnx-aff-cons-title">Contras</h3><ul class="cnx-aff-cons-list">${contrasLis}</ul></section></div>${cta}</div>`;
}

export type CardProdutoPayload = {
  badge?: string;
  title: string;
  subtitle?: string;
  image: string;
  features: string[];
  ctaUrl: string;
  ctaLabel?: string;
  productName?: string;
};

export function buildCardProdutoHtml(data: CardProdutoPayload): string {
  const name = data.productName || data.title;
  const badge = data.badge
    ? `<div class="cnx-aff-product-badge">${escapeHtml(data.badge)}</div>`
    : '';
  const sub = data.subtitle ? `<p class="cnx-aff-product-sub">${escapeHtml(data.subtitle)}</p>` : '';
  const feats = data.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  const ctaLabel = data.ctaLabel || 'Ver na Amazon';
  return `<div class="cnx-aff-product cnx-aff-block-wrap">${badge}<div class="cnx-aff-product-body"><img src="${escapeHtml(data.image)}" alt="" class="cnx-aff-product-img" loading="lazy" width="522" height="522"><div class="cnx-aff-product-main"><h2 class="cnx-aff-product-title" data-product-name="${escapeHtml(name)}">${escapeHtml(data.title)}</h2>${sub}<ul class="cnx-aff-product-features">${feats}</ul><div class="cnx-aff-product-cta"><a href="${escapeHtml(data.ctaUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer">${escapeHtml(ctaLabel)}</a></div></div></div></div>`;
}

export function expandPostHtmlComponents(html: string): string {
  if (!html || typeof html !== 'string') return html;
  let out = html.replace(
    /<ProsContras\s+data-json='([^']*)'\s*\/>/gi,
    (full, json: string) => {
      try {
        const data = JSON.parse(json) as ProsContrasPayload;
        return buildProsContrasHtml({
          pros: Array.isArray(data.pros) ? data.pros : [],
          contras: Array.isArray(data.contras) ? data.contras : [],
          ctaUrl: data.ctaUrl,
          ctaLabel: data.ctaLabel,
        });
      } catch {
        return full;
      }
    },
  );
  out = out.replace(/<CardProduto\s+data-json='([^']*)'\s*\/>/gi, (full, json: string) => {
    try {
      const data = JSON.parse(json) as CardProdutoPayload;
      return buildCardProdutoHtml({
        badge: data.badge,
        title: data.title || '',
        subtitle: data.subtitle,
        image: data.image || '',
        features: Array.isArray(data.features) ? data.features : [],
        ctaUrl: data.ctaUrl || '#',
        ctaLabel: data.ctaLabel,
        productName: data.productName,
      });
    } catch {
      return full;
    }
  });
  return out;
}
