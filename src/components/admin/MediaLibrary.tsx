/**
 * MediaLibrary.tsx
 * 
 * Componente React para biblioteca de mídia estilo WordPress.
 * Permite visualizar, selecionar e fazer upload de imagens.
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

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

export default function MediaLibrary({ isOpen, onClose, onSelect }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [uploadType, setUploadType] = useState<'posts' | 'authors' | 'themes' | 'general'>('general');

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
        }
    }, [isOpen]);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/media');
            const data = await response.json();
            if (data.success) {
                setMedia(data.media || []);
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
                setSelectedMedia(data.url);
                showToast('success', 'Imagem enviada com sucesso!');
            } else {
                showToast('error', 'Erro no upload', data.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        } finally {
            setUploading(false);
            // Resetar input
            e.target.value = '';
        }
    };

    const handleSelect = () => {
        if (selectedMedia) {
            onSelect(selectedMedia);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div 
                className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg w-full max-w-6xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.08)]">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                            Biblioteca de Mídia
                        </h2>
                        <p className="text-sm text-[#a3a3a3]">
                            {media.length} {media.length === 1 ? 'imagem' : 'imagens'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-[#1a1a1a] text-[#e5e5e5]'
                                        : 'text-[#a3a3a3] hover:text-[#e5e5e5]'
                                }`}
                                title="Visualização em grade"
                            >
                                ⬜
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
                                ☰
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

                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-[#0a0a0a] text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#111111] transition-colors"
                        >
                            ✕ Fechar
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-[#a3a3a3]">Carregando imagens...</p>
                        </div>
                    ) : media.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className="text-6xl mb-4">📷</p>
                            <p className="text-xl font-semibold text-[#e5e5e5] mb-2">
                                Nenhuma imagem encontrada
                            </p>
                            <p className="text-[#a3a3a3] mb-6">
                                Faça upload de imagens para começar
                            </p>
                            <div className="flex flex-col items-center gap-4">
                                <select
                                    value={uploadType}
                                    onChange={(e) => setUploadType(e.target.value as any)}
                                    className="px-4 py-2 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6]"
                                >
                                    <option value="general">Geral</option>
                                    <option value="posts">Posts</option>
                                    <option value="authors">Autores</option>
                                    <option value="themes">Temas</option>
                                </select>
                                <label className="admin-btn admin-btn-primary cursor-pointer">
                                    📤 Fazer Upload
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {media.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedMedia(item.url)}
                                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                        selectedMedia === item.url
                                            ? 'border-[#3b82f6]'
                                            : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
                                    }`}
                                >
                                    <div className="aspect-square bg-[#0a0a0a] flex items-center justify-center">
                                        <img
                                            src={item.url}
                                            alt={item.filename}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        {selectedMedia === item.url && (
                                            <div className="bg-[#3b82f6] text-white px-3 py-1 rounded-full text-sm font-semibold">
                                                ✓ Selecionado
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                        <p className="text-xs text-white truncate font-medium">
                                            {item.filename}
                                        </p>
                                        <p className="text-xs text-[#a3a3a3]">
                                            {item.sizeFormatted}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {media.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedMedia(item.url)}
                                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        selectedMedia === item.url
                                            ? 'border-[#3b82f6] bg-[#1a1a1a]'
                                            : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#111111]'
                                    }`}
                                >
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                                        <img
                                            src={item.url}
                                            alt={item.filename}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[#e5e5e5] truncate">
                                            {item.filename}
                                        </p>
                                        <p className="text-xs text-[#a3a3a3] mt-1">
                                            {item.sizeFormatted} • {new Date(item.modifiedAt).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    {selectedMedia === item.url && (
                                        <div className="text-[#3b82f6] text-xl">✓</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {selectedMedia && (
                    <div className="p-6 border-t border-[rgba(255,255,255,0.08)] bg-[#111111]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0a0a0a]">
                                    <img
                                        src={selectedMedia}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[#e5e5e5]">
                                        Imagem selecionada
                                    </p>
                                    <p className="text-xs text-[#a3a3a3] truncate max-w-md">
                                        {selectedMedia}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleSelect}
                                className="admin-btn admin-btn-primary"
                            >
                                ✓ Usar esta imagem
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <ToastList toasts={toasts} onRemove={removeToast} />
        </div>
    );
}
