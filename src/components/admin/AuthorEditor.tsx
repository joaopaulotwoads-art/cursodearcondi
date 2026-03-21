/**
 * AuthorEditor.tsx
 * 
 * Componente React para edição de autores.
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface AuthorData {
    name: string;
    slug: string;
    role: string;
    avatar?: string;
    bio: string;
    email?: string;
    adminRole?: 'admin' | 'editor' | 'none';
}

interface Props {
    author?: AuthorData;
    currentUserRole?: 'admin' | 'editor';
}

export default function AuthorEditor({ author, currentUserRole }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [role, setRole] = useState('');
    const [avatar, setAvatar] = useState('');
    const [bio, setBio] = useState('');
    const [email, setEmail] = useState('');
    const [adminRole, setAdminRole] = useState<'admin' | 'editor' | 'none'>('none');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const isAdmin = currentUserRole === 'admin';

    useEffect(() => {
        setIsMounted(true);
        if (author) {
            setName(author.name || '');
            setSlug(author.slug || '');
            setRole(author.role || '');
            setAvatar(author.avatar || '');
            setBio(author.bio || '');
            setEmail(author.email || '');
            setAdminRole(author.adminRole || 'none');
        }
    }, [author]);

    // Gerar slug automaticamente do nome
    useEffect(() => {
        if (!author && name && !slug) {
            const generatedSlug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setSlug(generatedSlug);
        }
    }, [name, slug, author]);

    const handleSave = async () => {
        if (!name || !slug) {
            showToast('warning', 'Campos obrigatórios', 'Nome e slug são obrigatórios');
            return;
        }
        if (newPassword && newPassword.length < 6) {
            showToast('warning', 'Senha muito curta', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword && newPassword !== confirmPassword) {
            showToast('warning', 'Senhas não coincidem', 'Confirme a senha corretamente.');
            return;
        }

        setIsSaving(true);
        try {
            const url = author ? `/api/admin/authors/${author.slug}` : '/api/admin/authors';
            const method = author ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    slug,
                    role,
                    avatar,
                    bio,
                    email: email || undefined,
                    adminRole: isAdmin ? adminRole : undefined,
                    newPassword: (isAdmin && newPassword) ? newPassword : undefined,
                    newSlug: slug !== author?.slug ? slug : undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                showToast('success', 'Autor salvo!');
                setTimeout(() => { window.location.href = '/admin/authors'; }, 800);
            } else {
                showToast('error', 'Erro ao salvar', data.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('error', 'Erro ao salvar autor');
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'authors'); // Avatares vão para authors/

        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                setAvatar(data.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        }
    };

    if (!isMounted) {
        return (
            <div className="space-y-6" style={{ minHeight: '400px' }}>
                <div className="p-8 text-center">
                    <p className="text-[#a3a3a3]">Carregando editor...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6" style={{ minHeight: '400px' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        {author ? 'Editar Autor' : 'Novo Autor'}
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        {author ? `Editando: ${author.name}` : 'Crie um novo autor para seu blog'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.href = '/admin/authors'}
                        className="admin-btn admin-btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="admin-btn admin-btn-primary disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            Nome *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="admin-input"
                            placeholder="Nome do autor"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            Slug (ID) *
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="admin-input font-mono text-sm"
                            placeholder="slug-do-autor"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            Cargo
                        </label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="admin-input"
                            placeholder="Ex: Desenvolvedor, Escritor, etc."
                        />
                    </div>

                    {/* ── Acesso ao Painel (somente admin vê) ──────────── */}
                    {isAdmin && (
                        <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] space-y-4">
                            <h3 className="text-sm font-semibold text-[#737373] uppercase tracking-wider flex items-center gap-2">
                                <span>🔐</span> Acesso ao Painel Admin
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-[#a3a3a3] mb-1.5">E-mail (login)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="admin-input"
                                    placeholder="usuario@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#a3a3a3] mb-1.5">Permissão</label>
                                <select
                                    value={adminRole}
                                    onChange={e => setAdminRole(e.target.value as any)}
                                    className="admin-input"
                                >
                                    <option value="none">Sem acesso ao painel</option>
                                    <option value="editor">Editor — Posts, Páginas, Mídia</option>
                                    <option value="admin">Administrador — Acesso total</option>
                                </select>
                                <p className="text-xs text-[#525252] mt-1">
                                    Editor não acessa: Analytics, Pixels, Importar WordPress.
                                </p>
                            </div>

                            {adminRole !== 'none' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-[#a3a3a3] mb-1.5">
                                            {author ? 'Nova senha' : 'Senha *'}
                                        </label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="admin-input"
                                            placeholder={author ? 'Deixe vazio para manter' : 'Mín. 6 caracteres'}
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#a3a3a3] mb-1.5">Confirmar</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="admin-input"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            )}

                            {adminRole === 'none' && (
                                <p className="text-xs text-[#525252]">
                                    Este autor não poderá fazer login no painel.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            Bio
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={6}
                            className="admin-input resize-none"
                            placeholder="Biografia do autor..."
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="admin-card p-6">
                        <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                            Avatar
                        </h3>
                        {avatar && (
                            <img
                                src={avatar}
                                alt="Avatar preview"
                                className="w-full rounded-lg mb-4 border border-[rgba(255,255,255,0.08)]"
                            />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="admin-input text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#3b82f6] file:text-white hover:file:bg-[#2563eb] cursor-pointer"
                        />
                        {avatar && (
                            <input
                                type="text"
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                                className="admin-input text-xs font-mono mt-2"
                                placeholder="URL da imagem"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
