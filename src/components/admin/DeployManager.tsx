/**
 * DeployManager.tsx — Banner no topo do admin que mostra status de deploy.
 *
 * Polla /api/admin/deploy a cada 15s. Estados:
 *   - up_to_date / loading: não renderiza nada
 *   - pending: banner amarelo "Você tem N alterações não publicadas" + botão Fazer Deploy
 *   - deploying: banner azul "Publicando no ar..." (~1-2min)
 *   - success: banner verde efêmero "Deploy iniciado!" (4s)
 *   - error: banner vermelho com Tentar novamente
 *   - snoozed: banner cinza "Aviso de deploy oculto por ~Xh"
 *   - not_configured: banner cinza explicando que falta DEPLOY_HOOK_URL
 *
 * Ícones inline (sem dependência externa).
 */
import React, { useEffect, useState } from 'react';

const Icon = {
    Rocket: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        </svg>
    ),
    Alert: () => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
    ),
    Check: () => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    ),
    Spinner: () => (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
            <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
    ),
    Clock: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
    ),
};

type Status = {
    hookConfigured: boolean;
    pendingCommits: number;
    building: boolean;
    lastCommitSha?: string;
    lastCommitMessage?: string;
    lastCommitAt?: string;
    lastDeployedSha?: string;
    lastDeployedAt?: string;
    error?: string;
};

type UiState = 'loading' | 'up_to_date' | 'pending' | 'deploying' | 'success' | 'error' | 'snoozed' | 'not_configured';

const SNOOZE_KEY = 'cms_deploy_snooze_until';
const SNOOZE_HOURS = 4;
const PENDING_BUILD_GRACE_MS = 4 * 60 * 1000;
const PENDING_DEPLOY_KEY = 'cms_pending_deploy';

function readPendingDeploy(): { sha: string; startedAt: number } | null {
    try {
        const raw = sessionStorage.getItem(PENDING_DEPLOY_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj?.sha || !obj?.startedAt) return null;
        return obj;
    } catch { return null; }
}
function writePendingDeploy(sha: string) { try { sessionStorage.setItem(PENDING_DEPLOY_KEY, JSON.stringify({ sha, startedAt: Date.now() })); } catch {} }
function clearPendingDeploy() { try { sessionStorage.removeItem(PENDING_DEPLOY_KEY); } catch {} }
function readSnooze(): number {
    try { const raw = sessionStorage.getItem(SNOOZE_KEY); if (!raw) return 0; const ts = parseInt(raw, 10); return Number.isFinite(ts) ? ts : 0; } catch { return 0; }
}
function writeSnooze(until: number) { try { sessionStorage.setItem(SNOOZE_KEY, String(until)); } catch {} }
function clearSnooze() { try { sessionStorage.removeItem(SNOOZE_KEY); } catch {} }

