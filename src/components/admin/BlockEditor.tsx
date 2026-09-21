/**
 * BlockEditor.tsx
 *
 * Editor de texto HTML simples para o admin.
 * Substitui a dependência BlockNote por um textarea com interface compatível.
 * Props: value (HTML), onChange, placeholder.
 */

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function BlockEditor({
    value,
    onChange,
    placeholder = 'Comece a escrever...',
}: Props) {
    return (
        <div className="h-full w-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-full min-h-[300px] p-4 bg-transparent text-[#e5e5e5] placeholder-[#737373] resize-none focus:outline-none focus:ring-0 font-[inherit] text-sm leading-relaxed"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
            />
        </div>
    );
}
