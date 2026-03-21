/**
 * AdminImagePreview.tsx
 *
 * Preview de imagem no admin com fallback para erro e suporte a Object URL.
 * - previewBlobUrl: exibe imediatamente o arquivo selecionado (antes do upload)
 * - src: URL final do servidor (persistida ao salvar)
 * - Fallback proxy: paths /images/... que falham → tenta /api/admin/image (raw.githubusercontent)
 * - Fallback local: quando tudo falha, exibe placeholder visual (SVG) para não quebrar a UI em demos
 */

import { useState, useEffect } from 'react';

/** Placeholder SVG — exibido quando a imagem não carrega (local, GitHub sem deploy). Funciona offline. */
const PLACEHOLDER_IMG =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMTIiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAxMTIgODAiPjxyZWN0IHdpZHRoPSIxMTIiIGhlaWdodD0iODAiIGZpbGw9IiMyYTJhMmEiIHJ4PSI0Ii8+PHBhdGggZD0iTTU2IDMyYTggOCAwIDEgMCAwIDE2IDggOCAwIDAgMCAwLTE2em0wIDEyYTQgNCAwIDEgMSAwLTggNCA0IDAgMCAxIDAgOHoiIGZpbGw9IiM1MjUyNTIiLz48Y2lyY2xlIGN4PSI1NiIgY3k9IjQwIiByPSIxMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNTI1MjUyIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1NiIgeT0iNjIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM3MzczNzMiIGZvbnQtc2l6ZT0iOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPmltYWdlbTwvdGV4dD48L3N2Zz4=';

interface Props {
    src: string;
    previewBlobUrl?: string | null;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
}

export default function AdminImagePreview({ src, previewBlobUrl, alt = 'Preview', className = '', style }: Props) {
    const [error, setError] = useState(false);
    const [triedProxy, setTriedProxy] = useState(false);
    const [proxyUrlUsed, setProxyUrlUsed] = useState<string | null>(null);

    useEffect(() => {
        if (src) {
            setError(false);
            setTriedProxy(false);
            setProxyUrlUsed(null);
        }
    }, [src]);

    const canUseProxy = error && src.startsWith('/images/') && !triedProxy;
    const proxyUrl = canUseProxy ? `/api/admin/image?path=${encodeURIComponent(src)}` : '';

    const displayUrl = previewBlobUrl
        || proxyUrlUsed
        || (!error ? src : canUseProxy ? proxyUrl : '');

    if (!displayUrl && !src) return null;

    if (error && !previewBlobUrl && !canUseProxy) {
        return (
            <img
                src={PLACEHOLDER_IMG}
                alt={alt}
                className={className}
                style={style}
                title="Preview indisponível — imagem será exibida após salvar/publicar"
            />
        );
    }

    const handleLoad = () => {
        setError(false);
        if (proxyUrl && displayUrl === proxyUrl) setProxyUrlUsed(proxyUrl);
    };

    const handleError = () => {
        if (error) setTriedProxy(true);
        setError(true);
    };

    return (
        <img
            src={displayUrl}
            alt={alt}
            className={className}
            style={style}
            onLoad={handleLoad}
            onError={handleError}
        />
    );
}
