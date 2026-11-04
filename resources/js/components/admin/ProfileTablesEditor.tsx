import {exportProfileDraft,importProfileDraft,PROFILE_DRAFT_MAX_BYTES} from '@/lib/profile-drafts';
import { numericInput } from '@/lib/field-validation';
import { CmsInput } from '@/components/admin/CmsInput';
import ProfileExcel from './ProfileExcel';
import OrganisationEditor from './OrganisationEditor';
import { ProfileField as Field, ProfileCellFields, ClusterHeadingFields } from './ProfileContentFields';
import { splitClusterTitle, splitYearHeading } from '@/lib/profile-headings';
import { displayOrder, storedOrder } from '@/lib/display-order';
import { documentKind } from '@/Pages/Public/ProfileDocument';
import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateProfileContent, type ProfileCell, type ProfileTable, type ProfileTableRecord } from "@/lib/profile-tables";

const inputClass = "w-full border border-zinc-300 bg-white px-[12px] py-[9px] text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
const buttonClass = "border border-zinc-300 bg-white px-[12px] py-[8px] text-sm text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";
const blankCell = (): ProfileCell => ({ text: "", items: [], ordered: false });
const storageKey = "p3m-profile-table-drafts-v1";

function shift<T>(items: T[], index: number, direction: number) {
    const copy = [...items];
    [copy[index], copy[index + direction]] = [copy[index + direction], copy[index]];
    return copy;
}

