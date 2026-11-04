import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import ExcelImport from './ExcelImport';
import { displayOrder, storedOrder } from '@/lib/display-order';
import { useEffect, useRef, useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';
import { managedRequest } from './managed-site';

type Row = { id: string; text?: string; title?: string; desc?: string; order: number; published: boolean };
export default function ProfileListEditor({ section, title }: { section: string; title: string }) {
    const clusters = section === 'klaster';
    const endpoint = clusters ? '/api/admin/clusters' : '/api/admin/content-list';
    const storageKey = `p3m-profile-list-${section}`;
    const [rows, setRows] = useState<Row[]>([]);
    const [saved, setSaved] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const latest = useRef({ rows, saved, loading }); latest.current = { rows, saved, loading };
    useEffect(() => {
        const abort = new AbortController();
        cmsFetch(clusters ? endpoint : `${endpoint}?section=${section}`, { signal: abort.signal }).then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Isi profil belum dapat dimuat.');
            const clean: Row[] = data.map((row: Row) => ({ id: row.id, order: row.order, published: row.published, ...(clusters ? { title: row.title, desc: row.desc } : { text: row.text }) }));
            setSaved(Object.fromEntries(clean.map(row => [row.id, JSON.stringify(row)])));
            let restored: Row[] = [];
            try { restored = JSON.parse(sessionStorage.getItem(storageKey) || '[]'); if (!Array.isArray(restored)) restored = []; } catch { /* Browser storage is optional. */ }
            const valid = restored.filter(row => row && typeof row.id === 'string' && (row.id.startsWith('new-') || clean.some(item => item.id === row.id)));
            setRows([...clean.map(row => valid.find(item => item.id === row.id) ?? row), ...valid.filter(row => row.id.startsWith('new-'))]);
            if (valid.length) setMessage('Perubahan yang belum disimpan dipulihkan dari tab ini. Periksa sebelum menyimpan.');
        }).catch(e => { if (!abort.signal.aborted) setError(e.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
        return () => { abort.abort(); };
    }, [section, clusters, endpoint, storageKey]);
    useEffect(() => {
        if (loading) return;
        const drafts = rows.filter(row => saved[row.id] !== JSON.stringify(row));
        try { sessionStorage.setItem(storageKey, JSON.stringify(drafts)); } catch { setError('Penyimpanan sementara browser tidak tersedia. Simpan baris sebelum berpindah bagian.'); }
    }, [rows, saved, loading, storageKey]);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => { const { rows, saved } = latest.current; if (rows.some(row => saved[row.id] !== JSON.stringify(row))) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
    }, []);
    const change = (id: string, values: Partial<Row>) => { setRows(current => current.map(row => row.id === id ? { ...row, ...values } : row)); setMessage(''); };
    async function refreshRows(finishedId: string) {
        const response = await cmsFetch(clusters ? endpoint : `${endpoint}?section=${section}`);
        if (!response.ok) throw new Error('Perubahan tersimpan, tetapi urutan terbaru belum dapat dimuat. Muat ulang halaman.');
        const data: Row[] = await response.json();
        const clean = data.map(row => ({ id: row.id, order: row.order, published: row.published, ...(clusters ? { title: row.title, desc: row.desc } : { text: row.text }) }));
        const local = latest.current.rows.filter(row => row.id !== finishedId);
        setRows([...clean.map(row => {
            const draft = local.find(item => item.id === row.id);
            const baseline = latest.current.saved[row.id];
            if (!draft || !baseline || baseline === JSON.stringify(draft)) return row;
            const original = JSON.parse(baseline) as Row;
            return { ...draft, order: draft.order === original.order ? row.order : draft.order };
        }), ...local.filter(row => row.id.startsWith('new-'))].sort((a, b) => a.order - b.order));
        setSaved(Object.fromEntries(clean.map(row => [row.id, JSON.stringify(row)])));
    }
    async function save(row: Row) {
        setBusy(row.id); setError(''); setMessage('');
        try {
            if (!(clusters ? row.title?.trim() && row.desc?.trim() : row.text?.trim())) throw new Error('Isi teks terlebih dahulu sebelum menyimpan.');
            if (!Number.isInteger(row.order) || row.order < 0) throw new Error('Urutan harus bilangan bulat minimal 1.');
            const body = { order: row.order, published: row.published, ...(clusters ? { title: row.title, desc: row.desc } : { section, text: row.text }) };
            const result = await managedRequest(`${endpoint}${row.id.startsWith('new-') ? '' : `/${row.id}`}`, row.id.startsWith('new-') ? 'POST' : 'PUT', body);
            const stored: Row = { id: result.id, order: result.order, published: result.published, ...(clusters ? { title: result.title, desc: result.desc } : { text: result.text }) };
            setRows(current => current.map(item => item.id === row.id ? stored : item));
            setSaved(current => ({ ...current, [stored.id]: JSON.stringify(stored) }));
            await refreshRows(row.id);
            setMessage('Baris tersimpan. Baris yang dicentang Tampil sudah diperbarui di halaman profil.');
        } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
    }
    async function remove(row: Row) {
        if (!window.confirm('Pindahkan baris ini ke Sampah? Baris tidak lagi tampil di profil.')) return;
        setBusy(row.id); setError('');
        try { if (!row.id.startsWith('new-')) { await managedRequest(`${endpoint}/${row.id}`, 'DELETE', {}); setRows(current => current.filter(item => item.id !== row.id)); await refreshRows(row.id); } else { setRows(current => current.filter(item => item.id !== row.id)); } }
        catch (e) { setError((e as Error).message); } finally { setBusy(''); }
    }
    if (loading) return <p role="status">Memuat isi profil…</p>;
    return <div><h3 className="mb-4">{title}</h3><ExcelImport resource={clusters?'clusters':'content-list'} title={title} scope={clusters?{}:{section}} columns={clusters?[{key:'title',label:'Judul'},{key:'desc',label:'Keterangan'}]:[{key:'text',label:'Isi teks'}]} disabled={!!busy||rows.some(row=>saved[row.id]!==JSON.stringify(row))} onImported={()=>refreshRows('')}/>{error && <div className="cms-notice error" role="alert">{error}</div>}{message && <div className="cms-notice success" role="status">{message}</div>}
        {rows.map((row, index) => <fieldset key={row.id} disabled={!!busy} className="cms-profile-row"><legend>Butir {index + 1}</legend>
            {clusters ? <><div className="cms-field"><label htmlFor={`profile-title-${row.id}`}>Nama bidang fokus</label><CmsInput id={`profile-title-${row.id}`} value={row.title ?? ''} onChange={e => change(row.id, { title: e.target.value })}/></div><div className="cms-field"><label htmlFor={`profile-desc-${row.id}`}>Keterangan bidang fokus</label><CmsTextarea id={`profile-desc-${row.id}`} rows={3} value={row.desc ?? ''} onChange={e => change(row.id, { desc: e.target.value })}/></div></> : <div className="cms-field"><label htmlFor={`profile-text-${row.id}`}>Isi {title.toLowerCase()}</label><CmsTextarea id={`profile-text-${row.id}`} rows={3} value={row.text ?? ''} onChange={e => change(row.id, { text: e.target.value })}/></div>}
            <div className="cms-profile-row-actions"><div className="cms-field cms-profile-order"><label htmlFor={`profile-order-${row.id}`}>Urutan</label><CmsInput id={`profile-order-${row.id}`} type="number" min={1} step={1} value={displayOrder(row.order)} onChange={e => change(row.id, { order: storedOrder(e.target.value) })}/></div><label className="cms-inline-label"><CmsInput type="checkbox" checked={row.published} onChange={e => change(row.id, { published: e.target.checked })}/>Tampil di profil</label><div className="cms-actions"><button className="cms-button primary small" disabled={saved[row.id] === JSON.stringify(row)} onClick={() => void save(row)}>Simpan baris</button><button className="cms-button small" onClick={() => void remove(row)}>Hapus</button></div></div>
        </fieldset>)}
        {!rows.length && <p className="cms-help mb-4">Bagian ini belum memiliki data. Tidak ada contoh isian yang ditambahkan otomatis.</p>}
        <button className="cms-add" disabled={!!busy} onClick={() => setRows(current => [...current, { id: `new-${crypto.randomUUID()}`, order: Math.max(-1, ...current.map(row => row.order)) + 1, published: true, ...(clusters ? { title: '', desc: '' } : { text: '' }) }])}>+ Tambah butir {title.toLowerCase()}</button>
    </div>;
}
