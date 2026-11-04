import { CmsInput } from '@/components/admin/CmsInput';
import { useEffect, useId, useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';
import { useRouteOptions } from './managed-site';

type Mode = 'internal' | 'external' | 'file';
function modeFor(value: string): Mode {
    if (/^\/(?:uploads\/|.*\.[a-z0-9]+(?:[?#]|$))/i.test(value)) return 'file';
    return value && !value.startsWith('/') ? 'external' : 'internal';
}
export default function LinkInput({ value, onChange, internalOnly = false, id, allowFile = false }: {
    value: string; onChange: (value: string) => void; internalOnly?: boolean; id?: string; allowFile?: boolean;
}) {
    const generatedId = useId();
    const initialOptions = useRouteOptions();
    const [options, setOptions] = useState(initialOptions);
    const [mode, setMode] = useState<Mode>(internalOnly ? 'internal' : modeFor(value));
    const [error, setError] = useState('');
    useEffect(() => setOptions(initialOptions), [initialOptions]);
    useEffect(() => { if (value) setMode(internalOnly ? 'internal' : modeFor(value)); }, [value, internalOnly]);
    async function refresh() {
        try {
            const response = await cmsFetch('/api/admin/link-options');
            if (!response.ok) throw new Error();
            setOptions(await response.json()); setError('');
        } catch { setError('Daftar belum dapat diperbarui. Coba buka pilihan lagi.'); }
    }
    return <div className="space-y-2">
        {!internalOnly && <select className="cms-input" aria-label="Jenis tautan" value={mode} onChange={e => {
            const next = e.target.value as Mode; setMode(next); onChange(next === 'external' ? 'https://' : '');
        }}><option value="internal">Halaman dalam situs</option><option value="external">Situs luar / email / telepon</option>{(allowFile || mode === 'file') && <option value="file">Berkas unggahan</option>}</select>}
        {mode === 'internal' ? <><select id={id ?? generatedId} className="cms-input" aria-label="Halaman tujuan" value={value} onFocus={() => void refresh()} onChange={e => onChange(e.target.value)}>
            <option value="">Pilih halaman yang sudah terbit</option>
            {value && !options.some(o => o.href === value) && <option disabled value={value}>Tujuan tidak tersedia - pilih ulang ({value})</option>}
            {options.map(option => <option key={option.href} value={option.href}>{option.label} ({option.href})</option>)}
        </select><small className="cms-help">Pilihan mengikuti halaman yang sudah diterbitkan. Daftar diperbarui saat pilihan dibuka.</small></> : mode === 'file' ? <><CmsInput id={id ?? generatedId} className="cms-input" value={value} readOnly aria-label="Berkas terpilih" placeholder="Pilih berkas dari perangkat"/><small className="cms-help">Alamat berkas diisi otomatis setelah unggahan.</small></> : <CmsInput id={id ?? generatedId} className="cms-input" aria-label="Alamat eksternal" value={value} placeholder="https://…" onChange={e => {
            if (e.target.value.trimStart().startsWith('/')) { setError('Untuk alamat dalam situs, pilih Halaman dalam situs.'); return; }
            setError(''); onChange(e.target.value);
        }}/>}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>;
}
