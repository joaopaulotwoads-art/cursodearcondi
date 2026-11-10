/**
 * ensure-workflow-core.ts
 *
 * Lógica compartilhada para garantir que .github/workflows/sync-cnx.yml existe
 * no repositório do usuário. Usado pelo prebuild e pela API do painel.
 *
 * O Deploy Button da Vercel não copia .github ao clonar — esta função corrige isso.
 *
 * Usa primeiro a Contents API (PUT). Se retornar 404 (restrição em .github),
 * faz fallback para a Git Data API (blob + tree + commit + ref).
 */

const TEMPLATE_RAW =
  'https://raw.githubusercontent.com/8linksapp-maker/cnx/main/.github/workflows/sync-cnx.yml';

export type EnsureWorkflowResult =
  | { ok: true; status: 'already_exists' }
  | { ok: true; status: 'created' }
  | { ok: false; error: string; manualFallback?: boolean };

const h = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
});

export async function ensureWorkflow(): Promise<EnsureWorkflowResult> {
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || 'main';

  if (!owner || !repo || !token) {
    return {
      ok: false,
      error: '🔧 Configuração necessária: Para ativar as atualizações automáticas, você precisa configurar as informações de conexão com o GitHub na Vercel (GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO). É um processo simples e seguro.',
    };
  }

  const workflowPath = '.github/workflows/sync-cnx.yml';
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    // 1) Verificar se já existe
    const encodedPath = workflowPath.split('/').map((p) => encodeURIComponent(p)).join('/');
    const checkRes = await fetch(`${apiBase}/contents/${encodedPath}?ref=${branch}`, {
      headers: h(token),
    });

    if (checkRes.ok) {
      return { ok: true, status: 'already_exists' };
    }

    if (checkRes.status !== 404) {
      const errBody = await checkRes.text();
      console.error('\x1b[31m✗ [X] Erro ao verificar workflow:\x1b[0m', checkRes.status, errBody);
      return {
        ok: false,
        error: `🔍 Problema de acesso: Não foi possível verificar o repositório (código ${checkRes.status}). Verifique se o token do GitHub está correto e tem permissões para acessar o repositório.`,
      };
    }

    // 2) Baixar template
    const contentRes = await fetch(TEMPLATE_RAW);
    if (!contentRes.ok) {
      console.error('\x1b[31m✗ [X] Erro ao buscar template:\x1b[0m', contentRes.status);
      return {
        ok: false,
        error: '📄 Problema temporário: Não foi possível baixar o arquivo de atualização. Tente novamente em alguns minutos.',
      };
    }
    const content = await contentRes.text();

    // 3) Tentar Contents API (PUT)
    const encoded = Buffer.from(content, 'utf-8').toString('base64');
    const putRes = await fetch(`${apiBase}/contents/${encodedPath}`, {
      method: 'PUT',
      headers: h(token),
      body: JSON.stringify({
        message: 'chore: adicionar workflow de atualização CNX',
        content: encoded,
        branch,
        committer: { name: 'CNX CMS', email: 'noreply@cnx.app' },
      }),
    });

    if (putRes.ok || putRes.status === 201) {
      return { ok: true, status: 'created' };
    }

    // 4) Se 404, usar Git Data API (bypassa restrições da Contents API para .github)
    if (putRes.status === 404) {
      return ensureWorkflowViaGitData(owner, repo, token, branch, content);
    }

    const errBody = await putRes.text();
    console.error('\x1b[31m✗ [X] Erro ao criar workflow:\x1b[0m', putRes.status, errBody);

    let errorMsg = `🚫 Erro do GitHub: O sistema retornou um erro (código ${putRes.status})`;
    try {
      const parsed = JSON.parse(errBody) as { message?: string };
      if (parsed?.message) {
        // Traduzir mensagens comuns do GitHub
        if (parsed.message.includes('Bad credentials')) {
          errorMsg = '🔑 Token inválido: O token do GitHub está incorreto ou expirado. Crie um novo token.';
        } else if (parsed.message.includes('Not Found')) {
          errorMsg = '📂 Repositório não encontrado: Verifique se GITHUB_OWNER e GITHUB_REPO estão corretos.';
        } else {
          errorMsg += `. Detalhes: ${parsed.message}`;
        }
      }
    } catch {}
    return { ok: false, error: errorMsg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('\x1b[31m✗ [X] Erro no ensure-workflow:\x1b[0m', e);
    return { ok: false, error: `🌐 Problema de conexão: ${msg.includes('network') || msg.includes('fetch') ? 'Verifique sua conexão com a internet e tente novamente.' : 'Ocorreu um erro inesperado. Tente novamente em alguns minutos.'}` };
  }
}

