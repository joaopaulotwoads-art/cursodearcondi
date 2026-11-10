# cursodearcondicionado.com.br

Site estático em [Astro](https://astro.build), publicado na Vercel.

## Rodar localmente

Requer [Bun](https://bun.sh).

```sh
bun install
bun run dev        # http://localhost:4321
```

## Build

```sh
bun run build      # gera dist/
bun run preview    # serve dist/ localmente
```

## Publicar

A Vercel publica sozinha a cada push:

- push em `main` → produção (cursodearcondicionado.com.br)
- push em outra branch → preview com URL própria

Redirects e headers ficam em `vercel.json`.

## Conferir SEO antes de publicar

```sh
bun run build
bun run seo:snapshot dist seo-atual.json
bun run seo:snapshot --compare seo-baseline.json seo-atual.json
```

Mais detalhes da estrutura em `CLAUDE.md`.
