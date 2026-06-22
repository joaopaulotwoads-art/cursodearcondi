/**
 * SingletonEditor.tsx
 * 
 * Componente React genérico para edição de singletons.
 * Suporta diferentes tipos de singletons (Home, Sobre, Contato, Menu, Rodapé).
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface Props {
    name: string;
    title: string;
    fields: any;
    initialData?: any;
}

export default function SingletonEditor({ name, title, fields, initialData }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [data, setData] = useState(initialData || {});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/admin/singletons/${name}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            });

            const result = await response.json();
            if (result.success) {
                showToast('success', 'Salvo com sucesso!');
                const getResponse = await fetch(`/api/admin/singletons/${name}`);
                const getResult = await getResponse.json();
                if (getResult.success) {
                    setData(getResult.data);
                }
            } else {
                showToast('error', 'Erro ao salvar', result.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('error', 'Erro ao salvar');
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (path: string, value: any) => {
        const keys = path.split('.');
        setData((prev: any) => {
            const newData = { ...prev };
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    const renderField = (field: any, path: string = '') => {
        const fieldPath = path ? `${path}.${field.key}` : field.key;
        const value = getNestedValue(data, fieldPath);

        switch (field.type) {
            case 'text':
                return (
                    <div key={field.key} className="mb-4">
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            {field.label}
                            {field.required && <span className="text-[#3b82f6] ml-1">*</span>}
                        </label>
                        {field.multiline ? (
                            <textarea
                                value={value || ''}
                                onChange={(e) => updateField(fieldPath, e.target.value)}
                                className="admin-input resize-none"
                                rows={field.rows || 4}
                                placeholder={field.placeholder}
                            />
                        ) : (
                            <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => updateField(fieldPath, e.target.value)}
                                className="admin-input"
                                placeholder={field.placeholder}
                            />
                        )}
                        {field.description && (
                            <p className="text-xs text-[#737373] mt-1">{field.description}</p>
                        )}
                    </div>
                );

            case 'array':
                return (
                    <div key={field.key} className="mb-6">
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-3">
                            {field.label}
                        </label>
                        {(value || []).map((item: any, index: number) => (
                            <div key={index} className="admin-card p-4 mb-3">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-[#a3a3a3]">
                                        {field.itemLabel ? field.itemLabel(item) : `Item ${index + 1}`}
                                    </span>
                                    <button
                                        onClick={() => {
                                            const newArray = [...(value || [])];
                                            newArray.splice(index, 1);
                                            updateField(fieldPath, newArray);
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Remover
                                    </button>
                                </div>
                                {field.fields?.map((subField: any) => 
                                    renderField({
                                        ...subField,
                                        key: `${fieldPath}.${index}.${subField.key}`,
                                    }, '')
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newItem = field.defaultItem || {};
                                updateField(fieldPath, [...(value || []), newItem]);
                            }}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar {field.itemLabel || 'Item'}
                        </button>
                    </div>
                );

            case 'select':
                return (
                    <div key={field.key} className="mb-4">
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                            {field.label}
                        </label>
                        <select
                            value={value || field.defaultValue || ''}
                            onChange={(e) => updateField(fieldPath, e.target.value)}
                            className="admin-input"
                        >
                            {field.options?.map((option: any) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            default:
                return null;
        }
    };

    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    return (
        <>
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        {title}
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        Edite o conteúdo desta página
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.href = '/admin/pages'}
                        className="admin-btn admin-btn-secondary"
                    >
                        Voltar
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

            <div className="max-w-4xl space-y-6">
                {fields.map((field: any) => renderField(field))}
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