export default function ProfileTablesEditor({organisationOnly=false, sectionGroup,onRecordsLoaded}:{organisationOnly?:boolean; sectionGroup?:string;onRecordsLoaded?:(records:ProfileTableRecord[])=>void}) {
    const [records, setRecords] = useState<ProfileTableRecord[]>([]);
    const [drafts, setDrafts] = useState<Record<string, ProfileTableRecord>>({});
    const [orderInputs,setOrderInputs]=useState<Record<string,string>>({});
    const [selected, setSelected] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importing,setImporting]=useState(false);
    const fileInput=useRef<HTMLInputElement>(null),recordsCallback=useRef(onRecordsLoaded);recordsCallback.current=onRecordsLoaded;
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [ready, setReady] = useState(false);
    const [storageWarning, setStorageWarning] = useState("");
    const controller = useRef<AbortController | null>(null);
    const dirty = Object.keys(drafts).length > 0 || Object.keys(orderInputs).length > 0;

    const load = useCallback(async () => {
        controller.current?.abort();
        const request = new AbortController();
        controller.current = request;
        setLoading(true); setError("");
        try {
            const res = await cmsFetch("/api/admin/profile-tables", { signal: request.signal, cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(res.status === 401 ? "Sesi berakhir. Login kembali di tab baru; draf di sini tetap ada." : res.status === 403 ? "Editor ini khusus superadmin." : data.error || "Tabel tidak dapat dimuat.");
            if (request.signal.aborted) return false;
            if(!Array.isArray(data))throw new Error("Jawaban server tidak valid. Draf tetap dipertahankan.");
            setRecords(data);recordsCallback.current?.(data);
            setSelected(current => data.some((item: ProfileTableRecord) => item.id === current) ? current : data[0]?.id ?? "");
            return true;
        } catch (err) {
            if (!request.signal.aborted) setError(err instanceof Error ? err.message : "Jaringan bermasalah. Coba muat ulang.");
            return false;
        } finally { if (!request.signal.aborted) setLoading(false); }
    }, []);

    useEffect(() => {
        let active = true;
        async function initialize() {
        await load();
        if (!active) return;
        try {
            const saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
            if (saved && typeof saved === "object" && !Array.isArray(saved)) {
                const restored: Record<string, ProfileTableRecord> = {};
                for (const [id, value] of Object.entries(saved)) {
                    const item = value as ProfileTableRecord;
                    if (item?.id === id && typeof item.version === "number" && Array.isArray(item.content?.tables)) restored[id] = item;
                }
                setDrafts(restored);
                if (Object.keys(restored).length) setMessage("Draf dari tab ini dipulihkan. Periksa isinya sebelum menyimpan.");
            }
        } catch { setStorageWarning("Penyimpanan draf di browser tidak tersedia. Unduh draf sebelum meninggalkan halaman."); }
        setReady(true);
        }
        void initialize();
        return () => { active = false; controller.current?.abort(); };
    }, [load]);

    useEffect(() => {
        if (!ready) return;
        try { sessionStorage.setItem(storageKey, JSON.stringify(drafts)); }
        catch {
            // Kegagalan penyimpanan browser perlu terlihat; ini sinkronisasi sistem eksternal.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStorageWarning("Draf belum tersimpan di browser. Unduh draf sebelum meninggalkan halaman.");
        }
    }, [drafts, ready]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const kindsByGroup: Record<string, string[]> = {
        organisasi: ['organisation', 'institution'], pelaksanaan: ['process', 'roles'],
        klaster: ['clusters'], 'peta-jalan': ['roadmap', 'indicators'],
        'target-luaran': ['targets'], 'informasi-lain': ['general'],
    };
    const kinds = kindsByGroup[sectionGroup ?? (organisationOnly ? 'organisasi' : '')];
    const availableRecords = records.filter(item => !kinds || kinds.includes(documentKind(item.id, '')))
        .sort((a, b) => a.order - b.order);
    const activeId = availableRecords.some(item => item.id === selected) ? selected : availableRecords[0]?.id ?? '';
    useEffect(() => { setSelected(activeId); setError(''); setMessage(''); }, [activeId, sectionGroup]);
    const current = drafts[activeId] ?? availableRecords.find(item => item.id === activeId);
    const kind = documentKind(activeId, '');
    const anchor = ({institution:'struktur-organisasi',organisation:'struktur-organisasi',process:'pelaksanaan',roles:'pelaksanaan',clusters:'bidang-fokus',indicators:'peta-jalan',roadmap:'peta-jalan',targets:'target-luaran',general:'informasi-lain'})[kind];
    const isStructuralCell = (text: string) => kind === 'organisation' && ['pimpinan','operator','kelompok dosen'].includes(text.toLowerCase()) || kind === 'institution' && ['pimpinan','senat dan dewan','jabatan fungsional'].includes(text.toLowerCase());
    const change = (edit: (record: ProfileTableRecord) => void) => {
        if (!current) return;
        const next = structuredClone(current);
        edit(next);
        setDrafts(previous => ({ ...previous, [activeId]: next }));
        setMessage("");
    };
    const tableChange = (index: number, edit: (table: ProfileTable) => void) => change(record => edit(record.content.tables[index]));

    async function save() {
        if (!current) return;
        setSaving(true); setError(""); setMessage("");
        const request = new AbortController();
        const timeout = window.setTimeout(() => request.abort(), 30_000);
        try {
            const rawOrder=orderInputs[activeId]??String(availableRecords.findIndex(item=>item.id===activeId)+1);
            if(!/^\d+$/.test(rawOrder)||Number(rawOrder)<1||Number(rawOrder)>availableRecords.length)throw new Error(`Isi urutan bagian antara 1 dan ${availableRecords.length}.`);
            if (!Number.isInteger(current.order) || current.order < 0) throw new Error("Urutan harus bilangan bulat minimal 1.");
            const content = structuredClone(current.content);
            if (['roadmap', 'indicators'].includes(kind)) {
                for (const table of content.tables) for (const row of table.rows) {
                    const heading = row[0];
                    if (heading && typeof heading === 'object' && !/^(19|20)\d{2}$/.test(splitYearHeading(heading.text).year)) {
                        throw new Error('Isi tahun dengan 4 digit, antara 1900 dan 2099.');
                    }
                }
            }
            for (const table of content.tables) for (const row of table.rows) for (const cell of row) {
                if (cell !== null && typeof cell === "object") cell.items = cell.items.filter(item => item.trim());
            }
            const { id, ...payload } = { ...current, groupPosition:Number(rawOrder), content: validateProfileContent(content) };
            const res = await cmsFetch(`/api/admin/profile-tables/${encodeURIComponent(id)}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: request.signal,
            });
            const result = await res.json();
            if (!res.ok) throw new Error(res.status === 401 ? "Sesi berakhir. Login kembali di tab baru lalu coba simpan. Draf tetap ada." : res.status === 403 ? "Akun ini tidak diizinkan menyimpan. Draf tetap ada." : result.errors ? Object.values(result.errors).flat().join(" ") : result.message || result.error || "Penyimpanan gagal. Draf tetap ada.");
            for (const [index, table] of payload.content.tables.entries()) {
                if (table.connections !== undefined && JSON.stringify(result.content?.tables?.[index]?.connections) !== JSON.stringify(table.connections)) {
                    throw new Error('Server belum mengembalikan pengaturan panah yang sama. Draf tetap disimpan di browser. Pastikan semua file revisi sudah disalin, lalu gunakan Ambil data tersimpan sebelum mencoba lagi.');
                }
            }
            for (const [index, table] of payload.content.tables.entries()) {
                if (table.diagram !== undefined && JSON.stringify(result.content?.tables?.[index]?.diagram) !== JSON.stringify(table.diagram)) {
                    throw new Error('Server belum menyimpan susunan bagan yang sama. Draf tetap tersedia. Pastikan semua file revisi sudah disalin, lalu periksa versi terbaru.');
                }
            }
            setOrderInputs(items=>{const next={...items};delete next[id];return next;});
            setRecords(items => items.map(item => item.id === id ? result : item));
            await load();
            setDrafts(items => { const copy = { ...items }; delete copy[id]; return copy; });
            setMessage(result.published ? "Tersimpan. Isi bagian ini sudah diperbarui di halaman profil." : "Tersimpan dengan status disembunyikan. Bagian ini tidak tampil di halaman profil.");
        } catch (err) {
            setError(request.signal.aborted ? "Waktu tunggu habis. Periksa versi terbaru sebelum mengulang; draf tetap ada." : err instanceof Error ? err.message : "Jaringan bermasalah. Draf tetap ada; silakan coba lagi.");
        } finally { window.clearTimeout(timeout); setSaving(false); }
    }

    function downloadDraft() {
        if (!current) return;
        const position=Number(orderInputs[activeId]??availableRecords.findIndex(item=>item.id===activeId)+1);
        if(!Number.isInteger(position)||position<1||position>availableRecords.length){setError(`Isi urutan bagian antara 1 dan ${availableRecords.length} sebelum mengunduh draf.`);return;}
        const url = URL.createObjectURL(new Blob([JSON.stringify(exportProfileDraft(current,position), null, 2)], { type: "application/json" }));
        const a = document.createElement("a"); a.href = url; a.download = `draf-profil-${current.id}.json`; a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function uploadDraft(file:File){
        if(!current)return;
        setImporting(true);setError('');setMessage('');
        try{
            if(!file.name.toLowerCase().endsWith('.json'))throw new Error('Pilih berkas draf dengan akhiran .json.');
            if(file.size>PROFILE_DRAFT_MAX_BYTES)throw new Error('Ukuran draf maksimal 1 MB.');
            let raw:unknown;try{raw=JSON.parse((await file.text()).replace(/^\uFEFF/,''));}catch{throw new Error('Berkas JSON tidak dapat dibaca. Gunakan berkas dari Unduh draf (.json).');}
            const imported=importProfileDraft(raw,current,availableRecords.length);
            if((drafts[activeId]||orderInputs[activeId]!==undefined)&&!window.confirm('Ganti draf bagian ini dengan isi berkas? Data di server belum berubah sampai Anda klik Simpan bagian ini.'))return;
            setDrafts(items=>({...items,[activeId]:imported.record}));
            if(imported.position!==undefined)setOrderInputs(items=>({...items,[activeId]:String(imported.position)}));
            setMessage('Draf JSON berhasil dimuat. Periksa isinya, lalu klik Simpan bagian ini. Bagian lain tidak berubah.');
        }catch(err){setError(err instanceof Error?err.message:'Draf tidak dapat diunggah.');}
        finally{setImporting(false);if(fileInput.current)fileInput.current.value='';}
    }
    async function reloadSaved(){
        if((drafts[activeId]||orderInputs[activeId]!==undefined)&&!window.confirm('Buang perubahan pada bagian ini dan ambil data tersimpan dari server? Unduh draf (.json) terlebih dahulu jika ingin menyimpan salinannya.'))return;
        const id=activeId;
        if(await load()){
            setDrafts(items=>{const next={...items};delete next[id];return next;});
            setOrderInputs(items=>{const next={...items};delete next[id];return next;});
            setMessage('Data tersimpan dari server berhasil diambil. Ini bukan unggah draf.');
        }
    }

    return <div className="space-y-[24px]">
        <div>
            <h2 className="text-xl font-semibold">{organisationOnly?'Struktur organisasi':'Isi bagian yang dipilih'}</h2>
            <p className="mt-[8px] text-sm leading-relaxed text-zinc-600">{organisationOnly?'Pilih P3M atau Politeknik Negeri Madiun, lalu klik kotak pada bagan untuk mengubah isinya.':'Pilih bagian yang sudah ada, lalu ubah isinya. Setiap bagan, klaster, tahun, dan target memakai data halaman profil yang sama.'}</p>
        </div>
        {error && <div role="alert" className="border-l-2 border-red-700 pl-[12px] text-sm text-red-800">{error} {/sesi.*berakhir|login kembali|masuk kembali/i.test(error)&&<a href="/admin/login" target="_blank" rel="noopener noreferrer" className="underline">Buka login (tab baru)</a>}</div>}
        {message && <p role="status" className="text-sm text-green-800">{message}</p>}
        {storageWarning && <p role="status" className="text-sm text-amber-800">{storageWarning}</p>}
        {loading ? <p role="status">Memuat bagian profil…</p> : <>
            {availableRecords.length === 0 && <p className="text-sm">Belum ada data pada bagian ini. Periksa data proyek atau Sampah; editor tidak membuat data contoh otomatis.</p>}
            <fieldset disabled={saving||importing} className="min-w-0 space-y-[24px] disabled:opacity-70">
                {availableRecords.length>0&&<div className="block text-sm font-medium"><label htmlFor="profile-document" hidden={organisationOnly}>Pilih bagan atau bagian</label>
                    <select hidden={organisationOnly} id="profile-document" aria-describedby="profile-document-status" className={`${inputClass} mt-[6px]`} value={activeId} onChange={e => { setSelected(e.target.value); setError(""); setMessage(""); }}>
                        {availableRecords.map(item => <option key={item.id} value={item.id}>{drafts[item.id] ? "* " : ""}{item.name}{drafts[item.id] ? " (belum disimpan)" : item.published ? "" : " (disembunyikan)"}</option>)}
                    </select>
                    {organisationOnly&&<div className="cms-actions my-3" role="group" aria-label="Pilih organisasi">{availableRecords.map(item=><button type="button" key={item.id} className={`cms-button ${activeId===item.id?'primary':''}`} aria-pressed={activeId===item.id} onClick={()=>{setSelected(item.id);setError('');setMessage('');}}>{documentKind(item.id,'')==='organisation'?'P3M':'Politeknik Negeri Madiun'}{drafts[item.id]?' *':''}</button>)}</div>}
                    <div id="profile-document-status" aria-live="polite" className="mt-[8px]">
                        {drafts[activeId] ? <span className="inline-flex items-center gap-[6px] rounded border border-amber-300 bg-amber-50 px-[10px] py-[4px] text-xs font-semibold text-amber-900"><span aria-hidden="true">*</span> Belum disimpan</span>
                            : current && !current.published ? <span className="inline-flex items-center gap-[6px] rounded border border-slate-300 bg-slate-100 px-[10px] py-[4px] text-xs font-semibold text-slate-700"><span aria-hidden="true">○</span> Disembunyikan</span> : null}
                    </div>
                </div>}
                {current && <>
                    <div className="grid gap-[16px] md:grid-cols-2">
                        {!['roadmap','indicators'].includes(kind) && <Field label="Judul yang tampil di profil" value={current.name} onChange={value => change(r => { r.name = value; })} />}
                        
                        {kind === 'targets' && current.content.tables.map((table, ti) => <Field key={`note-${ti}`} label="Caption di bawah target (kosongkan untuk menyembunyikan)" value={table.note} multiline onChange={value=>tableChange(ti,t=>{t.note=value;})}/>)}
                        <label className="block text-sm font-medium">Urutan bagian
                            <input type="number" min={1} step={1} className={`${inputClass} mt-[6px]`} max={availableRecords.length} value={orderInputs[activeId]??String(availableRecords.findIndex(item=>item.id===activeId)+1)} onChange={e => {
                                const value=e.target.value;setOrderInputs(previous=>({...previous,[activeId]:value}));setError('');
                                const position=Number(value);
                                if(value!==''&&Number.isInteger(position)&&position>=1&&position<=availableRecords.length)change(()=>{});
                            }} onBlur={e=>{const value=e.target.value,position=Number(value);if(value===''||!Number.isInteger(position)||position<1||position>availableRecords.length)setError(`Isi urutan bagian antara 1 dan ${availableRecords.length}, sesuai jumlah bagian pada pilihan ini.`);}} aria-describedby="profile-order-help"/>
                            <small id="profile-order-help" className="block text-xs text-slate-500 mt-1">Isi angka 1 sampai {availableRecords.length}. Angka boleh dikosongkan sementara saat mengganti urutan.</small>
                        </label>
                        <label className="flex items-center gap-[8px] text-sm"><CmsInput type="checkbox" checked={current.published} onChange={e => change(r => { r.published = e.target.checked; })} />Tampilkan bagian di halaman profil</label>
                    </div>
                    {current.content.tables.map((table, ti) => <details key={`${activeId}-${ti}`} open={current.content.tables.length === 1 || undefined} className="cms-section">
                        <summary className="cursor-pointer font-semibold">{kind === 'clusters' ? <><span className="cms-profile-cluster-label">{splitClusterTitle(table.title).label}</span>{splitClusterTitle(table.title).title || table.caption}</> : table.title || table.caption || `Bagian ${ti + 1}`}</summary>
                        <div className="cms-section-body space-y-[20px]">
                            <div className="grid gap-[16px] md:grid-cols-2">
                                {kind === 'clusters' ? <ClusterHeadingFields value={table.title} onChange={value => tableChange(ti, t => { t.title = value; })} />
                                    : kind === 'institution' ? <Field label="Judul di atas bagan (kosongkan untuk judul bawaan)" value={table.title} multiline onChange={value => tableChange(ti, t => { t.title = value;if(t.diagram)t.diagram.heading=value||'Struktur organisasi\nPoliteknik Negeri Madiun'; })} />
                                    : (table.title || records.find(record => record.id === activeId)?.content.tables[ti]?.title) && <Field label="Subjudul bagian" value={table.title} onChange={value => tableChange(ti, t => { t.title = value; })} />}
                                
                                {(table.intro || records.find(record => record.id === activeId)?.content.tables[ti]?.intro) && <Field label="Pengantar bagian" value={table.intro} multiline onChange={value => tableChange(ti, t => { t.intro = value; })} />}
                                {kind !== 'targets' && (table.note || records.find(record => record.id === activeId)?.content.tables[ti]?.note) && <Field label="Catatan di bawah bagian" value={table.note} multiline onChange={value => tableChange(ti, t => { t.note = value; })} />}
                            </div>
                            {table.numeric && <p className="text-sm text-zinc-600">Target harus bilangan bulat nol atau lebih. Kosongkan angka untuk tanda “-”. Tahun harus berurutan naik; sesuaikan juga judul dan pengantar jika periode berubah.</p>}
                            {(table.numeric || ['clusters','general','roadmap','indicators'].includes(kind)) && <div className="cms-row">
                                {table.headers.map((header, ci) => (table.numeric && ci === 0 || ['roadmap','indicators'].includes(kind) && ci === 0) ? null : <Field policy={table.numeric ? 'year' : 'text'} key={ci} label={table.numeric ? `Tahun ${ci}` : `Judul kolom ${['roadmap','indicators'].includes(kind) ? ci : ci + 1}`} value={header} onChange={value => tableChange(ti, t => { t.headers[ci] = value; })} />)}
                            </div>}
                            {['institution','organisation'].includes(kind)&&!table.numeric&&table.headers.length===2?<OrganisationEditor table={table} kind={kind as 'institution'|'organisation'} onChange={next=>tableChange(ti,t=>Object.assign(t,next))}/>:<><ProfileExcel table={table} context={`${activeId}:${ti}`} onChange={next=>tableChange(ti,t=>Object.assign(t,next))}/>
                            <div className="space-y-[24px]">
                                {table.rows.map((row, ri) => <details key={`${activeId}-${ti}-${ri}`} className="cms-profile-entry" open={table.rows.length <= 2 || undefined}>
                                    <summary>{row[0] !== null && typeof row[0] === 'object' ? row[0].text || row[0].items[0] || `Butir ${ri + 1}` : `Butir ${ri + 1}`}</summary>
                                    <div className={`grid gap-[16px] ${table.numeric ? "sm:grid-cols-3" : "cms-profile-cell-grid"}`}>
                                        {row.map((cell, ci) => ci === 0 && cell !== null && typeof cell === 'object' && isStructuralCell(cell.text) ? null : <div key={ci} className={`min-w-0 ${table.numeric && ci === 0 ? "sm:col-span-3" : ci === 1 && row[0] !== null && typeof row[0] === "object" && isStructuralCell(row[0].text) ? "cms-profile-cell-wide" : ""}`}>
                                            {table.numeric && ci > 0 ? <label className="block text-sm font-medium">{table.headers[ci]}
                                                <CmsInput type="number" min={0} step={1} className={`${inputClass} mt-[6px]`} value={typeof cell === "number" && Number.isFinite(cell) ? cell : ""} onChange={e => tableChange(ti, t => { t.rows[ri][ci] = e.target.value === "" ? null : numericInput(e.target.value); })} />
                                            </label> : cell !== null && typeof cell === "object" && <ProfileCellFields
                                                cell={cell} original={(() => { const original = records.find(record => record.id === activeId)?.content.tables[ti]?.rows[ri]?.[ci]; return original && typeof original === 'object' ? original : undefined; })()}
                                                label={table.headers[ci]} kind={kind} column={ci}
                                                onChange={value => tableChange(ti, t => { t.rows[ri][ci] = value; })} />}
                                        </div>)}
                                    </div>
                                    <div className="mt-[12px] flex flex-wrap gap-[8px]">
                                        <button type="button" className={buttonClass} disabled={ri === 0} onClick={() => tableChange(ti, t => { t.rows = shift(t.rows, ri, -1); })}>Naikkan baris {ri + 1}</button>
                                        <button type="button" className={buttonClass} disabled={ri === table.rows.length - 1} onClick={() => tableChange(ti, t => { t.rows = shift(t.rows, ri, 1); })}>Turunkan baris {ri + 1}</button>
                                        <button type="button" className={buttonClass} onClick={() => { if (window.confirm(`Hapus baris ${ri + 1} dari draf?`)) tableChange(ti, t => { t.rows.splice(ri, 1); }); }}>Hapus baris {ri + 1}</button>
                                    </div>
                                </details>)}
                            </div>
                            <div className="flex flex-wrap gap-[8px]">
                                <button type="button" className={buttonClass} disabled={table.rows.length >= 80} onClick={() => tableChange(ti, t => { t.rows.push(t.headers.map((_, ci) => t.numeric && ci > 0 ? null : blankCell())); })}>Tambah baris</button>
                            </div>
                            </>}
                        </div>
                    </details>)}
                    {current.content.tables.length === 0 && <p className="text-sm text-zinc-600">Dokumen tanpa tabel tidak tampil di halaman publik, meskipun statusnya terbit.</p>}
                    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-[12px] border-t border-zinc-300 bg-white py-[16px]">
                        <button type="button" className="bg-zinc-900 px-[20px] py-[10px] text-sm text-white disabled:opacity-40" disabled={!drafts[activeId]} onClick={() => void save()}>{saving ? "Menyimpan…" : "Simpan bagian ini"}</button>
                        <button type="button" className={buttonClass} onClick={downloadDraft}>Unduh draf (.json)</button>
                        <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="Berkas draf profil JSON" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadDraft(file);}}/>
                        <button type="button" className={buttonClass} onClick={()=>fileInput.current?.click()}>{importing?'Membaca draf…':'Unggah draf (.json)'}</button>
                        <button type="button" className={buttonClass} onClick={()=>void reloadSaved()}>Ambil data tersimpan</button>
                        <p className="basis-full text-xs text-zinc-600">Draf .json adalah salinan bagian yang dipilih, bukan Excel. Unggah draf untuk memulihkannya. Ambil data tersimpan untuk membatalkan perubahan lokal dan membaca data dari server.</p>
                        <a href={`/profil#${anchor}`} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">Lihat halaman publik ↗</a>
                        {drafts[activeId] && <span className="text-sm text-amber-800">Ada perubahan belum disimpan.</span>}
                    </div>
                </>}
            </fieldset>
        </>}
        {!loading && records.length === 0 && <button type="button" className={buttonClass} onClick={() => void load()}>Coba muat lagi</button>}
    </div>;
}
