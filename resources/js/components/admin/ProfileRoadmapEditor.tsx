import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { cmsFetch } from '@/lib/cms-fetch';
import { ProfileField, ProfileCellFields } from './ProfileContentFields';
import ExcelImport from './ExcelImport';
import { validateProfileContent, type ProfileCell, type ProfileTableRecord } from '@/lib/profile-tables';

const draftKey = 'p3m-profile-roadmap-draft';
const ids = ['revision-profil-image-7', 'revision-profil-image-6'];
const blank = (): ProfileCell => ({ text: '', items: [], ordered: false });
type YearRow = { key: string; year: string; title: string; cells: ProfileCell[]; headings: ProfileCell[]; oldTitle?: string };
export function mergeRoadmap(records: ProfileTableRecord[]): YearRow[] {
    const rows = new Map<string, YearRow>();
    records.forEach((record, side) => {
        const table = record.content.tables[0];
        if (record.content.tables.length !== 1 || table.numeric || table.headers.length !== 2) throw new Error('Format data peta jalan berbeda. Data tidak diubah. Minta pengelola memeriksa struktur tabel.');
        const seen = new Set<string>();
        table.rows.forEach((cells, index) => {
            const heading = cells[0] as ProfileCell;
            const match = heading.text.match(/^((?:19|20)\d{2})\s+([\s\S]+)$/);
            if (!match || seen.has(match[1])) throw new Error('Ada tahun tidak valid atau berulang pada data lama. Perbaiki sumber data sebelum menggunakan editor gabungan.');
            seen.add(match[1]);
            const [, year, title] = match;
            const row = rows.get(year) ?? { key: `${side}-${index}`, year, title: title.trim(), cells: [blank(), blank()], headings: [blank(), blank()] };
            if (row.title !== title.trim()) row.oldTitle = title.trim();
            row.cells[side] = structuredClone(cells[1] as ProfileCell);
            row.headings[side] = structuredClone(heading);
            rows.set(year, row);
        });
    });
    return [...rows.values()];
}
export function roadmapPayload(records: ProfileTableRecord[], rows: YearRow[]) {
    const years = new Set<string>();
    for (const row of rows) {
        if (!/^(19|20)\d{2}$/.test(row.year) || !row.title.trim()) throw new Error('Isi tahun 1900-2099 dan judul arah pengembangan pada setiap baris.');
        if (years.has(row.year)) throw new Error(`Tahun ${row.year} berulang. Gunakan satu baris untuk setiap tahun.`);
        years.add(row.year);
        for (const [side, cell] of row.cells.entries()) if (!cell.text.trim() && !cell.items.some(item => item.trim())) throw new Error(`Isi ${side === 0 ? 'agenda penelitian' : 'indikator capaian'} untuk tahun ${row.year}.`);
    }
    return records.map((record, side) => {
        const next = structuredClone(record);
        next.content.tables[0].rows = rows.map(row => [
            { ...row.headings[side], text: `${row.year}\n${row.title.trim()}` },
            { ...row.cells[side], items: row.cells[side].items.filter(item => item.trim()) },
        ]);
        next.content = validateProfileContent(next.content);
        return next;
    });
}
export default function ProfileRoadmapEditor() {
    const [records, setRecords] = useState<ProfileTableRecord[]>([]);
    const [rows, setRows] = useState<YearRow[]>([]);
    const [baseline, setBaseline] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const dirty = !!baseline && JSON.stringify({ records, rows }) !== baseline;
    const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
    function accept(incoming: ProfileTableRecord[]) {
        const combined = mergeRoadmap(incoming);
        setRecords(incoming); setRows(combined); setBaseline(JSON.stringify({ records: incoming, rows: combined }));
    }
    async function load(signal?: AbortSignal, restore = true) {
        setLoading(true); setError('');
        try {
            const response = await cmsFetch('/api/admin/profile-tables', { signal });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Data peta jalan tidak dapat dimuat.');
            const pair = ids.map(id => data.find((item: ProfileTableRecord) => item.id === id));
            if (pair.some(item => !item)) throw new Error('Dokumen agenda atau indikator belum tersedia. Periksa Sampah atau data proyek; editor tidak membuat data pengganti.');
            accept(pair);
            if (restore) {
                try {
                    const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
                    if (draft && draft.records?.length === 2 && draft.records.every((record: ProfileTableRecord, i: number) => record.id === ids[i]) && Array.isArray(draft.rows)) {
                        setRecords(draft.records); setRows(draft.rows); setMessage('Perubahan yang belum disimpan dipulihkan dari tab ini. Periksa sebelum menyimpan.');
                    }
                } catch { setError('Draf browser tidak dapat dibaca. Data server tetap tersedia.'); }
            }
        } catch (e) { if (!signal?.aborted) setError((e as Error).message); }
        finally { if (!signal?.aborted) setLoading(false); }
    }
    useEffect(() => { const abort = new AbortController(); void load(abort.signal); return () => abort.abort(); }, []);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', warn);
        const remove = router.on('before', () => { if (dirtyRef.current && !window.confirm('Peta jalan belum disimpan. Tinggalkan halaman?')) return false; });
        return () => { window.removeEventListener('beforeunload', warn); remove(); };
    }, []);
    useEffect(() => {
        if (!baseline || loading) return;
        try {
            if (dirty) sessionStorage.setItem(draftKey, JSON.stringify({ records, rows }));
            else sessionStorage.removeItem(draftKey);
        } catch { setError('Penyimpanan sementara browser tidak tersedia. Simpan perubahan sebelum berpindah tab CMS.'); }
    }, [records, rows, dirty, baseline, loading]);
    const change = (index: number, values: Partial<YearRow>) => { setRows(current => current.map((row, i) => i === index ? { ...row, ...values } : row)); setMessage(''); };
    function changeTable(side: number, field: 'title', value: string) {
        setRecords(current => current.map((record, i) => {
            if (i !== side) return record;
            const next = structuredClone(record); next.content.tables[0][field] = value;
            if (field === 'title') next.content.tables[0].headers[1] = value;
            return next;
        }));
    }
    async function save() {
        setError(''); setMessage('');
        try {
            const payload = roadmapPayload(records, rows);
            if (rows.some(row => row.oldTitle) && !window.confirm('Ada judul agenda dan indikator yang berbeda pada data lama. Gunakan judul arah pengembangan yang terlihat di formulir ini untuk keduanya?')) return;
            setBusy(true);
            const response = await cmsFetch('/api/admin/profile-roadmap', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: payload }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(' ') : data.message || 'Peta jalan belum tersimpan.');
            accept(data.records); setMessage('Agenda dan indikator tersimpan bersama. Urutan tahun di website mengikuti urutan di editor.');
        } catch (e) { setError((e as Error).message); }
        finally { setBusy(false); }
    }
    if (loading) return <p role="status">Memuat peta jalan…</p>;
    return <section className="cms-panel">
        <h2>Peta jalan penelitian</h2>
        <p className="cms-help my-3">Satu tahun memiliki satu judul, agenda penelitian, dan indikator capaian. Isi tahun dan judul cukup sekali. Gunakan Naikkan atau Turunkan untuk mengatur urutan di website, lalu Simpan peta jalan.</p>
        {error && <p role="alert" className="cms-notice error">{error}</p>}
        {message && <p role="status" className="cms-notice success">{message}</p>}
        {records.length === 2 && <fieldset disabled={busy} className="min-w-0">
            <div className="cms-row">{records.map((record, side) => <div key={record.id}>
                <ProfileField label={`Judul kolom ${side + 1}`} value={record.content.tables[0].title || record.content.tables[0].headers[1]} onChange={value => changeTable(side, 'title', value)} />
                <label className="cms-field"><span><input type="checkbox" checked={record.published} onChange={event => setRecords(current => current.map((item, i) => i === side ? { ...item, published: event.target.checked } : item))} /> Tampilkan kolom {side + 1} di website</span></label>
            </div>)}</div>
            <ExcelImport resource="rows" title="Peta jalan penelitian" context="profil-roadmap-combined" maxRows={80} currentRows={rows.map(row=>({year:row.year,title:row.title,agenda:row.cells[0].items,indicators:row.cells[1].items,agendaText:row.cells[0].text,indicatorText:row.cells[1].text,agendaOrdered:row.cells[0].ordered,indicatorOrdered:row.cells[1].ordered,agendaHeading:row.headings[0].items,indicatorHeading:row.headings[1].items,agendaHeadingOrdered:row.headings[0].ordered,indicatorHeadingOrdered:row.headings[1].ordered}))} columns={[
                { key: 'year', label: 'Tahun', required: true }, { key: 'title', label: 'Judul arah pengembangan', required: true },
                { key: 'agenda', label: 'Agenda penelitian (satu butir per baris)', type: 'lines' },
                { key: 'indicators', label: 'Indikator capaian (satu butir per baris)', type: 'lines' },
                {key:'agendaText',label:'Pengantar agenda'}, {key:'indicatorText',label:'Pengantar indikator'},
                {key:'agendaOrdered',label:'Agenda bernomor',type:'boolean'}, {key:'indicatorOrdered',label:'Indikator bernomor',type:'boolean'},
                {key:'agendaHeading',label:'Keterangan tambahan judul agenda',type:'lines'}, {key:'indicatorHeading',label:'Keterangan tambahan judul indikator',type:'lines'},
                {key:'agendaHeadingOrdered',label:'Keterangan judul agenda bernomor',type:'boolean'}, {key:'indicatorHeadingOrdered',label:'Keterangan judul indikator bernomor',type:'boolean'},
            ]} onApply={(incoming, mode) => {
                const additions: YearRow[] = incoming.map(item => ({ key: crypto.randomUUID(), year: String(item.year), title: String(item.title), cells: [{text:item.agendaText??'',items:item.agenda,ordered:!!item.agendaOrdered},{text:item.indicatorText??'',items:item.indicators,ordered:!!item.indicatorOrdered}], headings: [{text:'',items:item.agendaHeading??[],ordered:!!item.agendaHeadingOrdered},{text:'',items:item.indicatorHeading??[],ordered:!!item.indicatorHeadingOrdered}] }));
                const next = [...(mode === 'replace' ? [] : rows), ...additions]; roadmapPayload(records, next); setRows(next); return additions.length;
            }} />
            {rows.map((row, index) => <details className="cms-section" key={row.key} open={rows.length <= 1 || undefined}>
                <summary>{index + 1}. {row.year || 'Tahun baru'} {row.title}</summary>
                <div className="cms-section-body">
                    {row.oldTitle && <p className="cms-notice">Judul indikator sebelumnya: {row.oldTitle}. Periksa judul bersama di bawah sebelum menyimpan.</p>}
                    <ProfileField policy="year" label="Tahun" value={row.year} onChange={year => change(index, { year })} />
                    <ProfileField label="Judul arah pengembangan" value={row.title} onChange={title => change(index, { title })} multiline rows={2} />
                    <div className="cms-row">{row.cells.map((cell, side) => <div key={side}>
                        <ProfileCellFields cell={cell} kind="process" column={1} label={records[side].content.tables[0].title || records[side].content.tables[0].headers[1]} onChange={value => change(index, { cells: row.cells.map((item, i) => i === side ? value : item) })} />
                        {!!row.headings[side].items.length && <ProfileField label={`Keterangan tambahan judul kolom ${side + 1}`} value={row.headings[side].items.join('\n')} multiline onChange={value => change(index, { headings: row.headings.map((item, i) => i === side ? { ...item, items: value.split('\n').filter(Boolean) } : item) })} />}
                    </div>)}</div>
                    <div className="cms-actions">{[-1, 1].map(direction => <button type="button" className="cms-button small" key={direction} disabled={index + direction < 0 || index + direction >= rows.length} onClick={() => setRows(current => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; })}>{direction === -1 ? 'Naikkan' : 'Turunkan'} tahun {row.year}</button>)}
                        <button type="button" className="cms-button small danger" onClick={() => { if (window.confirm(`Hapus tahun ${row.year} beserta agenda dan indikator dari formulir? Perubahan diterapkan setelah disimpan.`)) setRows(current => current.filter((_, i) => i !== index)); }}>Hapus tahun</button>
                    </div>
                </div>
            </details>)}
            <button type="button" className="cms-add" disabled={rows.length >= 80} onClick={() => setRows(current => [...current, { key: crypto.randomUUID(), year: '', title: '', cells: [blank(), blank()], headings: [blank(), blank()] }])}>Tambah tahun</button>
            <div className="cms-actions mt-4"><button type="button" className="cms-button primary" disabled={!dirty} onClick={() => void save()}>{busy ? 'Menyimpan…' : 'Simpan peta jalan'}</button><button type="button" className="cms-button" onClick={() => { if (!dirty || window.confirm('Buang perubahan yang belum disimpan dan muat data terbaru?')) void load(undefined, false); }}>Muat versi terbaru</button></div>
            {dirty && <p className="cms-help mt-2">Ada perubahan yang belum disimpan.</p>}
        </fieldset>}
    </section>;
}
