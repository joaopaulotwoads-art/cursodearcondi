/**
 * Insere `<div class="cnx-aff-pros-cons-cta">` com link da última caixa de produto
 * (`cnx-aff-product-cta`) antes do bloco Prós/Contras, quando ainda não existir.
 */

const PROS_OPEN = '<div class="cnx-aff-pros-cons cnx-aff-block-wrap">';
const CLOSE_NO_CTA = '</ul></section></div></div>';
const PRODUCT_CTA_RE = /<div class="cnx-aff-product-cta"><a href="(https?:\/\/[^"]+)"/g;

export function injectMissingProsConsCtas(html: string): string {
  let result = '';
  let i = 0;
  let lastAffiliateUrl = '';

  while (i < html.length) {
    const nextPros = html.indexOf(PROS_OPEN, i);
    if (nextPros === -1) {
      const tail = html.slice(i);
      PRODUCT_CTA_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PRODUCT_CTA_RE.exec(tail)) !== null) {
        lastAffiliateUrl = m[1];
      }
      result += tail;
      break;
    }

    const between = html.slice(i, nextPros);
    PRODUCT_CTA_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PRODUCT_CTA_RE.exec(between)) !== null) {
      lastAffiliateUrl = m[1];
    }
    result += between;

    const endMarker = html.indexOf(CLOSE_NO_CTA, nextPros);
    if (endMarker === -1) {
      result += html.slice(nextPros);
      break;
    }
    const blockEnd = endMarker + CLOSE_NO_CTA.length;
    let block = html.slice(nextPros, blockEnd);

    if (block.includes('cnx-aff-pros-cons-cta')) {
      result += block;
      i = blockEnd;
      continue;
    }

    if (lastAffiliateUrl) {
      block = block.replace(
        /<\/ul><\/section><\/div><\/div>\s*$/,
        `</ul></section></div><div class="cnx-aff-pros-cons-cta"><a href="${lastAffiliateUrl}" target="_blank" rel="nofollow sponsored noopener noreferrer">Ver na Amazon</a></div></div>`
      );
    }
    result += block;
    i = blockEnd;
  }

  return result;
}
