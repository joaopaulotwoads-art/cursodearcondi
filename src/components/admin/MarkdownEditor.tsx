/**
 * MarkdownEditor.tsx
 * 
 * Componente React para editor de Markdown.
 * Por enquanto usando textarea simples para garantir funcionamento.
 * CodeMirror pode ser adicionado depois quando tudo estiver estável.
 * 
 * Props:
 * - value: Conteúdo inicial
 * - onChange: Callback quando conteúdo muda
 * - placeholder: Texto placeholder
 */

import { useState } from 'react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder = 'Escreva seu conteúdo em Markdown...' }: Props) {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#e5e5e5] placeholder-[#737373] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] focus:ring-opacity-20 resize-none font-mono text-sm leading-relaxed"
            placeholder={placeholder}
        />
    );
}