export default function DeployManager() {
    const [status, setStatus] = useState<Status | null>(null);
    const [ui, setUi] = useState<UiState>('loading');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [deployingNow, setDeployingNow] = useState(false);
    const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
    const [showSuccess, setShowSuccess] = useState(false);

    async function fetchStatus() {
        try {
            const r = await fetch('/api/admin/deploy', { credentials: 'include' });
            if (!r.ok) {
                if (r.status === 401) return;
                setUi('error');
                setErrorMsg('Não foi possível verificar status do deploy.');
                return;
            }
            const data = await r.json() as Status;
            setStatus(data);

            if (!data.hookConfigured) { setUi('not_configured'); return; }

            const pending = readPendingDeploy();
            if (pending) {
                const elapsed = Date.now() - pending.startedAt;
                const buildCompleted = data.lastDeployedSha && data.lastDeployedSha === pending.sha;
                const expired = elapsed > PENDING_BUILD_GRACE_MS;
                if (buildCompleted) {
                    clearPendingDeploy();
                    setDeployingNow(false);
                    if (data.pendingCommits > 0) { setUi('pending'); return; }
                    setUi('up_to_date');
                    return;
                }
                if (expired) {
                    clearPendingDeploy();
                    setDeployingNow(false);
                } else {
                    setUi('deploying');
                    return;
                }
            }

            const snoozeTs = readSnooze();
            if (snoozeTs > Date.now() && data.pendingCommits > 0 && !data.building) {
                setSnoozedUntil(snoozeTs);
                setUi('snoozed');
                return;
            }

            if (data.building) { setUi('deploying'); return; }
            if (data.pendingCommits > 0) { setUi('pending'); return; }
            setUi('up_to_date');
        } catch (e: any) {
            setUi('error');
            setErrorMsg(e?.message || 'Erro de conexão');
        }
    }

    useEffect(() => {
        fetchStatus();
        const id = setInterval(fetchStatus, 15_000);
        return () => clearInterval(id);
    }, []);

    async function triggerDeploy() {
        const targetSha = status?.lastCommitSha || '';
        if (targetSha) writePendingDeploy(targetSha);
        setDeployingNow(true);
        setUi('deploying');
        clearSnooze();
        setSnoozedUntil(0);
        try {
            const r = await fetch('/api/admin/deploy', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
            const data = await r.json();
            if (!r.ok) {
                clearPendingDeploy();
                setUi('error');
                setErrorMsg(data.error || 'Falha ao iniciar deploy.');
                setDeployingNow(false);
                return;
            }
            setShowSuccess(true);
            setTimeout(() => { setShowSuccess(false); fetchStatus(); }, 4000);
        } catch (e: any) {
            clearPendingDeploy();
            setUi('error');
            setErrorMsg(e?.message || 'Erro de conexão');
            setDeployingNow(false);
        }
    }

    function snooze() {
        const until = Date.now() + SNOOZE_HOURS * 60 * 60 * 1000;
        writeSnooze(until);
        setSnoozedUntil(until);
        setUi('snoozed');
    }
    function unsnooze() {
        clearSnooze();
        setSnoozedUntil(0);
        fetchStatus();
    }

    if (ui === 'loading' || ui === 'up_to_date') return null;

    if (showSuccess) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-emerald-700">
                <span className="text-emerald-600 shrink-0"><Icon.Check /></span>
                <p className="text-sm text-emerald-800 font-medium">Deploy iniciado! O site será atualizado em ~1 minuto.</p>
            </div>
        );
    }

    if (ui === 'not_configured') {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-slate-500">
                <span className="shrink-0"><Icon.Alert /></span>
                <p className="text-sm text-slate-700">
                    Deploy manual ainda não está configurado neste site. Contate o suporte para ativar.
                </p>
            </div>
        );
    }

    if (ui === 'error') {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-red-600">
                    <span className="shrink-0"><Icon.Alert /></span>
                    <div>
                        <p className="text-sm font-semibold text-red-800">Erro ao verificar deploy</p>
                        <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
                    </div>
                </div>
                <button onClick={fetchStatus} className="text-xs font-medium text-red-700 underline hover:text-red-900">Tentar novamente</button>
            </div>
        );
    }

    if (ui === 'deploying') {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-blue-600">
                <span className="shrink-0"><Icon.Spinner /></span>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">Publicando no ar...</p>
                    <p className="text-xs text-blue-700 mt-0.5">As alterações estarão visíveis em ~1 a 2 minutos. Você não precisa clicar de novo.</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (ui === 'snoozed') {
        const minsLeft = Math.max(1, Math.round((snoozedUntil - Date.now()) / 60000));
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="shrink-0"><Icon.Clock /></span>
                    <p className="text-xs text-slate-600">
                        Aviso de deploy oculto por ~{minsLeft >= 60 ? `${Math.round(minsLeft/60)}h` : `${minsLeft}min`}.
                        Suas alterações ainda não estão no ar.
                    </p>
                </div>
                <button onClick={unsnooze} className="text-xs font-medium text-violet-700 hover:text-violet-900 underline">Mostrar agora</button>
            </div>
        );
    }

    // pending
    const count = status?.pendingCommits ?? 0;
    const lastMsg = status?.lastCommitMessage ?? '';
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1 text-amber-600">
                <span className="shrink-0 mt-0.5"><Icon.Alert /></span>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">
                        {count === 1 ? 'Você tem 1 alteração não publicada' : `Você tem ${count} alterações não publicadas`}
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                        Para que apareçam no site, clique em <strong>Fazer Deploy</strong>.{lastMsg ? <span className="text-amber-700"> Última: "{lastMsg}"</span> : null}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button onClick={snooze} className="text-xs font-medium text-amber-700 hover:text-amber-900 px-3 py-2" title={`Esconder por ${SNOOZE_HOURS}h`}>
                    Lembrar depois
                </button>
                <button onClick={triggerDeploy} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors">
                    <Icon.Rocket />
                    Fazer Deploy
                </button>
            </div>
        </div>
    );
}
