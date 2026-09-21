/**
 * github-api.ts
 *
 * Wrapper para a GitHub Contents API.
 * Em produção no Vercel o filesystem é read-only, então todas as escritas
 * de conteúdo (posts, autores, categorias, singletons) passam por aqui,
 * commitando diretamente no repositório GitHub.
 *
 * Vars de ambiente necessárias:
 *   GITHUB_TOKEN  — Personal Access Token com escopo "repo"
 *   GITHUB_OWNER  — usuário/org do GitHub (ex: 8linksapp-maker)
 *   GITHUB_REPO   — nome do repositório (ex: cnx)
 *   GITHUB_BRANCH — branch alvo (padrão: main)
 */

const TOKEN  = process.env.GITHUB_TOKEN;
const OWNER  = process.env.GITHUB_OWNER;
const REPO   = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

export function isGitHubConfigured(): boolean {
    return !!(TOKEN && OWNER && REPO);
}

function apiUrl(path: string) {
    return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
}

const headers = () => ({
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
});

// ─── Leitura ──────────────────────────────────────────────────────────────────

/** Retorna { content: string (utf-8), sha: string } ou null se não existir */
export async function githubReadFile(
    path: string,
): Promise<{ content: string; sha: string } | null> {
    const res = await fetch(`${apiUrl(path)}?ref=${BRANCH}`, {
        headers: headers(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub read ${path}: ${res.status}`);
    const data = await res.json() as { content: string; sha: string };
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content, sha: data.sha };
}

/** Lista arquivos em um diretório do repositório */
export async function githubListDirectory(
    dirPath: string,
): Promise<Array<{ name: string; path: string }>> {
    try {
        const res = await fetch(`${apiUrl(dirPath)}?ref=${BRANCH}`, { headers: headers() });
        if (!res.ok) return [];
        const data = await res.json() as Array<{ name: string; path: string; type: string }>;
        return Array.isArray(data) ? data.filter(f => f.type === 'file') : [];
    } catch {
        return [];
    }
}

/** SHA atual do arquivo (necessário para updates/deletes) */
export async function githubGetSha(path: string): Promise<string | null> {
    const file = await githubReadFile(path);
    return file ? file.sha : null;
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

/** Cria ou atualiza um arquivo de texto no repositório */
export async function githubWriteFile(
    path: string,
    content: string,
    message: string,
): Promise<boolean> {
    const existing = await githubReadFile(path);
    const body: Record<string, unknown> = {
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch: BRANCH,
    };
    if (existing) body.sha = existing.sha;

    const res = await fetch(apiUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body),
    });
    return res.ok || res.status === 201;
}

/** Cria ou atualiza um arquivo binário (Buffer) no repositório */
export async function githubWriteFileBuffer(
    path: string,
    buffer: Buffer,
    message: string,
): Promise<boolean> {
    const existing = await githubReadFile(path).catch(() => null);
    const body: Record<string, unknown> = {
        message,
        content: buffer.toString('base64'),
        branch: BRANCH,
    };
    if (existing) body.sha = existing.sha;

    const res = await fetch(apiUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body),
    });
    return res.ok || res.status === 201;
}

/** Deleta um arquivo do repositório */
export async function githubDeleteFile(
    path: string,
    message: string,
): Promise<boolean> {
    const sha = await githubGetSha(path);

    if (!sha) {
        console.warn(`⚠️ githubDeleteFile: arquivo não encontrado no GitHub — ${path} (branch: ${BRANCH}). Nada a excluir.`);
        return false;
    }

    const res = await fetch(apiUrl(path), {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({ message, sha, branch: BRANCH }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`❌ githubDeleteFile: falha ao excluir ${path} — HTTP ${res.status}: ${body}`);
    }

    return res.ok;
}
