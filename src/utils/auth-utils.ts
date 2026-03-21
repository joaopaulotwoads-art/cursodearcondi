/**
 * auth-utils.ts
 *
 * Utilitários de autenticação: hash de senhas e sessões assinadas com HMAC.
 */

import crypto from 'node:crypto';

const SECRET = process.env.ADMIN_SECRET || 'dev_secret_cnx_cms_change_in_production';
const SESSION_DAYS = 7;

// ─── Senha ────────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
    return crypto.createHash('sha256').update('cnx:' + password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}

// ─── Sessão ───────────────────────────────────────────────────────────────────

export interface SessionUser {
    slug: string;
    name: string;
    adminRole: 'admin' | 'editor';
    exp: number;
}

export function createSession(user: Omit<SessionUser, 'exp'>): string {
    const payload: SessionUser = {
        ...user,
        exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
    return `${encoded}.${sig}`;
}

export function verifySession(token: string): SessionUser | null {
    try {
        const dotIdx = token.lastIndexOf('.');
        if (dotIdx === -1) return null;
        const encoded = token.slice(0, dotIdx);
        const sig = token.slice(dotIdx + 1);
        const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
        if (sig !== expected) return null;
        const payload: SessionUser = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        if (Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

// ─── Cookie helper ────────────────────────────────────────────────────────────

export const SESSION_COOKIE = 'admin_session';
export const COOKIE_OPTIONS = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
};
