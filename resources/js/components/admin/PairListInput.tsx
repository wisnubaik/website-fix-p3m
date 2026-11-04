import { labelPolicy } from '@/lib/field-validation';
import { CmsInput } from '@/components/admin/CmsInput';
import { useId } from 'react';

export function parseDetailPairs(value: string): [string, string][] | null {
    if (!value.trim()) return [];
    try {
        const rows = JSON.parse(value);
        return Array.isArray(rows) && rows.every(row => Array.isArray(row) && row.length === 2 && row.every(cell => typeof cell === 'string')) ? rows : null;
    } catch { return null; }
}

export default function PairListInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const id = useId();
    const rows = parseDetailPairs(value);
    if (!rows) return <p role="alert" className="cms-notice error">Detail lama belum dapat dibaca. Isinya tetap disimpan. Periksa data ini sebelum melanjutkan.</p>;
    const update = (next: [string, string][]) => onChange(JSON.stringify(next));
    return <div>
        <p className="cms-help mb-3">Tambahkan satu baris untuk setiap keterangan, misalnya NIDN atau Email. Urutannya mengikuti kartu tim di website.</p>
        {rows.map(([label, text], index) => <div className="cms-pair-row" key={index}>
            <div className="cms-field"><label htmlFor={`${id}-${index}-label`}>Nama keterangan {index + 1}</label><CmsInput id={`${id}-${index}-label`} value={label} placeholder="Contoh: Email" onChange={event => update(rows.map((row, i) => i === index ? [event.target.value, row[1]] : row))} /></div>
            <div className="cms-field"><label htmlFor={`${id}-${index}-text`}>Isi keterangan {index + 1}</label><CmsInput policy={labelPolicy(label)} id={`${id}-${index}-text`} value={text} placeholder="Contoh: nama@pnm.ac.id" onChange={event => update(rows.map((row, i) => i === index ? [row[0], event.target.value] : row))} /></div>
            <div className="cms-actions"><button type="button" className="cms-button small" disabled={index === 0} aria-label={`Naikkan keterangan ${index + 1}`} onClick={() => { const next = [...rows]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(next); }}>↑</button><button type="button" className="cms-button small" aria-label={`Hapus keterangan ${index + 1}`} onClick={() => { if (window.confirm('Hapus keterangan ini dari formulir?')) update(rows.filter((_, i) => i !== index)); }}>Hapus</button></div>
        </div>)}
        <button type="button" className="cms-button small" disabled={rows.length >= 30} onClick={() => update([...rows, ['', '']])}>Tambah keterangan</button>
        {rows.length > 0 && <div className="cms-notice mt-3" aria-label="Pratinjau keterangan tim"><p className="font-semibold">Pratinjau keterangan</p>{rows.map(([label, text], index) => <p key={index}><strong>{label || 'Nama keterangan'}</strong>  {text || 'Isi keterangan'}</p>)}</div>}
    </div>;
}
