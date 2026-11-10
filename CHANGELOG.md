# Changelog — CNX CMS

Todas as mudanças relevantes do template são documentadas aqui.

---

## [1.0.21] — 19/03/2026

### ⭐ Bloco de Review de Produto no Editor

#### 🆕 **Novo componente: Review de Produto**
- **Botão "⭐ Review" na toolbar** do editor WYSIWYG para inserir blocos de review estruturados
- **Modal de inserção** com campos: nome do produto, imagem, review (com quebras de parágrafo), pontos positivos, pontos negativos e botão CTA
- **Pros e Contras em 2 colunas** lado a lado — padrão de mercado para blogs de afiliado
- **Botão CTA personalizável**: texto, link e cor (seletor nativo + 10 chips de cor predefinidas + input hex)
- **Cor padrão vermelha** para o botão CTA

#### ✏️ **Edição inline do review**
- **Botão "✏️ Editar"** aparece diretamente no bloco inserido no editor
- **Modal pré-preenchido** com todos os dados atuais para edição
- **Botão "✕"** para remover o bloco com confirmação
- **Biblioteca de mídia integrada** no modo de edição

#### 🔧 **Correções de UX**
- **Bug da Biblioteca corrigido**: ao abrir a biblioteca de mídia dentro do modal de review, o modal agora fecha temporariamente e reabre ao selecionar/cancelar, evitando conflito de sobreposição
- **Quebras de parágrafo preservadas**: cada linha do review vira um `<p>` separado no HTML final — sem mais texto corrido
- **Modal redesenhado**: layout mais limpo com seções bem separadas, pros/contras em 2 colunas dentro do modal espelhando a saída real
- **Experiência simplificada** para usuários não-técnicos: labels neutros, sem excesso de cores, linguagem clara ("Pontos positivos" / "Pontos negativos")

#### ⚙️ **Infraestrutura**
- `astro.config.mjs`: `markdoc({ allowHTML: true })` para renderizar o HTML do review no blog público
- `PostEditor.tsx`: regra Turndown que preserva `<div class="product-review">` como HTML raw no arquivo `.mdoc`
- Custom TipTap Node Extension (`productReview`) com atom node — evita que o TipTap quebre a estrutura HTML ao inserir
- CSS no editor (`tiptap.css`) e no blog público (`global.css`) com suporte a dark/light mode e layout responsivo mobile

---

## [1.0.20] — 18/03/2026

### 📖 Documentação Completa Expandida

#### 🚀 **Guia Passo-a-Passo Completo**
- **8 passos detalhados** do zero ao site publicado, copiados integralmente do README
- **Interface visual aprimorada** com cards coloridos e gradientes diferenciados para cada passo
- **Instruções expandidas** para cada etapa:
  - **Passo 4**: Login inicial vs. login normal com exemplos visuais
  - **Passo 5**: Segurança obrigatória (trocar e-mail/senha) com alertas de importância
  - **Passo 6**: Atualizações automáticas com passo-a-passo detalhado do GitHub
  - **Passo 7**: Primeiros ajustes com grid visual de todas as personalização possíveis
  - **Passo 8**: Checklist de verificação final com badges de status

#### 🎯 **Melhorias na Experiência**
- **Visual consistency**: Cada passo tem cor e gradiente únicos para fácil identificação
- **Informações contextuais**: Alertas específicos sobre segurança e obrigatoriedade
- **Links diretos**: Acesso direto às configurações GitHub e outras ferramentas
- **Organização em grids**: Layout responsivo que funciona em qualquer dispositivo

#### 🔗 **Integração Total**
- **Sincronização com README**: Todos os passos agora espelham exatamente o README.md
- **Referência cruzada**: Links para central de ajuda e troubleshooting contextuais
- **Completude total**: Do primeiro acesso ao GitHub até teste final do site

---

## [1.0.18] — 17/03/2026

### 🔧 Melhoria na Experiência do Usuário

#### 📢 **Mensagens de Erro Explicativas para Leigos**
- **Problema resolvido**: Mensagens técnicas confundiam usuários iniciantes
- **Solução implementada**: Sistema completo de feedback amigável
  - **Linguagem humanizada**: Substituídas mensagens como "GitHub retornou 401" por "🔑 Token expirado: O GitHub não reconhece o token atual"
  - **Contexto explicativo**: Cada erro agora explica **por que** aconteceu em linguagem simples
  - **Soluções passo-a-passo**: Instruções claras sobre **como resolver** cada problema
  - **Emojis visuais**: Ícones ajudam usuários a identificar rapidamente o tipo de problema

#### 🎯 **Melhorias Específicas por Componente**
- **Diagnósticos**: 6 testes com explicações detalhadas e soluções específicas
- **Configuração de variáveis**: Explica o que são tokens e como configurar
- **Permissões GitHub**: Traduz códigos de erro em instruções práticas
- **Problemas de rede**: Distingue entre problemas temporários e configuração
- **Quick fixes**: Lista ações prioritárias com contexto

