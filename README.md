# cursodearcondicionado.com.br

Site estático em [Astro](https://astro.build), hospedado em Cloudflare Workers (static assets).

## Rodar localmente

Requer [Bun](https://bun.sh) (ou npm) e Node 20+.

```sh
bun install
npm run dev          # http://localhost:4321 (dev do Astro)
npm run preview:cf   # build + wrangler dev: igual à produção, com _redirects, _headers e 404
```

## Build

```sh
npm run build        # gera dist/ (inclui dist/_redirects com os 301 de barra final)
```

## Publicar

```sh
npm run deploy       # build + wrangler deploy
```

**O deploy vai direto para produção**: não há preview nem aprovação. Rode `npm run preview:cf` e a comparação de SEO antes. Push no GitHub não publica nada.

Redirects ficam em `public/_redirects`, headers em `public/_headers`, configuração do Worker em `wrangler.jsonc`.

## Conferir SEO antes de publicar

```sh
npm run build
npm run seo:snapshot dist seo-atual.json
npm run seo:snapshot -- --compare seo-baseline.json seo-atual.json
```

Mais detalhes da estrutura em `CLAUDE.md`.
