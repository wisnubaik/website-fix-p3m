import { useState } from 'react';

type StudyProgram = { id: string; name: string; href: string | null; groupTitle?: string | null };

export function programLevel(item: StudyProgram): string {
    const group = item.groupTitle?.trim() ?? '';
    const legacy = group.match(/^Program D[-– ]?(IV|III|II|I)$/i);
    if (legacy) return `Diploma ${legacy[1].toUpperCase()}`;
    if (group && group.toLowerCase() !== 'program studi') return group;
    const degree = item.name.match(/^D[-– ]?(IV|III|II|I|[1-4])\b/i)?.[1]?.toUpperCase();
    const roman: Record<string, string> = {'1':'I','2':'II','3':'III','4':'IV'};
    return degree ? `Diploma ${roman[degree] ?? degree}` : 'Program lainnya';
}

export default function StudyProgramLinks({ items }: { items: StudyProgram[] }) {
    const [selected, setSelected] = useState<string | null>(null);
    const programs = items.filter(item => item.href?.trim());
    const levels = Array.from(new Set(programs.map(programLevel)));
    const active = selected && levels.includes(selected) ? selected : null;
    const visible = active ? programs.filter(item => programLevel(item) === active) : programs;
    if (!programs.length) return null;

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-7" role="group" aria-label="Filter tingkatan diploma">
                {[null, ...levels].map(level => <button key={level ?? 'all'} type="button" aria-pressed={active === level}
                    onClick={() => setSelected(level)}
                    className={`rounded-full border px-5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-absolute-zero)] ${active === level ? 'bg-[var(--color-absolute-zero)] border-[var(--color-absolute-zero)] text-white' : 'bg-white border-[var(--color-outline-gray)] text-[var(--color-absolute-zero)] hover:border-[var(--color-absolute-zero)]'}`}>
                    {level ?? 'Semua program'}
                </button>)}
            </div>
            <p className="sr-only" role="status">{visible.length} program studi ditampilkan.</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none m-0 p-0">
                {visible.map(item => <li key={item.id} className="min-w-0">
                    <a href={item.href!} target="_blank" rel="noopener noreferrer"
                        className="group flex h-full min-h-[180px] flex-col rounded-lg border border-[var(--color-outline-gray)] bg-white p-5 text-[var(--color-absolute-zero)] hover:border-[var(--color-absolute-zero)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-absolute-zero)] transition-colors">
                        <span className="text-xs font-medium tracking-wide text-[var(--color-graphite)] mb-3">{programLevel(item)}</span>
                        <span className="text-base font-semibold leading-relaxed break-words mb-6">{item.name.replace(/^D[-– ]?(IV|III|II|I|[1-4])\s+/i, '')}</span>
                        <span className="mt-auto border-t border-[var(--color-outline-gray)] pt-3 text-xs text-[var(--color-graphite)] group-hover:text-[var(--color-absolute-zero)] group-hover:underline underline-offset-4">Kunjungi website</span>
                        <span className="sr-only"> (membuka tab baru)</span>
                    </a>
                </li>)}
            </ul>
        </div>
    );
}
