/**
 * MediaLibraryPage.tsx
 *
 * Página completa para gerenciar a biblioteca de mídia.
 * Permite visualizar, fazer upload, deletar e usar imagens.
 * Suporta seleção múltipla para deleção em lote.
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface MediaItem {
    id: string;
    filename: string;
    url: string;
    type?: string;
    size: number;
    sizeFormatted: string;
    createdAt: string;
    modifiedAt: string;
}

export default function MediaLibraryPage() {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadType, setUploadType] = useState<'posts' | 'authors' | 'themes' | 'general'>('general');
    const [filterType, setFilterType] = useState<string>('all');
    const [isMounted, setIsMounted] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingMultiple, setDeletingMultiple] = useState(false);
    const { toasts, showToast: showToastNew, removeToast } = useToast();

    useEffect(() => {
        setIsMounted(true);
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/media');
            const data = await response.json();
            if (data.success) {
                setMedia(data.media || []);
            } else {
                console.error('Erro ao carregar mídia:', data.error);
            }
        } catch (error) {
            console.error('Erro ao carregar mídia:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadType); // Enviar tipo selecionado

        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                await fetchMedia();
                showToast('success', 'Imagem enviada com sucesso!');
            } else {
                showToast('error', 'Erro no upload', data.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const openDeleteModal = (item: MediaItem) => {
        setDeleteTarget(item);
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
    };

    const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
        showToastNew(type, title, message);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        if (deleteTarget.id === '__multiple__') {
            await handleDeleteMultiple();
            return;
        }

        const item = deleteTarget;

        try {
            // Extrair apenas o nome do arquivo da URL se necessário
            let filenameToDelete = item.filename;
            
            // Se o filename contém caminho, extrair apenas o nome
            if (filenameToDelete.includes('/')) {
                filenameToDelete = filenameToDelete.split('/').pop() || filenameToDelete;
            }
            
            console.log('🗑️ Deletando:', { 
                filename: filenameToDelete, 
                type: item.type,
                originalFilename: item.filename,
                url: item.url 
            });
            
            // Construir URL com tipo se disponível
            // Garantir que o filename está limpo (sem caracteres especiais problemáticos)
            const cleanFilename = filenameToDelete.trim();
            const encodedFilename = encodeURIComponent(cleanFilename);
            const url = item.type 
                ? `/api/admin/media/${encodedFilename}?type=${item.type}`
                : `/api/admin/media/${encodedFilename}`;
            
            console.log('📡 URL da requisição:', url);
            console.log('📋 Dados completos:', {
                cleanFilename,
                encodedFilename,
                type: item.type,
                fullUrl: window.location.origin + url
            });
            
            const response = await fetch(url, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📥 Resposta da API:', data);
            
            if (data.success) {
                await fetchMedia();
                if (selectedMedia?.id === item.id) {
                    setSelectedMedia(null);
                }
                closeDeleteModal();
            } else {
                console.error('❌ Erro na resposta:', data);
                showToast('error', 'Erro ao deletar', data.error || 'Erro desconhecido');
            }
        } catch (error: any) {
            console.error('❌ Erro ao deletar:', error);
            const errorMessage = error.message || 'Erro desconhecido';
            showToast(
                'error',
                'Erro ao deletar',
                errorMessage.includes('Failed to fetch')
                    ? 'Servidor não está respondendo'
                    : 'Verifique o console para mais detalhes'
            );
        }
    };

    const copyUrlToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        showToast('info', 'URL copiada!', 'Pronta para colar');
    };

    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllFiltered = () => {
        const ids = new Set(filteredMedia.map((m) => m.id));
        setSelectedIds(ids);
    };

    const clearSelection = () => setSelectedIds(new Set());

    const selectedItems = media.filter((m) => selectedIds.has(m.id));

    const openDeleteMultipleModal = () => {
        if (selectedItems.length === 0) return;
        setDeleteTarget({ ...selectedItems[0], id: '__multiple__' } as MediaItem);
        setDeleteModalOpen(true);
    };

    const handleDeleteMultiple = async () => {
        if (selectedItems.length === 0) return;
        setDeletingMultiple(true);
        let success = 0;
        let failed = 0;
        for (const item of selectedItems) {
            try {
                let filenameToDelete = item.filename;
                if (filenameToDelete.includes('/')) filenameToDelete = filenameToDelete.split('/').pop() || filenameToDelete;
                const encodedFilename = encodeURIComponent(filenameToDelete.trim());
                const url = item.type ? `/api/admin/media/${encodedFilename}?type=${item.type}` : `/api/admin/media/${encodedFilename}`;
                const res = await fetch(url, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) success++;
                else failed++;
            } catch {
                failed++;
            }
        }
        setDeletingMultiple(false);
        setDeleteModalOpen(false);
        setDeleteTarget(null);
        setSelectedIds(new Set());
        setSelectedMedia(null);
        await fetchMedia();
        if (failed > 0) showToast('warning', 'Concluído', `${success} removido(s). ${failed} falha(s).`);
        else showToast('success', 'Removidas', `${success} mídia(s) excluída(s)`);
    };

    const filteredMedia = media.filter(item => {
        const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    if (!isMounted) {
        return (
            <div className="space-y-6" style={{ minHeight: '400px' }}>
                <div className="p-8 text-center">
                    <p className="text-[#a3a3a3]">Carregando biblioteca de mídia...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-[#e5e5e5] mb-2">
                        Biblioteca de Mídia
                    </h1>
                    <p className="text-[#a3a3a3]">
                        Gerencie todas as imagens do seu site
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded text-sm transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-[#1a1a1a] text-[#e5e5e5]'
                                    : 'text-[#a3a3a3] hover:text-[#e5e5e5]'
                            }`}
                            title="Visualização em grade"
                        >
                            ⬜ Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded text-sm transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-[#1a1a1a] text-[#e5e5e5]'
                                    : 'text-[#a3a3a3] hover:text-[#e5e5e5]'
                            }`}
                            title="Visualização em lista"
                        >
                            ☰ Lista
                        </button>
                    </div>

                    {/* Tipo de Upload */}
                    <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value as any)}
                        className="px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] text-sm focus:outline-none focus:border-[#3b82f6]"
                    >
                        <option value="general">Geral</option>
                        <option value="posts">Posts</option>
                        <option value="authors">Autores</option>
                        <option value="themes">Temas</option>
                    </select>

                    {/* Upload Button */}
                    <label className="admin-btn admin-btn-primary cursor-pointer">
                        {uploading ? 'Enviando...' : '📤 Enviar Imagem'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {/* Barra de seleção múltipla */}
            {selectedIds.size > 0 && (
                <div className="admin-card p-4 flex items-center justify-between gap-4">
                    <span className="text-[#e5e5e5]">
                        <strong>{selectedIds.size}</strong> selecionada(s)
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={selectAllFiltered}
                            className="admin-btn admin-btn-ghost text-sm"
                        >
                            Selecionar todas (filtradas)
                        </button>
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="admin-btn admin-btn-ghost text-sm"
                        >
                            Desmarcar todas
                        </button>
                        <button
                            type="button"
                            onClick={openDeleteMultipleModal}
                            className="admin-btn bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm"
                        >
                            🗑️ Deletar selecionadas
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Filter Bar */}
            <div className="admin-card p-4">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍 Buscar imagens..."
                        className="admin-input flex-1"
                    />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6]"
                    >
                        <option value="all">Todos os tipos</option>
                        <option value="general">Geral</option>
                        <option value="posts">Posts</option>
                        <option value="authors">Autores</option>
                        <option value="themes">Temas</option>
                    </select>
                </div>
            </div>

            {/* Media Grid/List */}
            {loading ? (
                <div className="admin-card p-12 text-center">
                    <p className="text-[#a3a3a3]">Carregando imagens...</p>
                </div>
            ) : filteredMedia.length === 0 ? (
                <div className="admin-card p-12 text-center">
                    <p className="text-6xl mb-4">📷</p>
                    <p className="text-xl font-semibold text-[#e5e5e5] mb-2">
                        {searchQuery ? 'Nenhuma imagem encontrada' : 'Nenhuma imagem encontrada'}
                    </p>
                    <p className="text-[#a3a3a3] mb-6">
                        {searchQuery ? 'Tente uma busca diferente' : 'Faça upload de imagens para começar'}
                    </p>
                    {!searchQuery && (
                        <label className="admin-btn admin-btn-primary cursor-pointer inline-block">
                            📤 Fazer Upload
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMedia.map((item) => (
                        <div
                            key={item.id}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedIds.has(item.id) ? 'border-[#3b82f6] ring-2 ring-[#3b82f6]/30' :
                                selectedMedia?.id === item.id ? 'border-primary' : 'border-white/10 hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedMedia(item)}
                        >
                            {/* Checkbox de seleção */}
                            <div
                                className="absolute top-2 left-2 z-10 w-6 h-6 rounded bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/80"
                                onClick={(e) => toggleSelect(item.id, e)}
                            >
                                {selectedIds.has(item.id) ? (
                                    <span className="text-white text-sm">✓</span>
                                ) : (
                                    <span className="text-white/50 text-xs">☐</span>
                                )}
                            </div>
                            <div className="aspect-square bg-[#0a0a0a] flex items-center justify-center">
                                <img
                                    src={item.url}
                                    alt={item.filename}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyUrlToClipboard(item.url);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#222222] transition-colors"
                                        title="Copiar URL"
                                    >
                                        📋 Copiar URL
                                    </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteModal(item);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors"
                                    title="Deletar"
                                >
                                    🗑️ Deletar
                                </button>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                <p className="text-xs text-white truncate font-medium">
                                    {item.filename}
                                </p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-[#a3a3a3]">
                                        {item.sizeFormatted}
                                    </p>
                                    {item.type && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6]">
                                            {item.type}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {selectedMedia?.id === item.id && (
                                <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredMedia.map((item) => (
                        <div
                            key={item.id}
                            className={`admin-card p-4 flex items-center gap-4 cursor-pointer transition-all ${
                                selectedIds.has(item.id) ? 'border-2 border-[#3b82f6] bg-[#3b82f6]/10' :
                                selectedMedia?.id === item.id ? 'border-2 border-primary bg-primary/10' : 'hover:bg-white/5'
                            }`}
                            onClick={() => setSelectedMedia(item)}
                        >
                            {/* Checkbox seleção - modo lista */}
                            <div
                                className="w-6 h-6 flex-shrink-0 rounded bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/60"
                                onClick={(e) => toggleSelect(item.id, e)}
                            >
                                {selectedIds.has(item.id) ? (
                                    <span className="text-white text-sm">✓</span>
                                ) : (
                                    <span className="text-white/50 text-xs">☐</span>
                                )}
                            </div>
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                                <img
                                    src={item.url}
                                    alt={item.filename}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-[#e5e5e5] truncate">
                                        {item.filename}
                                    </p>
                                    {item.type && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6]">
                                            {item.type}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[#a3a3a3] mt-1">
                                    {item.sizeFormatted} • {new Date(item.modifiedAt).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-xs text-[#737373] mt-1 font-mono truncate">
                                    {item.url}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyUrlToClipboard(item.url);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] text-xs font-semibold hover:text-white hover:bg-[#222222] transition-colors"
                                    title="Copiar URL"
                                >
                                    📋
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteModal(item);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors"
                                    title="Deletar"
                                >
                                    🗑️
                                </button>
                                {selectedMedia?.id === item.id && (
                                    <div className="text-primary text-xl">✓</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de confirmação de deleção de mídia */}
            {deleteModalOpen && deleteTarget && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal">
                        <div className="admin-modal-header">
                            <div className="admin-modal-icon">
                                <span>✖</span>
                            </div>
                            <div>
                                <div className="admin-modal-title">
                                    {deleteTarget.id === '__multiple__' ? 'Excluir mídias selecionadas' : 'Excluir mídia'}
                                </div>
                            </div>
                        </div>
                        <div className="admin-modal-body">
                            {deleteTarget.id === '__multiple__' ? (
                                <>
                                    <p>
                                        Tem certeza que deseja excluir <strong>{selectedItems.length}</strong> arquivo(s)?
                                    </p>
                                    <small>
                                        Esta ação é permanente e não poderá ser desfeita.
                                    </small>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Tem certeza que deseja excluir o arquivo "{deleteTarget.filename}"?
                                    </p>
                                    <small>
                                        Esta ação é permanente e não poderá ser desfeita. Verifique se o arquivo não está sendo usado em posts importantes.
                                    </small>
                                </>
                            )}
                        </div>
                        <div className="admin-modal-footer">
                            <button
                                type="button"
                                className="admin-modal-btn admin-modal-btn-cancel"
                                onClick={closeDeleteModal}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="admin-modal-btn admin-modal-btn-danger"
                                onClick={handleDelete}
                                disabled={deletingMultiple}
                            >
                                {deletingMultiple ? 'Excluindo...' : deleteTarget.id === '__multiple__' ? `Excluir ${selectedItems.length} arquivo(s)` : 'Excluir arquivo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastList toasts={toasts} onRemove={removeToast} />

            {/* Sidebar de Detalhes */}
            {selectedMedia && (
                <div className="admin-card p-6 mt-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Detalhes da Imagem
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <img
                                src={selectedMedia.url}
                                alt={selectedMedia.filename}
                                className="w-full h-64 object-contain rounded-lg border border-white/10 mb-4"
                            />
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                    Nome do Arquivo
                                </label>
                                <p className="text-[#e5e5e5] font-mono text-xs break-all">
                                    {selectedMedia.filename}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                    URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={selectedMedia.url}
                                        readOnly
                                        className="admin-input text-xs font-mono flex-1"
                                    />
                                    <button
                                        onClick={() => copyUrlToClipboard(selectedMedia.url)}
                                        className="admin-btn admin-btn-secondary text-xs whitespace-nowrap"
                                    >
                                        📋 Copiar
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                        Tamanho
                                    </label>
                                    <p className="text-[#e5e5e5]">{selectedMedia.sizeFormatted}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                        Modificado
                                    </label>
                                    <p className="text-[#e5e5e5]">
                                        {new Date(selectedMedia.modifiedAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={() => openDeleteModal(selectedMedia)}
                                    className="w-full admin-btn bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                >
                                    🗑️ Deletar Imagem
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="admin-card p-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#a3a3a3]">
                        Total: <span className="text-[#e5e5e5] font-semibold">{media.length}</span> imagens
                    </span>
                    {searchQuery && (
                        <span className="text-[#a3a3a3]">
                            Mostrando: <span className="text-[#e5e5e5] font-semibold">{filteredMedia.length}</span> resultados
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
