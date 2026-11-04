import { CmsInput } from '@/components/admin/CmsInput';
import { useEffect, useId, useRef, useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';

export type ExcelColumn = { key: string; label: string; type?: string; required?: boolean; nullable?: boolean; options?: string[] };
type Config = { title: string; scope?: Record<string, string>; columns?: ExcelColumn[]; context?: string };
type Preview = { scopeLabel?: string; oldCount?: number; rows: { number: number; values: Record<string, any> }[]; columns: Record<string, ExcelColumn>; errors: { row: number; field: string; message: string; hint?: string }[]; errorCount: number; duplicates: number; total: number; validCount: number; token: string | null };
type Props = Config & { resource: string; disabled?: boolean; onImported?: () => void | Promise<void>; onApply?: (rows: Record<string, any>[], mode: 'append'|'replace') => number; maxRows?: number; currentRows?: Record<string, any>[] };
async function result(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 419 || response.status === 401) throw new Error('Sesi berakhir. Muat ulang halaman dan masuk kembali, lalu unggah Excel lagi.');
    if (response.status === 413) throw new Error('File melebihi batas unggah server. Kurangi ukuran atau jumlah baris Excel, lalu unggah ulang.');
    if (response.status >= 500 && !['EXCEL_ORDER_UNAVAILABLE', 'EXCEL_SERVER_ERROR'].includes(data.code)) throw new Error('Proses Excel gagal pada server. Ini belum tentu kesalahan isi Excel. Muat ulang daftar untuk memeriksa hasil, lalu hubungi pengelola teknis jika masih gagal.');
    if (!response.ok) throw new Error(data.errors && !Array.isArray(data.errors) ? Object.values(data.errors).flat().join(' ') : data.message || data.error || `Permintaan belum berhasil (${response.status}). Periksa batas unggah PHP dan coba lagi.`);
    return data;
}
export default function ExcelImport({ resource, title, scope = {}, columns = [], context = '', disabled = false, onImported, onApply, maxRows, currentRows }: Props) {
    const id = useId(); const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [fileName, setFileName] = useState(''); const [preview, setPreview] = useState<Preview | null>(null);
    const [available, setAvailable] = useState<{hasDefaults:boolean;hasBackup:boolean;label:string;backups?:{id:string;createdAt:string;canDelete:boolean}[];historyPage?:number;historyLast?:number}>({hasDefaults:false,hasBackup:false,label:''});
    const [backupId, setBackupId] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const [mode, setMode] = useState<'append'|'replace'>('append');
    const [bulk, setBulk] = useState<{token:string;oldCount:number;newCount:number;action:string;label:string}|null>(null);
    const replaceResources = ['riset-entries','ki-karya','pbl','staff','riset-grup','announcements','kegiatan','quick-access','winners','roadmap','clusters','tautan-pengusulan','content-list','documents','monev-slot','hub-cards','stat-entries','trend-stats'];
    const scopeReady = resource === 'riset-entries' ? !!scope.category : resource === 'monev-slot' ? !!(scope.acara && scope.periodeId && scope.skemaId) : resource === 'documents' ? !!scope.section && (!['monev','semhas'].includes(scope.section) || !!(scope.periodeId && scope.skemaId)) : resource === 'content-list' ? !!scope.section : resource === 'hub-cards' ? !!scope.hub : resource === 'stat-entries' ? !!scope.group : resource === 'trend-stats' ? !!scope.metric : true;
    const research = !onApply && scopeReady && replaceResources.includes(resource);
    const [year, setYear] = useState('');
    const yearKey = resource === 'riset-entries' ? 'year' : resource === 'ki-karya' ? 'tahun' : null;
    const effectiveScope = yearKey && year ? {...scope, [yearKey]: year} : scope;
    const categoryLabel = title;
    const input = useRef<HTMLInputElement>(null); const inFlight = useRef(false);
    const config = { title, scope: effectiveScope, columns, context, maxRows }; const identity = JSON.stringify({ resource, scope: effectiveScope, columns, context, maxRows });
    const identityRef = useRef(identity); identityRef.current = identity;
    useEffect(() => { setBackupId(''); setHistoryPage(1); setPreview(null); setBulk(null); setMode('append'); setError(''); setMessage(''); setFileName(''); if (input.current) input.current.value = ''; }, [identity]);
    useEffect(() => {
        let active = true;
        setAvailable({hasDefaults:false,hasBackup:false,label:''});
        if (research) void cmsFetch(`/api/admin/excel/${resource}/bulk-preview`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,action:'status',historyPage})}).then(result).then(data=>{if(active)setAvailable(data);}).catch(e=>{if(active)setError((e as Error).message);});
        return () => {active=false;};
    }, [identity, message, historyPage]);
    async function perform(action: string, work: () => Promise<void>) {
        if (inFlight.current || disabled) return;
        inFlight.current = true; setBusy(action); setError(''); setMessage('');
        try { await work(); } catch (e) { setError(e instanceof TypeError ? 'Koneksi ke server terputus. Periksa koneksi dan muat ulang daftar untuk memastikan hasil impor sebelum mencoba kembali.' : (e as Error).message); } finally { inFlight.current = false; setBusy(''); }
    }
    async function download(includeData = false) {
        await perform('template', async () => {
            const response = await cmsFetch(`/api/admin/excel/${resource}/template`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, includeData, ...(includeData && onApply ? { currentRows: currentRows ?? [] } : {}) }) });
            if (!response.ok) { await result(response); return; }
            const url = URL.createObjectURL(await response.blob()); const a = document.createElement('a'); a.href = url; a.download = `${includeData ? 'data' : 'template'}-${resource}-${title.replace(/[^a-zA-Z0-9]+/g, '-').slice(0,60)}.xlsx`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    }
    async function upload(file?: File) {
        setPreview(null); setBulk(null); setFileName(file?.name ?? '');
        if (!file) return;
        await perform('preview', async () => {
            if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 10 * 1024 * 1024) throw new Error('Pilih Excel .xlsx dengan ukuran maksimal 10 MB.');
            const body = new FormData(); body.append('file', file); body.append('config', JSON.stringify(config)); body.append('mode', mode);
            const data: Preview = await result(await cmsFetch(`/api/admin/excel/${resource}/preview`, { method: 'POST', body }));
            if (identityRef.current === identity) setPreview(data);
        });
    }
    async function bulkPreview(action: string) {
        setPreview(null); setBulk(null);
        await perform('preview', async () => {
            const data = await result(await cmsFetch(`/api/admin/excel/${resource}/bulk-preview`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,action,backupId:action === 'undo' ? backupId || undefined : undefined})}));
            if (identityRef.current === identity) setBulk(data);
        });
    }
    async function bulkCommit() {
        if (!bulk) return;
        await perform('save', async () => {
            await result(await cmsFetch(`/api/admin/excel/${resource}/commit`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:bulk.token})}));
            setBulk(null); setMessage('Data pada bagian ini berhasil diperbarui. Cadangan sebelum tindakan telah disimpan.');
            try { await onImported?.(); } catch { setError('Data tersimpan. Muat ulang halaman untuk melihat hasil.'); }
        });
    }
    async function confirm() {
        if (!preview || preview.errorCount || !preview.validCount) return;
        if (mode === 'replace' && !window.confirm(`Ganti isi ${title} dengan ${preview.validCount} baris Excel? Periksa cakupan tujuan sebelum melanjutkan.`)) return;
        await perform('save', async () => {
            if (onApply) {
                const added = onApply(preview.rows.map(row => row.values), mode);
                setMessage(`${added} baris ${mode === 'replace' ? 'menggantikan isi daftar pada draf' : 'ditambahkan ke draf'}. ${preview.total - added} baris sama dilewati. Periksa hasilnya, lalu gunakan tombol Simpan pada editor ini.`);
                setPreview(null);
            } else {
                const response = await cmsFetch(`/api/admin/excel/${resource}/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: preview.token }) });
                if (response.status === 422) {
                    const invalid = await response.clone().json().catch(() => ({}));
                    if (Array.isArray(invalid.errors)) setPreview({ ...preview, ...invalid, rows: (invalid.rows ?? []).slice(0, 20), validCount: invalid.rows?.length ?? 0, token: null });
                }
                const saved = await result(response);
                setPreview(null); setMessage(`${saved.imported} baris tersimpan. ${saved.duplicates} baris sama dilewati.`);
                try { await onImported?.(); } catch { setError('Impor sudah tersimpan, tetapi daftar belum berhasil dimuat ulang. Muat ulang halaman.'); }
            }
            if (input.current) input.current.value = '';
        });
    }
    return <details className="cms-section my-4" data-excel-import={resource}><summary>{'Impor Excel dan pengelolaan data'}</summary><div className="cms-section-body min-w-0">
        <p className="cms-help mb-3">Unduh template kosong atau data saat ini untuk {title.toLowerCase()}, isi sheet Data mulai baris 2, lalu unggah kembali. {mode === 'replace' ? 'Seluruh data bagian ini akan diganti setelah konfirmasi.' : 'Data lama tetap ada.'} {onApply ? 'Unduhan berisi isian pada draf editor saat ini, termasuk perubahan yang belum disimpan. Hasil unggahan masuk ke draf editor.' : 'Isi kolom Tampil dengan Ya untuk menerbitkan, atau Tidak untuk menyimpan sebagai draf.'}</p>
        <p className="cms-help mb-3">Format .xlsx, maksimal 10 MB dan {maxRows ?? 2000} baris{maxRows ? ' pada daftar ini' : ' per unggahan'}. Urutan mengikuti baris Excel. Baca sheet Panduan, lihat sheet Contoh, lalu isi sheet Data. Klik sel untuk melihat petunjuk. Sel merah perlu diperbaiki; peringatan Excel bisa terlewati saat menyalin-tempel, jadi tetap periksa hasil unggah di CMS.</p>
        {(research || onApply) && <div className="mb-4 space-y-3"><p className="cms-help"><strong>Bagian tujuan: {categoryLabel}{yearKey ? (year ? `, tahun ${year}` : ", seluruh tahun") : ""}.</strong> Penggantian hanya berlaku pada daftar ini dan cakupan tujuan di bawah. Filter pencarian tabel tidak membatasi impor.</p>{yearKey && <label className="cms-field"><span>Tahun tujuan impor (kosong berarti seluruh tahun)</span><input className="cms-input" inputMode="numeric" maxLength={4} value={year} disabled={!!busy || disabled} onChange={e=>setYear(e.target.value.replace(/\D/g,''))}/></label>}
        {available.label && <p className="cms-help">Cakupan tujuan: {available.label}</p>}
        <label className="cms-field"><span>Metode impor Excel</span><select value={mode} disabled={!!busy || disabled} onChange={e=>{setMode(e.target.value as 'append'|'replace');setPreview(null);setBulk(null);setFileName('');if(input.current)input.current.value='';}}><option value="append">Tambahkan ke data yang ada</option><option value="replace">Ganti seluruh data bagian ini</option></select></label>{research && <div className="cms-actions"><button type="button" className="cms-button" disabled={!!busy || disabled} onClick={()=>void bulkPreview('clear')}>Kosongkan data</button>{available.hasDefaults && <button type="button" className="cms-button" disabled={!!busy || disabled} onClick={()=>void bulkPreview('defaults')}>Pulihkan data bawaan</button>}{available.hasBackup && <button type="button" className="cms-button" disabled={!!busy || disabled} onClick={()=>void bulkPreview('undo')}>{backupId ? 'Pulihkan cadangan yang dipilih' : 'Pulihkan cadangan terakhir'}</button>}</div>}<p className="cms-help">{onApply ? "Penggantian masuk ke draf. Simpan melalui editor setelah memeriksa hasilnya. Batal pada editor tidak menerbitkan perubahan." : "Data bawaan adalah isi awal proyek. Cadangan menyimpan kondisi sebelum tindakan massal pada cakupan yang sama. Pilih cadangan melalui riwayat di bawah. Tindakan belum dijalankan sebelum konfirmasi."}</p></div>}
        {bulk && <div className="cms-notice" role="region" aria-label="Konfirmasi pengelolaan data"><strong>{bulk.action==='clear'?'Kosongkan data':bulk.action==='defaults'?'Pulihkan data bawaan':'Pulihkan cadangan'}: {bulk.label}</strong><p>{bulk.oldCount} baris saat ini akan diganti dengan {bulk.newCount} baris. Kondisi saat ini disimpan sebagai cadangan.</p><div className="cms-actions mt-3"><button type="button" className="cms-button primary" disabled={!!busy || disabled} onClick={()=>void bulkCommit()}>Ya, lanjutkan perubahan</button><button type="button" className="cms-button" disabled={!!busy} onClick={()=>setBulk(null)}>Batalkan</button></div></div>}
        {research && !!available.backups?.length && <div className="cms-section mb-4 p-4"><h3>Riwayat cadangan bagian ini</h3><p className="cms-help">Pilih waktu cadangan sebelum memulihkan. Cadangan terakhir dan cadangan berumur kurang dari 30 hari tidak dapat dihapus. Tidak ada penghapusan otomatis.</p><label className="cms-field"><span>Cadangan untuk dipulihkan</span><select value={backupId} disabled={!!busy || disabled} onChange={e=>{setBackupId(e.target.value);setBulk(null);}}><option value="">Cadangan terakhir</option>{available.backups.map(item=><option key={item.id} value={item.id}>{new Date(item.createdAt.replace(' ','T')).toLocaleString('id-ID')} ({item.id.slice(0,8)})</option>)}</select></label><div className="cms-actions"><button type="button" className="cms-button" disabled={!!busy || disabled || historyPage <= 1} onClick={()=>{setBackupId('');setBulk(null);setHistoryPage(v=>v-1);}}>Lebih baru</button><span>Halaman {available.historyPage ?? 1} dari {available.historyLast ?? 1}</span><button type="button" className="cms-button" disabled={!!busy || disabled || historyPage >= (available.historyLast ?? 1)} onClick={()=>{setBackupId('');setBulk(null);setHistoryPage(v=>v+1);}}>Lebih lama</button>{available.backups.find(item=>item.id===backupId)?.canDelete && <button type="button" className="cms-button danger" disabled={!!busy || disabled} onClick={()=>{
            if(window.prompt('Hapus permanen cadangan yang dipilih? Ketik HAPUS CADANGAN. Data aktif tidak berubah.') !== 'HAPUS CADANGAN') return;
            void perform('save',async()=>{await result(await cmsFetch(`/api/admin/excel/${resource}/bulk-preview`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,action:'delete-backup',backupId,confirmation:'HAPUS CADANGAN'})}));setBackupId('');setBulk(null);setMessage('Cadangan lama dihapus. Data aktif tidak berubah.');});
        }}>Hapus cadangan lama yang dipilih</button>}</div></div>}
        {disabled && <p className="cms-help mb-3">Simpan perubahan yang sedang diedit sebelum melakukan impor.</p>}
        <div className="cms-actions mb-3"><button type="button" className="cms-button" disabled={!!busy || disabled} onClick={() => void download()}>{busy === 'template' ? 'Menyiapkan template…' : '1. Unduh template Excel'}</button><button type="button" className="cms-button" disabled={!!busy || disabled} onClick={()=>void download(true)}>Unduh data saat ini</button><label className="cms-button" htmlFor={id}>2. Pilih Excel yang sudah diisi</label><CmsInput ref={input} id={id} type="file" accept=".xlsx" disabled={!!busy || disabled} className="sr-only" onChange={e => void upload(e.target.files?.[0])}/>{fileName&&<span className="cms-help break-all">{fileName}</span>}</div>
        {busy && <p role="status" className="cms-help">{busy === 'preview' ? 'Memeriksa isi Excel…' : busy === 'save' ? 'Memproses data…' : 'Menyiapkan unduhan…'}</p>}
        {error && <div className="cms-notice error" role="alert">{error}</div>}{message && <div className="cms-notice success" role="status">{message}</div>}
        {preview && <div className="mt-4"><p className="font-semibold mb-2">Hasil pemeriksaan: {preview.total} baris dibaca</p><p className="cms-help mb-3">{preview.validCount} baris valid {preview.duplicates} baris sama dilewati {preview.errorCount} kesalahan. Belum ada data yang disimpan.</p>
            {mode==='replace' && <p className="cms-notice">Konfirmasi penggantian {categoryLabel} {preview.scopeLabel ? `(${preview.scopeLabel})` : ""}: {onApply ? "isi daftar pada draf" : `${preview.oldCount} baris lama`} menjadi {preview.validCount} baris baru. {onApply ? "Periksa kembali sebelum menyimpan draf." : "Cadangan disimpan sebelum penggantian."}</p>}
            {!!preview.errorCount && <><p className="cms-notice error" role="alert">Perbaiki semua kesalahan di Excel, lalu unggah ulang. Maksimal 100 kesalahan ditampilkan.</p><button type="button" className="cms-button" onClick={()=>{
                const cells=(row:unknown[])=>row.map(v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@-]/,"'$&")+'"').join(',');
                const csv=['Baris,Kolom,Kesalahan',...preview.errors.map(e=>cells([e.row,e.field,e.message]))].join('\r\n');
                const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='kesalahan-impor.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
            }}>Unduh daftar kesalahan yang ditampilkan</button><ol className="space-y-2">{preview.errors.map((e,i) => <li key={i} className="border rounded p-3 text-sm break-words"><strong>Baris Excel {e.row}: {e.field}</strong><p className="mt-1">{e.message}</p>{e.hint&&<p className="cms-help mt-2">{e.hint}</p>}</li>)}</ol></>}
            {!!preview.rows.length && <><p className="cms-help my-2">Pratinjau {Math.min(20, preview.rows.length)} baris pertama yang valid. Geser tabel ke samping untuk melihat kolom lainnya.</p><div className="cms-table-wrap max-h-80 overflow-auto"><table className="cms-table"><thead><tr><th>Baris Excel</th>{Object.entries(preview.columns).map(([key,col]) => <th key={key}>{col.label}</th>)}</tr></thead><tbody>{preview.rows.slice(0,20).map(row => <tr key={row.number}><td>{row.number}</td>{Object.keys(preview.columns).map(key => <td key={key} className="max-w-72 whitespace-pre-wrap break-words">{typeof row.values[key] === 'boolean' ? row.values[key] ? 'Ya' : 'Tidak' : Array.isArray(row.values[key]) ? row.values[key].join('\n') : String(row.values[key] ?? '')}</td>)}</tr>)}</tbody></table></div></>}
            <div className="cms-actions mt-3"><button type="button" className="cms-button primary" disabled={!!busy || disabled || !!preview.errorCount || !preview.validCount} onClick={() => void confirm()}>{onApply ? (mode === 'replace' ? '3. Ganti isi daftar pada draf' : '3. Tambahkan ke draf') : '3. Konfirmasi impor'}</button><button type="button" className="cms-button" disabled={!!busy} onClick={() => {setPreview(null); if(input.current)input.current.value='';}}>Batalkan</button></div>
        </div>}
    </div></details>;
}

export function appendUnique<T>(current: T[], incoming: T[], limit: number): { rows: T[]; added: number } {
    const fingerprint = (v: any): string => v && typeof v === 'object' ? JSON.stringify(v, (_k,x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))) : x) : JSON.stringify(v);
    const seen = new Set(current.map(fingerprint)); const rows = [...current];
    for (const item of incoming) { const key = fingerprint(item); if (!seen.has(key)) { rows.push(item); seen.add(key); } }
    if (rows.length > limit) throw new Error(`Daftar ini maksimal ${limit} baris. Saat ini ${current.length} baris, sedangkan hasil gabungan ${rows.length} baris. Kurangi isi Excel lalu unggah ulang.`);
    return { rows, added: rows.length - current.length };
}

export function StructuredExcel({ value, sample, onChange, name, context, labels = {}, limit = 200 }: { value: any[]; sample: any; onChange: (v: any[]) => void; name: string; context: string; labels?: Record<string,string>; limit?:number }) {
    const leaves: ExcelColumn[] = [];
    function scan(v: any, path: string, label: string) {
        if (Array.isArray(v)) { if (!v.length || typeof v[0] === 'string') leaves.push({ key: path, label, type: 'lines' }); return; }
        if (v && typeof v === 'object') { Object.entries(v).forEach(([k,x]) => scan(x, path ? `${path}.${k}` : k, label ? `${label}: ${labels[k]??k}` : (labels[k]??k))); return; }
        leaves.push({ key: path || 'value', label: label || name, type: typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v === 'boolean' ? 'boolean' : 'text' });
    }
    scan(sample, '', '');
    if (!leaves.length || leaves.length > 80) return null;
    function blank(v:any):any { if(Array.isArray(v))return [];if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,blank(x)]));return typeof v==='number'?0:typeof v==='boolean'?false:''; }
    return <ExcelImport resource="rows" title={name} context={context} columns={leaves} maxRows={limit} currentRows={value.map(item=>Object.fromEntries(leaves.map(col=>[col.key,col.key==='value' && (typeof item!=='object'||item===null) ? item : col.key.split('.').reduce((v,key)=>v?.[key],item)])))} onApply={(incoming, mode) => {
        const converted = incoming.map(row => { if (!sample || typeof sample !== 'object') return row.value; const item = blank(sample); for (const col of leaves) { const parts = col.key.split('.'); let target=item; parts.slice(0,-1).forEach(key=>{target=target[key];}); target[parts[parts.length-1]]=row[col.key]; } return item; });
        const next=appendUnique(mode === 'replace' ? [] : value,converted,limit); onChange(next.rows); return next.added;
    }}/>;
}
