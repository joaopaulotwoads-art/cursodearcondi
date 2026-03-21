/**
 * Toast.tsx
 *
 * Hook e componente de notificação para substituir alert() nativo.
 * Suporta success, error, info e warning com auto-dismiss.
 */

import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
}

interface UseToastReturn {
    toasts: ToastItem[];
    showToast: (type: ToastType, title: string, message?: string) => void;
    removeToast: (id: number) => void;
}

export function useToast(): UseToastReturn {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const counterRef = useRef(0);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = ++counterRef.current;
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => removeToast(id), 4500);
    }, [removeToast]);

    return { toasts, showToast, removeToast };
}

const icons: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
};

const modifiers: Record<ToastType, string> = {
    success: 'admin-toast--success',
    error: 'admin-toast--error',
    info: 'admin-toast--info',
    warning: 'admin-toast--warning',
};

interface ToastListProps {
    toasts: ToastItem[];
    onRemove: (id: number) => void;
}

export function ToastList({ toasts, onRemove }: ToastListProps) {
    if (toasts.length === 0) return null;

    return (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {toasts.map(toast => (
                <div key={toast.id} className={`admin-toast ${modifiers[toast.type]}`} style={{ position: 'relative', animation: 'toastIn 0.2s ease' }}>
                    <div className="admin-toast-icon">
                        <span>{icons[toast.type]}</span>
                    </div>
                    <div className="admin-toast-content">
                        <strong>{toast.title}</strong>
                        {toast.message && <span>{toast.message}</span>}
                    </div>
                    <button
                        type="button"
                        className="admin-toast-close"
                        aria-label="Fechar"
                        onClick={() => onRemove(toast.id)}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
