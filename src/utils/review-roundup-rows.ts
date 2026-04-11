/**
 * Converte blocos .cnx-aff-roundup-item legados (core único) para colunas
 * (.cnx-aff-roundup-product-col | features-col | cta-col) para layout tipo tabela.
 */

function indexOfDivClose(html: string, from: number, depthStart: number): number {
  let depth = depthStart;
  let pos = from;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', pos);
    const nextClose = html.indexOf('</div>', pos);
    if (nextClose === -1) {
      return -1;
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return nextClose;
      }
      pos = nextClose + 6;
    }
  }
  return -1;
}

/** Fecha a div aberta em `openIdx` (início de `<div`). */
function closeDivEnd(html: string, openIdx: number): number {
  const gt = html.indexOf('>', openIdx);
  if (gt === -1) {
    return -1;
  }
  const closeIdx = indexOfDivClose(html, gt + 1, 1);
  if (closeIdx === -1) {
    return -1;
  }
  return closeIdx + '</div>'.length;
}

export function upgradeRoundupItemsHtml(html: string): string {
  if (!html.includes('cnx-aff-roundup-item') || !html.includes('cnx-aff-roundup-core')) {
    return html;
  }
  if (html.includes('cnx-aff-roundup-product-col')) {
    return html;
  }

  const wrapNeedle = '<div class="cnx-aff-roundup cnx-aff-block-wrap"';
  const w0 = html.indexOf(wrapNeedle);
  if (w0 === -1) {
    return html;
  }
  const wrapOpenStart = w0;
  const wrapOpenEnd = html.indexOf('>', wrapOpenStart) + 1;
  const innerStart = wrapOpenEnd;
  const wrapCloseStart = indexOfDivClose(html, innerStart, 1);
  if (wrapCloseStart === -1) {
    return html;
  }
  const inner = html.slice(innerStart, wrapCloseStart);

  const itemOpen = '<div class="cnx-aff-roundup-item">';
  const upgradedParts: string[] = [];
  let cursor = 0;
  while (true) {
    const itemStart = inner.indexOf(itemOpen, cursor);
    if (itemStart === -1) {
      break;
    }
    const blockStart = itemStart;
    const blockEnd = closeDivEnd(inner, blockStart);
    if (blockEnd === -1) {
      return html;
    }
    const itemHtml = inner.slice(blockStart, blockEnd);
    upgradedParts.push(upgradeOneItem(itemHtml));
    cursor = blockEnd;
  }

  if (upgradedParts.length === 0) {
    return html;
  }

  const newInner = upgradedParts.join('');
  return `${html.slice(0, innerStart)}${newInner}${html.slice(wrapCloseStart)}`;
}

function upgradeOneItem(itemHtml: string): string {
  if (!itemHtml.includes('cnx-aff-roundup-core')) {
    return itemHtml;
  }

  const inner = itemHtml.slice(
    '<div class="cnx-aff-roundup-item">'.length,
    itemHtml.length - '</div>'.length,
  );

  const rankMatch = inner.match(/<div class="cnx-aff-roundup-rank">([^<]*)<\/div>/i);
  const rank = rankMatch ? rankMatch[0] : '<div class="cnx-aff-roundup-rank">?</div>';

  const imgMatch = inner.match(/<img[^>]*class="cnx-aff-roundup-img"[^>]*\/?>/i);
  const img = imgMatch ? imgMatch[0] : '';

  const coreOpen = inner.indexOf('<div class="cnx-aff-roundup-core">');
  if (coreOpen === -1) {
    return itemHtml;
  }
  const coreGt = inner.indexOf('>', coreOpen);
  const coreInnerStart = coreGt + 1;
  const coreCloseIdx = indexOfDivClose(inner, coreInnerStart, 1);
  if (coreCloseIdx === -1) {
    return itemHtml;
  }
  const core = inner.slice(coreInnerStart, coreCloseIdx);

  const badgeMatch = core.match(/<div class="cnx-aff-roundup-item-badge">([\s\S]*?)<\/div>/i);
  const badge = badgeMatch ? badgeMatch[0] : '';

  const titleMatch = core.match(/<h3 class="cnx-aff-roundup-item-title"[^>]*>([\s\S]*?)<\/h3>/i);
  const title = titleMatch ? titleMatch[0] : '';

  const scoreMatch = core.match(/<div class="cnx-aff-roundup-item-score">([\s\S]*?)<\/div>/i);
  const score = scoreMatch ? scoreMatch[0] : '';

  const ulMatch = core.match(/<ul[^>]*>[\s\S]*?<\/ul>/i);
  const ul = ulMatch ? ulMatch[0] : '';

  const ctasMatch = core.match(/<div class="cnx-aff-roundup-ctas">[\s\S]*?<\/div>/i);
  const ctas = ctasMatch ? ctasMatch[0] : '<div class="cnx-aff-roundup-ctas"></div>';

  const imgCell = img
    ? `<div class="cnx-aff-roundup-img-cell">${img}</div>`
    : '<div class="cnx-aff-roundup-img-cell cnx-aff-roundup-img-cell--empty" aria-hidden="true"></div>';

  return `<div class="cnx-aff-roundup-item">${rank}${imgCell}<div class="cnx-aff-roundup-product-col">${badge}${title}${score}</div><div class="cnx-aff-roundup-features-col">${ul}</div><div class="cnx-aff-roundup-cta-col">${ctas}</div></div>`;
}

export function ensureRoundupTableHead(html: string): string {
  if (!html.includes('cnx-aff-roundup cnx-aff-block-wrap') || html.includes('cnx-aff-roundup-head')) {
    return html;
  }
  return html.replace(
    /<div class="cnx-aff-roundup cnx-aff-block-wrap"[^>]*>/i,
    (full) =>
      `${full}<div class="cnx-aff-roundup-head" aria-hidden="true"><span class="cnx-aff-roundup-head-spacer"></span><span>Imagem</span><span>Produto</span><span>Destaques</span><span>Preço</span></div>`,
  );
}