/** Fallback: cria .github/workflows/sync-cnx.yml via Git Data API (blob → tree → commit → ref). */
async function ensureWorkflowViaGitData(
  owner: string,
  repo: string,
  token: string,
  branch: string,
  content: string,
): Promise<EnsureWorkflowResult> {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = h(token);

  try {
    // 1) GET refs/heads/{branch}
    const refRes = await fetch(`${base}/git/ref/heads/${branch}`, { headers });
    if (!refRes.ok) {
      const t = await refRes.text();
      console.error('\x1b[31m✗ [X] Git Data: ref não encontrada:\x1b[0m', refRes.status, t);
      return { ok: false, error: `🌿 Problema com a branch: A branch '${branch}' não foi encontrada no repositório (código ${refRes.status}). Verifique se ela existe.` };
    }
    const refJson = (await refRes.json()) as { object?: { sha?: string } };
    const headSha = refJson?.object?.sha;
    if (!headSha) {
      return { ok: false, error: 'Resposta do GitHub inválida ao obter referência.' };
    }

    // 2) GET commit
    const commitRes = await fetch(`${base}/git/commits/${headSha}`, { headers });
    if (!commitRes.ok) {
      const t = await commitRes.text();
      console.error('\x1b[31m✗ [X] Git Data: commit não encontrado:\x1b[0m', commitRes.status, t);
      return { ok: false, error: `Erro ao obter commit. GitHub retornou ${commitRes.status}.` };
    }
    const commitJson = (await commitRes.json()) as { tree?: { sha?: string } };
    const treeSha = commitJson?.tree?.sha;
    if (!treeSha) {
      return { ok: false, error: 'Resposta do GitHub inválida ao obter árvore.' };
    }

    // 3) POST blob
    const blobRes = await fetch(`${base}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: Buffer.from(content, 'utf-8').toString('base64'),
        encoding: 'base64',
      }),
    });
    if (!blobRes.ok) {
      const t = await blobRes.text();
      console.error('\x1b[31m✗ [X] Git Data: blob:\x1b[0m', blobRes.status, t);
      return { ok: false, error: `Erro ao criar blob. GitHub retornou ${blobRes.status}.` };
    }
    const blobJson = (await blobRes.json()) as { sha?: string };
    const blobSha = blobJson?.sha;
    if (!blobSha) {
      return { ok: false, error: 'Resposta do GitHub inválida ao criar blob.' };
    }

    // 4) POST tree (base_tree + nosso arquivo)
    // NOTA: GitHub tem bug conhecido — paths com .github retornam 404 (community/discussions/144360)
    const treeRes = await fetch(`${base}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: treeSha,
        tree: [
          {
            path: '.github/workflows/sync-cnx.yml',
            mode: '100644',
            type: 'blob',
            sha: blobSha,
          },
        ],
      }),
    });
    if (!treeRes.ok) {
      const t = await treeRes.text();
      console.error('\x1b[31m✗ [X] Git Data: tree:\x1b[0m', treeRes.status, t);
      return {
        ok: false,
        error: `🌳 Problema ao organizar arquivos: O GitHub não conseguiu criar a estrutura necessária (código ${treeRes.status}). ${treeRes.status === 404 ? 'Este é um problema conhecido do GitHub com pastas .github.' : 'Tente novamente em alguns minutos.'}`,
        manualFallback: treeRes.status === 404,
      };
    }
    const treeResultJson = (await treeRes.json()) as { sha?: string };
    const newTreeSha = treeResultJson?.sha;
    if (!newTreeSha) {
      return { ok: false, error: 'Resposta do GitHub inválida ao criar árvore.' };
    }

    // 5) POST commit
    const newCommitRes = await fetch(`${base}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'chore: adicionar workflow de atualização CNX',
        tree: newTreeSha,
        parents: [headSha],
        author: { name: 'CNX CMS', email: 'noreply@cnx.app' },
        committer: { name: 'CNX CMS', email: 'noreply@cnx.app' },
      }),
    });
    if (!newCommitRes.ok) {
      const t = await newCommitRes.text();
      console.error('\x1b[31m✗ [X] Git Data: commit:\x1b[0m', newCommitRes.status, t);
      return { ok: false, error: `Erro ao criar commit. GitHub retornou ${newCommitRes.status}.` };
    }
    const newCommitJson = (await newCommitRes.json()) as { sha?: string };
    const newCommitSha = newCommitJson?.sha;
    if (!newCommitSha) {
      return { ok: false, error: 'Resposta do GitHub inválida ao criar commit.' };
    }

    // 6) PATCH ref
    const patchRefRes = await fetch(`${base}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    });
    if (!patchRefRes.ok) {
      const t = await patchRefRes.text();
      console.error('\x1b[31m✗ [X] Git Data: atualizar ref:\x1b[0m', patchRefRes.status, t);
      return { ok: false, error: `Erro ao atualizar branch. GitHub retornou ${patchRefRes.status}.` };
    }

    return { ok: true, status: 'created' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('\x1b[31m✗ [X] Erro no ensure-workflow (Git Data):\x1b[0m', e);
    return { ok: false, error: `🔧 Problema técnico: ${msg.includes('network') || msg.includes('fetch') ? 'Erro de conexão. Verifique sua internet e tente novamente.' : 'Ocorreu um erro inesperado durante a configuração. Tente novamente em alguns minutos.'}` };
  }
}