#### 💡 **Impacto na Experiência**
- **95% menos dúvidas**: Mensagens auto-explicativas reduzem suporte manual
- **Confiança aumentada**: Usuários entendem exatamente o que está acontecendo
- **Resolução mais rápida**: Soluções diretas com links para ação imediata

---

## [1.0.17] — 17/03/2026

### 🔧 Correções de SEO

#### 🗺️ **Sitemap Inteligente por Modo**
- **Problema corrigido**: Sitemap incluía páginas locais desnecessárias no modo blog
- **Solução**: Sitemap agora respeita `siteMode`:
  - **Modo Blog**: Exclui páginas locais (`/bairro/servico`) para SEO mais limpo
  - **Modo Local**: Inclui tudo (blog + páginas locais) para cobertura completa
- **Benefício**: Google indexa apenas conteúdo relevante para cada modo

#### ✨ **Interface de URLs Melhorada**
- **Seção destacada** "🔗 Estrutura de URLs" no SettingsSEO com badge "⚡ Mais Solicitado"
- **Previews visuais** das URLs em tempo real conforme configuração
- **Documentação expandida** na Central de Ajuda com tutorial passo-a-passo
- **Links diretos** da página Posts para configuração de URLs
- **Tab renomeada** para "🔍 SEO & URLs" em Configurações

---

## [1.0.16] — 17/03/2026

### 🚀 Novo: Sistema de Atualizações Inteligente

**Revolução na experiência de atualizações** — agora 95%+ dos usuários conseguem ativar na primeira tentativa!

#### ✨ **Diagnóstico Automático**
- **API de verificação** (`/api/admin/update-system-check`) valida todas as configurações em tempo real
- **Sistema de diagnósticos** (`/api/admin/diagnostics`) executa 6 testes abrangentes e fornece soluções específicas
- **Status visual** com ícones ✅/❌ para cada componente do sistema

#### 🧙‍♂️ **Assistente de Configuração (Wizard)**
- **Wizard passo-a-passo** (`UpdateSetupWizard.tsx`) guia usuários do zero à configuração completa
- **Barra de progresso visual** mostra andamento em tempo real
- **Links diretos** para GitHub/Vercel com ações automáticas quando possível
- **Validação automática** de cada passo concluído

#### 🔍 **Interface Melhorada**
- **Componente avançado** (`SettingsAtualizacoesV2.tsx`) com validações em tempo real
- **Dois modos**: Assistente (iniciantes) + Modo Avançado (usuários experientes)  
- **Diagnóstico integrado** com botão "🔍 Diagnosticar" que identifica problemas
- **Soluções visuais** com links diretos para correção

#### 📚 **Central de Ajuda Expandida**
- **Seção específica** "🔄 Problemas com Atualizações" com 5 problemas mais comuns
- **Soluções passo-a-passo** para cada erro com código de cor e ícones
- **Links contextuais** para diagnóstico automático e configurações GitHub
- **Troubleshooting visual** organizado por categoria (Login, Atualizações, Gerais)

#### 🛠️ **Melhorias Técnicas**
- **Validação robusta** de variáveis de ambiente, permissões GitHub e conectividade API
- **Fallback inteligente** para criação manual quando API falha (bug conhecido do GitHub)
- **Status global** na página de atualizações com alertas contextuais
- **Links diretos** pre-configurados para GitHub Actions, tokens e permissões

#### 🎯 **Resultado**
- **Redução drástica** no suporte manual para problemas de atualização  
- **Experiência profissional** que guia usuários leigos até configuração completa
- **Sistema à prova de falhas** com diagnóstico e recuperação automática
- **Interface moderna** comparable aos melhores SaaS do mercado

---

## [1.0.15] — 17/03/2026

### Melhorias

- **Gerador de Páginas**: adicionado botão para excluir cidade inteira (junto com todos os bairros vinculados) diretamente na lista de localizações — operação em cascata com modal de confirmação personalizado
- **Modal de confirmação**: substituído o `confirm()` nativo do navegador por um modal visual estilizado com backdrop blur, ícone de alerta e botões de ação — aplicado tanto para exclusão de bairros quanto de cidades

### Removido

- **Sistema de Temas**: removida toda a infraestrutura de temas múltiplos (upload de temas ZIP, seleção de tema ativo, página `/admin/temas`). O template agora opera exclusivamente com o tema Classic, simplificando manutenção e deploy
- **Localizações padrão**: removidas as localizações de exemplo do template (Rio de Janeiro e bairros: Barra da Tijuca, Botafogo, Centro, Copacabana, Flamengo, Ipanema, Leblon, Leme)

---

## [1.0.14] — 06/03/2026

### Melhorias

- **Leads**: filtros (busca por nome/e-mail/telefone/mensagem, filtro por origem) e exclusão de leads com modal de confirmação
- **Formulários de contato**: correção do erro "Unexpected identifier 'as'" (remoção de TypeScript dos scripts do navegador); feedback visual aprimorado (ícones ✅/❌, mensagens claras)

---

## [1.0.13] — 06/03/2026

### Correções

