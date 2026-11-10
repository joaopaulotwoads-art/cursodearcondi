/**
 * JWT OAuth2 para contas de serviço Google (GA4, Search Console, etc.).
 */
import crypto from 'node:crypto';

function base64url(str: string): string {
    return Buffer.from(str).toString('base64url');
}

export type ServiceAccountKey = {
    client_email: string;
    private_key: string;
};

export async function getGoogleAccessTokenFromServiceAccountKey(
    serviceAccount: ServiceAccountKey,
    scope: string
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(
        JSON.stringify({
            iss: serviceAccount.client_email,
            scope,
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: now + 3600,
        })
    );

    const signingInput = `${header}.${payload}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccount.private_key).toString('base64url');

    const jwt = `${signingInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Falha ao obter token de acesso');
    }
    return tokenData.access_token;
}
