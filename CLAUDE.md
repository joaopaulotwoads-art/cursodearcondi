# CLAUDE.md

Site estático em Astro (`output: 'static'`) do cursodearcondicionado.com.br. Não há CMS, painel, API nem banco: todo conteúdo é arquivo no repositório.

## Estrutura

- `src/content/posts/*.md`: posts do blog (Markdown + frontmatter). Schema em `src/content/config.ts`.
- `src/content/authors/*.yaml`: autores (os posts usam `equipe-curso-de-ar-condicionado`).
- `src/content/categories/*.yaml`: categorias; cada uma vira a página `/<id>/`.
- `src/pages/`: páginas fixas (`index`, `cursos`, `automotivo`, `sobre`, `contato`, `area-do-aluno`, legais), `blog/index.astro` (listagem), `[...slug].astro` (posts e categorias na raiz) e `sitemap-index.xml.ts`.
- `src/data/site.ts`: nome, URL canônica, logo, menu do topo e do rodapé.
- `src/themes/cursodear/`: `BaseLayout` (head, SEO, GA4, Clarity, rastreio de cliques), `Header`, `Footer`, `BlogPost`, `BlogList`, CSS do tema.
- `src/utils/`: `hotmart-src.ts` (src nos links Hotmart), `post-json-ld.ts` (schema), `seo-meta.ts` (OG padrão, revisor técnico), `post-url.ts`, `url.ts`.
- `public/`: imagens, favicons, `robots.txt`, `llms.txt`, `sitemap.xsl`.
- `vercel.json`: redirects (URLs antigas `/blog/<slug>/` etc.) e headers.

## Criar um post

1. Crie `src/content/posts/<slug>.md` copiando o frontmatter de um post existente: `title`, `slug`, `author`, `publishedDate` (AAAA-MM-DD), `category`, `thumbnail`, `metaImage`, `metaTitle`, `metaDescription`, `seoSchema: "blogPosting"`.
2. Imagens em `public/images/blog/` (WebP). Confira se o caminho existe: imagem inexistente quebra o og:image.
3. O post aparece em `/<slug>/`, na listagem `/blog/`, na categoria e no sitemap automaticamente.
4. Página nova em `src/pages/` precisa entrar em `STATIC_PATHS` de `src/pages/sitemap-index.xml.ts`.

## Regras de SEO

- **Links Hotmart:** nunca escreva o `src` à mão. Em posts Markdown, o plugin `rehypeHotmartSrc` (em `astro.config.mjs`) acrescenta `src=blog-<slug>` em todo link `go.hotmart.com`. Em páginas `.astro`, use `withHotmartSrc(url, '<slug-da-página>')`. Os parâmetros existentes (`ap=...`) são preservados.
- **Um H1 por página.** Em posts, o H1 é o `title`; no corpo do Markdown use só `##` e abaixo.
- **Canonical:** o `BaseLayout` gera `https://cursodearcondicionado.com.br/<caminho>/` (sempre com barra final). Só passe `canonicalOverride` se a página precisar de outro valor.
- Links internos e canonical sem `www` e com barra final.
- Antes de publicar mudanças estruturais, rode a comparação com `seo-baseline.json` (ver README).

## Rastreamento

- GA4 `G-MPD65NHEQ7` e Microsoft Clarity `zbhwrgxpff` (só no domínio de produção) no `BaseLayout`.
- Eventos `hotmart_click` (page_path, link_text, posicao) e `whatsapp_click` (page_path) por delegação de cliques, enviados ao GA4 e ao Clarity. Use `data-posicao="topo|meio|fim"` em CTAs para fixar a posição.
- `?debug_mode=true` na URL manda os eventos para o DebugView do GA4.
- Clarity recebe `tipo_pagina` (`home`, `blog`, `curso`) pela prop `tipoPagina` do `BaseLayout`.

## Formulário de contato

`/contato/` envia para formsubmit.co (contato@cursodearcondicionado.com.br). Não há backend próprio.

## Publicar

```sh
bun run build                     # precisa passar sem erro
git push origin <branch>          # preview na Vercel
git push origin main              # produção
```
