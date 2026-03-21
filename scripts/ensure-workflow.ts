/**
 * ensure-workflow.ts
 *
 * Garante que o arquivo .github/workflows/sync-cnx.yml existe no repositório do usuário.
 * O Deploy Button da Vercel não copia a pasta .github ao clonar — este script corrige isso.
 *
 * Roda no prebuild. Se o arquivo não existir, cria via GitHub API.
 * Nunca quebra o build: em caso de erro, sai silenciosamente.
 */

import { ensureWorkflow } from '../src/utils/ensure-workflow-core';

async function main(): Promise<void> {
  const result = await ensureWorkflow();
  if (result.ok && result.status === 'created') {
    console.log('✅ Workflow .github/workflows/sync-cnx.yml criado com sucesso.');
  } else if (!result.ok) {
    console.error('\x1b[31m✗ [X] ensure-workflow:\x1b[0m', result.error);
  }
}

main().finally(() => process.exit(0));
