/**
 * Caminhos absolutos para src/content/singletons, independentes do CWD.
 * Funciona com import.meta.url de qualquer arquivo sob src/ (pages, utils, etc.).
 * Se o bundle estiver em dist/ (sem /src/ no caminho), usa process.cwd().
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** src/content/singletons */
export function getSingletonsBaseDir(moduleUrl: string): string {
    try {
        const here = path.dirname(fileURLToPath(moduleUrl));
        const norm = here.replace(/\\/g, '/');
        const idx = norm.lastIndexOf('/src/');
        if (idx !== -1) {
            const srcRoot = norm.slice(0, idx + '/src'.length);
            return path.join(srcRoot, 'content', 'singletons');
        }
    } catch {
        /* fall through */
    }
    return path.resolve(process.cwd(), 'src', 'content', 'singletons');
}
