# CNX CMS — Seu site profissional em minutos

CMS moderno feito com **Astro**, deploy grátis na **Vercel**.  
Sem banco de dados. Sem servidor. Você é dono de tudo.

---

## 📌 Em 30 segundos: o que você vai fazer

1. **Criar contas** → GitHub + Vercel (grátis)
2. **Gerar um token** → No GitHub (copiar e guardar)
3. **Clicar no botão** → Deploy com Vercel
4. **Preencher 4 variáveis** → Nome do projeto, senha, token, seu usuário
5. **Acessar o painel** → Criar sua conta OU fazer login
6. **Ativar atualizações** → No GitHub (obrigatório, 1 minuto)
7. **Personalizar** → Editar nome, logo, posts, páginas

> 📖 **Dúvidas?** Consulte a [Central de Ajuda com FAQ completo →](https://8linksapp-maker.github.io/cnx) ou **Ajuda** no menu do painel.

---

## 🚀 Deploy em 1 clique

Clique no botão abaixo para começar. Seu site estará no ar em **menos de 5 minutos**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F8linksapp-maker%2Fcnx&env=ADMIN_SECRET,GITHUB_TOKEN,GITHUB_OWNER,GITHUB_REPO&envDescription=ADMIN_SECRET%3A%20sua%20senha%20(login%3A%20admin%40admin.com%20%2B%20este%20valor)%20%7C%20GITHUB_TOKEN%3A%20gere%20em%20github.com%2Fsettings%2Ftokens%20marcando%20%22repo%22%20%7C%20GITHUB_OWNER%3A%20seu%20usu%C3%A1rio%20do%20GitHub%20%7C%20GITHUB_REPO%3A%20nome%20do%20projeto%20escolhido%20acima&envLink=https%3A%2F%2Fgithub.com%2F8linksapp-maker%2Fcnx%23-vari%C3%A1veis-de-ambiente&project-name=meu-site-cnx&repository-name=meu-site-cnx)

> ⚠️ **Antes de clicar:** faça o Passo 2 (gerar token). Você vai precisar dele durante o deploy.

---

## 📋 Guia completo — do zero ao site no ar

Siga os passos **em ordem**. Cada um leva menos de 2 minutos.

---

### ✅ Passo 1 — Criar duas contas gratuitas

