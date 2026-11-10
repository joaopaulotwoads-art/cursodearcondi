/**
 * site-contact.ts
 *
 * Utilitário para obter telefone e WhatsApp centralizados.
 * Prioridade: settings.yaml (Configurações → Contato) > local/home.yaml (fallback).
 *
 * Usado por Header, Footer, Home, Sobre, Contato, LocationServicePage e LocalLayout.
 * Garante uma única fonte de verdade para evitar divergência de números.
 */

import { readSiteSettings } from './read-site-settings';
import { readSingleton } from './singleton-utils';

export interface SiteContactInfo {
    phone: string;
    whatsapp: string;
}

/** Telefone e WhatsApp formatados para exibição: (11) 99999-9999 */
export function formatPhone(digits: string): string {
    const d = String(digits || '').replace(/\D/g, '');
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return digits;
}

/**
 * Retorna phone e whatsapp priorizando settings.yaml.
 * Se settings estiver vazio, usa local/home.yaml como fallback.
 */
export async function getSiteContactInfo(): Promise<SiteContactInfo> {
    const settings = await readSiteSettings();
    const phoneFromSettings = (settings.companyPhone as string)?.trim().replace(/\D/g, '') || '';
    const whatsappFromSettings = (settings.companyWhatsapp as string)?.trim().replace(/\D/g, '') || '';

    if (phoneFromSettings || whatsappFromSettings) {
        return {
            phone: phoneFromSettings,
            whatsapp: whatsappFromSettings || phoneFromSettings,
        };
    }

    const localHome = await readSingleton('home', 'local');
    const phone = (localHome?.companyPhone as string)?.trim().replace(/\D/g, '') || '';
    const whatsapp = (localHome?.companyWhatsapp as string)?.trim().replace(/\D/g, '') || phone;
    return { phone, whatsapp };
}
