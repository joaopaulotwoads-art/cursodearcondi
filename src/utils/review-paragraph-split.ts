/**
 * Divide parágrafos HTML longos em blocos mais curtos (≈2 frases / ~3 linhas na leitura),
 * separando em `. ` (ponto + espaço). Ignora `<p>` que já contém tags (ex.: <strong>).
 */

function splitIntoSentences(text: string): string[] {
  const raw = text.trim();
  if (!raw) return [];
  const pieces = raw.split('. ');
  return pieces.map((piece, i) => {
    const p = piece.trim();
    if (i < pieces.length - 1) {
      return p.endsWith('.') ? p : `${p}.`;
    }
    return p;
  });
}

/** Agrupa frases de 2 em 2 (último bloco pode ter 1). */
function chunkSentences(sentences: string[], perParagraph: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    out.push(sentences.slice(i, i + perParagraph).join(' '));
  }
  return out;
}

const MIN_CHARS_TO_SPLIT = 100;
const SENTENCES_PER_PARAGRAPH = 2;

export function splitReviewRoundupBodyParagraphs(html: string): string {
  return html.replace(/<p>([^<]+)<\/p>/gi, (full, inner) => {
    const t = inner.trim();
    if (t.length < MIN_CHARS_TO_SPLIT) return full;

    const sentences = splitIntoSentences(t);
    if (sentences.length < 2) return full;

    const chunks = chunkSentences(sentences, SENTENCES_PER_PARAGRAPH);
    if (chunks.length <= 1) return full;

    return chunks.map((c) => `<p>${c}</p>`).join('\n');
  });
}