| Serviço | Para que serve | Link |
|---|---|---|
| **GitHub** | Guarda o código do seu site | [Criar conta no GitHub](https://github.com/signup) |
| **Vercel** | Publica o site na internet | [Criar conta na Vercel](https://vercel.com/signup) |

> 💡 **Dica:** Na Vercel, clique em **"Continue with GitHub"** — as duas contas ficarão conectadas.

---

### ✅ Passo 2 — Gerar o GITHUB_TOKEN (antes do deploy)

Você vai precisar desse token durante o deploy. **Faça isso agora.**

1. Acesse: [github.com/settings/tokens/new](https://github.com/settings/tokens/new?description=CNX+CMS&scopes=repo)  
   *(o link já abre com as opções certas)*
2. O campo **"Note"** pode ficar como está (ex: CNX CMS)
3. Role a página até o final e clique em **"Generate token"**
4. **Copie o token** (começa com `ghp_...`) — você só verá ele **uma vez** ⚠️

> Guarde o token em um bloco de notas. Você vai colar no próximo passo.

---

### ✅ Passo 3 — Fazer o deploy (copiar o template)

1. Clique no botão **"Deploy with Vercel"** no topo desta página
2. Faça login com sua conta do GitHub (se pedir)
3. Escolha um **nome para o projeto** (ex: `meu-site-cnx`)  
   — **Anote este nome.** Você vai precisar dele.
4. Preencha as 4 variáveis na tela:

| Variável | O que colocar | Exemplo |
|---|---|---|
| `ADMIN_SECRET` | Uma senha que você escolhe (será usada para entrar no painel) | `minhasenha2025` |
| `GITHUB_TOKEN` | O token que você copiou no Passo 2 | `ghp_abc123...` |
| `GITHUB_OWNER` | Seu usuário do GitHub (clique na sua foto no canto do GitHub para ver) | `joao-silva` |
| `GITHUB_REPO` | O **mesmo nome** do projeto que você digitou acima | `meu-site-cnx` |

5. Clique em **Deploy** e aguarde cerca de 2 minutos

Quando aparecer a tela de sucesso, seu site já está no ar! 🎉

---

### ✅ Passo 4 — Acessar o painel e criar/fazer login

1. Acesse: `https://SEU-PROJETO.vercel.app/admin`  
   *(troque `SEU-PROJETO` pelo nome que você deu no deploy)*

2. Duas situações possíveis:

   **A) Tela "Configuração Inicial"** (primeira vez):
   - Preencha: Nome, E-mail, Senha e Confirme a senha
   - Clique em **"Criar conta e entrar"**
   - Pronto! Você já está logado.

   **B) Tela "Entrar no Painel"** (login):
   - **E-mail:** `admin@admin.com`
   - **Senha:** o valor que você colocou em `ADMIN_SECRET` no deploy
   - Clique em **"Entrar"**

3. Você verá o **Dashboard** do seu site.

---

### ✅ Passo 5 — Trocar e-mail e senha (segurança)

> ⚠️ Faça isso logo após o primeiro acesso.

1. No painel, clique em **Autores** no menu lateral
2. Clique no usuário **"Administrador"**
3. Altere **E-mail**, **Senha** e **Nome** para os seus
4. Clique em **Salvar**

A partir daí, use seu e-mail e senha para entrar.

---

### ✅ Passo 6 — Ativar atualizações automáticas ⚠️ OBRIGATÓRIO

**Este passo é essencial.** Sem ele, o botão "Aplicar agora" não funciona e você não receberá melhorias do template.

1. Acesse [github.com](https://github.com) e clique no **repositório** que foi criado no deploy
2. Clique em **Settings** (Configurações) — aba no topo
3. No menu da esquerda: **Actions** → **General**
4. Role até **"Workflow permissions"**
5. Marque **"Read and write permissions"**
6. Marque **"Allow GitHub Actions to create and approve pull requests"** ✓
7. Clique em **Save**

> Se pular este passo, ao tentar atualizar o template pelo painel você verá erro. Volte e ative as permissões.

**Guia detalhado:** No painel admin, vá em **Ajuda** → **Primeiros passos** (passo 3).

---

### ✅ Passo 7 — Primeiros ajustes no site

| O que fazer | Onde ir no painel |
|---|---|
| Alterar nome do site | **Páginas** → **Rodapé** (campo "Nome do site") |
| Adicionar logo | **Páginas** → **Menu** |
| Editar página inicial | **Páginas** → **Home** |
| Criar o primeiro post | **Posts** → **Novo Post** |
| Criar categorias | **Categorias** |
| Ver o site público | Acesse `https://SEU-PROJETO.vercel.app` |

---

### ✅ Passo 8 — Conferir se tudo funciona

| O que testar | Como testar |
|---|---|
| Site abre | Acesse `https://SEU-PROJETO.vercel.app` |
| Painel abre | Acesse `https://SEU-PROJETO.vercel.app/admin` |
| Login funciona | Use seu e-mail e senha |
| Criar post | **Posts** → **Novo Post** → Salvar |
| Post no blog | Acesse o blog após salvar |

---

## 🔄 Como receber atualizações do template

O CNX lança melhorias regularmente. Quando há novidade, você vê um **banner amarelo** no topo do painel com o botão **"🔄 Aplicar agora"**.

### Atualizar pelo painel (1 clique)

1. Acesse `https://SEU-SITE.vercel.app/admin`
2. Se houver atualização, aparecerá um banner amarelo no topo
3. Clique em **"🔄 Aplicar agora"**
4. Em cerca de 2 minutos o site será reconstruído ✅

> **Seu conteúdo (posts, imagens, páginas) não é alterado.** Só o código do template é atualizado.

### Atualização automática (segunda-feira às 9h)

Se você ativou o **Passo 6**, o sistema verifica atualizações toda segunda-feira e pode aplicar automaticamente.

### Atualizar manualmente pelo GitHub

1. Abra seu repositório no GitHub
2. Clique na aba **"Actions"**
3. Clique em **"🔄 Atualizar Template CNX"**
4. Clique em **"Run workflow"** → **"Run workflow"**

---

## 🖥️ O que você pode fazer no painel

| Seção | O que faz |
|---|---|
| **Dashboard** | Visão geral, checklist de primeiros passos, versão do template |
| **Posts** | Criar e editar artigos do blog |
| **Autores** | Gerenciar contas que acessam o painel |
| **Categorias** | Organizar posts por tema |
| **Mídia** | Fazer upload de imagens |
| **Páginas** | Editar Home, Sobre, Contato, Menu, Rodapé |
| **Configurações** | IA para conteúdo, SEO (sitemap, robots.txt), Contato (telefone/WhatsApp) |
| **Configurações → Changelog** | Ver o que mudou em cada versão do template |
| **Pixels** | Google Analytics e Meta Pixel |
| **Importar WordPress** | Trazer posts de um site WordPress |
| **Ajuda** | Guia completo e solução de problemas |

---

## ⚙️ Variáveis de ambiente (referência)

Configure em: **Vercel → Settings → Environment Variables**

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ADMIN_SECRET` | **Sim** | Senha de acesso ao painel. Use com o e-mail `admin@admin.com` até criar sua conta. |
| `GITHUB_TOKEN` | **Sim** | Token do GitHub (permissão `repo`) — permite salvar pelo painel em produção |
| `GITHUB_OWNER` | **Sim** | Seu usuário do GitHub |
| `GITHUB_REPO` | **Sim** | Nome do repositório (ex: `meu-site-cnx`) |
| `OPENAI_API_KEY` | Opcional | Chave da OpenAI para gerar posts com IA |

---

## 🛠️ Solução de Problemas

### O painel não aceita meu login

- Se ainda não trocou: use **E-mail** `admin@admin.com` e **Senha** = valor de `ADMIN_SECRET`
- Se o template veio com conta padrão: E-mail `admin@admin.com` e Senha `admin123`
- Troque a senha em **Autores** → Editar administrador

### Esqueci a senha

1. Vá em **Vercel** → seu projeto → **Settings** → **Environment Variables**
2. Edite `ADMIN_SECRET` e coloque uma nova senha
3. Salve e aguarde o redeploy (~1 min)
4. Entre com `admin@admin.com` e a nova senha

### Não consigo salvar posts (erro ao publicar)

As variáveis `GITHUB_TOKEN`, `GITHUB_OWNER` e `GITHUB_REPO` estão faltando ou incorretas.

1. **Vercel** → projeto → **Settings** → **Environment Variables**
2. Confira se as três variáveis existem e estão corretas
3. Se alterou algo, faça **Redeploy** no painel da Vercel

### "Aplicar agora" dá erro

Você precisa fazer o **Passo 6** — ativar as permissões do GitHub Actions.  
No painel: **Ajuda** → **Primeiros passos** → Passo 3.

### O site abre em branco ou erro 500

1. **Vercel** → projeto → **Deployments**
2. Clique no último deploy e veja os logs
3. Em geral o problema é variável de ambiente ausente ou incorreta

### Atualizações não chegam

- Confirme que fez o **Passo 6**
- No GitHub: aba **Actions** → se pedir para ativar, clique em **"I understand my workflows, go ahead and enable them"**

---

## 💻 Rodar localmente (para desenvolvedores)

```bash
# 1. Clonar o repositório
git clone https://github.com/SEU-USUARIO/SEU-REPO.git
cd SEU-REPO

# 2. Instalar dependências
bun install

# 3. Copiar variáveis
cp .env.example .env
# Edite o .env com suas variáveis

# 4. Iniciar o servidor
bun dev
```

- Site: **http://localhost:4321**
- Painel: **http://localhost:4321/admin**
- Login local: `admin@admin.com` / senha do `.env` (ou `admin123` no template padrão)

### Erro "EMFILE: too many open files"

```bash
ulimit -n 65536
bun dev
```

### Publicar alterações

```bash
git add .
git commit -m "descrição das alterações"
git push origin main
```

A Vercel detecta o push e republica o site em cerca de 1 minuto.

---

## 🛠️ Tecnologias

- **[Astro](https://astro.build)** — Framework web moderno
- **[Vercel](https://vercel.com)** — Hospedagem gratuita
- **[Tailwind CSS](https://tailwindcss.com)** — Estilização
- **[React](https://react.dev)** — Componentes do painel
- **[TipTap](https://tiptap.dev)** — Editor de texto rico

---

## 📄 Licença

MIT — use, modifique e distribua livremente.