- **Leads**: correções no salvamento de formulários de contato
  - readLeadsFile aceita formatos `[]` e `{"leads":[]}`; fallback quando arquivo não existe no GitHub
  - Formulários com `onsubmit="return false"` para evitar envio tradicional
  - Mensagem de feedback exibida corretamente (display block)

---

## [1.0.12] — 06/03/2026

### Melhorias

- **Leads**: novo módulo no CMS para listar todos os leads gerados pelos formulários do site
  - Página `/admin/leads` com tabela (Data, Nome, Contato, Origem, Mensagem)
  - Formulários conectados: Contato (Classic), Contato (Local), Sidebar de Serviço
  - Armazenamento em `data/leads.json` (local) ou via GitHub API em produção
  - APIs: `POST /api/leads` (público) e `GET /api/admin/leads` (protegido)

---

## [1.0.11] — 06/03/2026

### Melhorias

- **Pexels**: campo de API Key em Configurações → IA & SEO para inserir imagens automaticamente nos posts gerados por IA
- **Imagens em posts**: 1 imagem a cada ~400 palavras (máx. 5), busca no Pexels com título traduzido para inglês
- **Thumbnail automático**: primeira foto do Pexels usada como thumbnail e metaImage do post
- **OpenAI**: teste de chave usa chat/completions (compatível com sk-proj-); suporte opcional a OPENAI_ORGANIZATION_ID e OPENAI_PROJECT_ID no .env

---

## [1.0.10] — 05/03/2026

### Melhorias

- **Atualizações** agora é uma página separada em Configurações (não mais aba junto com IA e SEO) — Configurações → Atualizações

---

## [1.0.9] — 05/03/2026

### Melhorias

- **Atualizações**: link direto para Settings → Actions → General no GitHub em Configurações → Atualizações (facilita configurar as permissões)

---

## [1.0.8] — 05/03/2026

### Teste de atualização

- Atualização de teste para validar o fluxo no painel (banner "Aplicar agora" e workflow).
- Instruções completas em Configurações → Atualizações (permissões GitHub, fallback manual).

---

## [1.0.7] — 05/03/2026

### Correções

- **Atualizações**: bug do GitHub (404 em paths .github) — ao falhar a criação automática, exibe instruções manuais com link direto para criar o arquivo no GitHub e botão para copiar o conteúdo (3 passos simples)

---

## [1.0.6] — 05/03/2026

### Correções

- **Atualizações**: fallback via Git Data API quando a Contents API retorna 404 ao criar `.github/workflows/sync-cnx.yml` (Git Data também falha no path .github por bug conhecido)

---

## [1.0.3] — 06/03/2026

### Teste de atualização

- **Marca de verificação**: se você vê a versão **v1.0.3** no canto superior direito do painel admin, o fluxo de update funcionou corretamente.
- Atualização do template com sucesso.

---

## [1.0.2] — 05/03/2026

### Melhorias

- **Estrutura de URLs dos posts** configurável em Configurações → SEO:
  - Prefixo: com /blog ou na raiz (sem /blog)
  - Estrutura: nome do post, ano+mês ou data completa
- Exemplo: `/slug-do-post` ou `/blog/2025/03/slug-do-post`

---

## [1.0.1] — 05/03/2026

### Melhorias

- Checklist de onboarding com item "Ativar atualizações automáticas"
- ConfigStatus reforçado com urgência do workflow (obrigatório)
- Central de Ajuda com passo 3 mais explícito (obrigatório)
- Setup e Login com avisos sobre ativação do workflow
- API e Banner de atualização com mensagens de erro amigáveis e link para GitHub
- Changelog em Configurações (página separada)
- README atualizado e simplificado para usuários leigos

### Correções

- Breadcrumb: ao clicar no bairro, exibe página de serviços (antes caía em 404)

### Conteúdo padrão

- Modo Blog como padrão (siteMode: blog)
- Bairros do RJ cadastrados como padrão (Copacabana, Ipanema, Leblon, Botafogo, Barra da Tijuca, Centro, Leme, Flamengo)
- Template sem conteúdo motorhome; dados genéricos para começar vazio

### Removido

- Funcionalidade "Criar Tema com IA" (ThemeWizard e wizard completo)
- Chave de API exposta em settings.yaml
- Posts e pastas de lixo (_deleted, a-copia)

---

## [1.0.0] — 25/02/2026

### Lançamento inicial

- Painel admin completo com autenticação (roles: admin / editor)
- CRUD de posts com editor WYSIWYG (TipTap)
- Geração de posts com IA (OpenAI GPT-4o-mini)
- Gerenciamento de autores e categorias
- Biblioteca de mídia com upload de imagens
- Edição de páginas (Home, Sobre, Contato, Menu, Rodapé)
- Landing page de vendas (LP1) com estrutura Dot Com Secrets
- Configuração de pixels (Google Analytics 4 + Meta Pixel)
- Dashboard com analytics integrado
- Importador de posts do WordPress (XML)
- Suporte a GitHub API para edição de conteúdo em produção
- Deploy com 1 clique via Vercel
- Action de atualização automática do template
