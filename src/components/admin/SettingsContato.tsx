/**
 * SettingsContato.tsx
 *
 * Componente React para configuração centralizada de telefone e WhatsApp.
 * Estes dados são usados em todo o site: Header, Footer, Home, Sobre, Contato,
 * LocationServicePage e schema JSON-LD (LocalBusiness).
 *
 * Centralizar em Configurações evita divergência quando o número aparece em vários lugares.
 * Salva em settings.yaml via PUT /api/admin/site-settings.
 */

import { useState, useEffect } from 'react';

export default function SettingsContato() {
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyWhatsapp, setCompanyWhatsapp] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/admin/site-settings')
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    const d = res.data;
                    const phone = (d.companyPhone as string)?.trim().replace(/\D/g, '') || '';
                    const whatsapp = (d.companyWhatsapp as string)?.trim().replace(/\D/g, '') || '';
                    // Migração: se vazio, preencher com sugeridos (de local/home)
                    setCompanyPhone(phone || (d.suggestedCompanyPhone as string) || '');
                    setCompanyWhatsapp(whatsapp || (d.suggestedCompanyWhatsapp as string) || '');
                }
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    async function handleSave() {
        setSaving(true);
        setSaveStatus('idle');
        try {
            const res = await fetch('/api/admin/site-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyPhone: companyPhone.replace(/\D/g, ''),
                    companyWhatsapp: companyWhatsapp.replace(/\D/g, ''),
                }),
            });
            const data = await res.json();
            setSaveStatus(data.success ? 'success' : 'error');
            if (data.success) {
                setCompanyPhone((v) => v.replace(/\D/g, ''));
                setCompanyWhatsapp((v) => v.replace(/\D/g, ''));
            }
        } catch {
            setSaveStatus('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    }

    if (!loaded) {
        return (
            <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>
                Carregando...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.2)',
            }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                    Telefone e WhatsApp configurados aqui aparecem em todo o site: Header, Footer, páginas de contato,
                    LocationServicePage e no schema JSON-LD para SEO local. Um único lugar para manter sempre atualizado.
                </p>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a3a3a3', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Telefone (somente dígitos)
                </label>
                <input
                    type="tel"
                    value={companyPhone}
                    onChange={e => setCompanyPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="11999999999"
                    maxLength={15}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#e5e5e5',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                    }}
                />
                <p style={{ fontSize: '0.7rem', color: '#52525b', marginTop: '0.35rem' }}>
                    Formato: DDD + número. Ex: 11999999999 ou 21987654321
                </p>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a3a3a3', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    WhatsApp (somente dígitos)
                </label>
                <input
                    type="tel"
                    value={companyWhatsapp}
                    onChange={e => setCompanyWhatsapp(e.target.value.replace(/\D/g, ''))}
                    placeholder="11999999999"
                    maxLength={15}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#e5e5e5',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                    }}
                />
                <p style={{ fontSize: '0.7rem', color: '#52525b', marginTop: '0.35rem' }}>
                    Se for o mesmo número do telefone, preencha igual. Usado nos botões &quot;Chamar no WhatsApp&quot;.
                </p>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    background: saveStatus === 'success' ? '#16a34a' : saveStatus === 'error' ? '#dc2626' : 'var(--primary, #6366f1)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    border: 'none',
                    transition: 'all 0.15s',
                    alignSelf: 'flex-start',
                }}
            >
                {saving ? '⏳ Salvando...' : saveStatus === 'success' ? '✅ Salvo!' : saveStatus === 'error' ? '❌ Erro ao salvar' : '💾 Salvar'}
            </button>
        </div>
    );
}
