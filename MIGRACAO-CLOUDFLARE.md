# Troca de hospedagem: Vercel -> Cloudflare Workers

Estado em 10/11/2026 (noite):

- Nameservers trocados no Registro.br para `ali.ns.cloudflare.com` e `brian.ns.cloudflare.com`; o Registro.br delega em cerca de 2 h (até lá o domínio fica nos servidores temporários `a/b.auto.dns.br`, sem registro A: site fora do ar nesse intervalo).
- A Vercel já não serve o domínio (`DEPLOYMENT_NOT_FOUND`).
- Worker `cursodearcondicionado` publicado com custom domain em `cursodearcondicionado.com.br` e `www` (registros `AAAA 100::` proxied criados pelo deploy). Volta ao ar quando a zona ativar.
- Pendências na zona: TXT do Google, Email Routing (remover `v=spf1 -all` e o MX nulo) e as duas Redirect Rules.

## Registros DNS antes da troca (Vercel)

| Nome | Tipo | Valor | Na importação |
|---|---|---|---|
| `@` | A | 216.198.79.65, 64.29.17.1 | **manter**, "Somente DNS" (nuvem cinza), até o passo 5 |
| `www` | A | 216.198.79.65, 64.29.17.65 | **manter**, "Somente DNS", até o passo 5 |
| `*` | A | 216.198.79.x, 64.29.17.x | **apagar** |
| `_vercel` | TXT/A | Vercel | apagar, se aparecer |
| `@` | TXT | `google-site-verification=nNd6LZMU…` | **manter** (Search Console) |
| `@` | CAA | letsencrypt.org, pki.goog, sectigo.com | manter e acrescentar `ssl.com`, ou apagar os três |

Não existe MX, SPF, DKIM nem DMARC: o domínio não recebe e-mail hoje.

## Passo a passo

1. **Adicionar a zona na Cloudflare** (Add a domain, plano Free). Na revisão dos registros importados, aplicar a tabela acima: **manter os A de `@` e `www` como "Somente DNS" apontando para a Vercel** (o site continua no ar durante a propagação) e **apagar só o curinga `*`**.
2. **Email Routing** (Email > Email Routing > Enable): criar o endereço `contato@cursodearcondicionado.com.br` encaminhando para o seu Gmail e confirmar o e-mail de verificação no Gmail. Aceitar os registros que o Email Routing propõe (3 MX `route1/2/3.mx.cloudflare.net` e o TXT SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`). Eles só passam a valer quando a zona ativar.
3. **Trocar os nameservers no Registro.br**: substituir `ns1.vercel-dns.com` e `ns2.vercel-dns.com` pelos dois nameservers que a Cloudflare mostrar. A ativação pode levar algumas horas (TTL de 86400 s no NS). Enquanto isso o site segue na Vercel pelos A mantidos no passo 1.
4. **Esperar a zona ficar "Active"** na Cloudflare (chega um e-mail). Testar o e-mail: mandar uma mensagem para contato@cursodearcondicionado.com.br e ver se chega no Gmail.
5. **Cortar para o Worker** (fazer os dois em seguida, o site fica fora do ar entre eles):
   1. Você apaga os dois A (`@` e `www`) na Cloudflare.
   2. Eu descomento `routes` em `wrangler.jsonc`, faço o merge de `cloudflare` em `main` e rodo `npm run deploy`. O `custom_domain` cria os registros de `@` e `www` e o certificado.
6. **Regras de redirect na zona** (Rules > Redirect Rules, tipo "Static", 301):
   - www -> raiz: modelo "Redirect from WWW to root" (`https://www.*` -> `https://${1}`), preservando caminho e query.
   - Categorias antigas: quando a URL corresponder a `https://cursodearcondicionado.com.br/blog/?categoria=*`, redirecionar para `https://cursodearcondicionado.com.br/${1}/`, 301, **sem** preservar a query.
7. **Validar**: `npm run seo:snapshot https://cursodearcondicionado.com.br seo-prod.json` e comparar com `seo-baseline.json`; GA4 DebugView com `?debug_mode=true`; Clarity recebendo sessões; formulário de contato chegando no Gmail.
8. **Desligar a Vercel**: remover o domínio do projeto `cursodearcondi` e desconectar o repositório Git (senão cada push em `main` continua gerando build lá).

## Rollback

Antes do passo 5: nada a desfazer, a Vercel continua servindo.
Depois do passo 5: recriar na Cloudflare os A de `@` (216.198.79.65, 64.29.17.1) e `www` (216.198.79.65, 64.29.17.65) como "Somente DNS" e remover os custom domains do Worker (Workers & Pages > cursodearcondicionado > Settings > Domains). Enquanto a Vercel não for desligada (passo 8), ela continua respondendo.
