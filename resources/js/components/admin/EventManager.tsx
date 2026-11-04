import { numericInput } from '@/lib/field-validation';
import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import { useEffect, useRef, useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';
import { useEditedPage } from './PageEditorContext';
import { useOptionalAdminSession } from './AdminSessionContext';
import ResourceEditor, { type FieldDef } from './ResourceEditor';
import { formatRentang } from '@/lib/format-tanggal';
import type { EventTimeline } from '@/components/ui/EventPeriods';

type Period = { id: string; acara: string; tahun: number; judul: string; tanggalMulai: string; tanggalSelesai: string | null; tempat: string | null; keterangan: string | null; timeline: string | null; published: boolean; deletedAt: string | null };
type Scheme = { id: string; acara: string; periodeId: string; nama: string; keterangan: string | null; order: number; published: boolean; deletedAt: string | null };
type PeriodForm = Omit<Period, 'id' | 'deletedAt' | 'timeline'> & { id?: string; timeline: EventTimeline[] };
type SchemeForm = { id?: string; nama: string; keterangan: string; published: boolean; order?: number };
async function request(url: string, method = 'GET', body?: unknown) {
    const response = await cmsFetch(url, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(' ') : data.message || data.error || 'Permintaan gagal. Muat ulang dan coba lagi.');
    return data;
}
export default function EventManager({ initialEvent }: { initialEvent?: string } = {}) {
    const path = useEditedPage();
    const fixed = !!initialEvent || path.endsWith('/monev') || path.endsWith('/semhas');
    const [choice, setChoice] = useState(initialEvent ?? 'monev');
    const event = initialEvent ?? (fixed ? path.split('/').pop()! : choice);
    const eventLabel = event === 'monev' ? 'Monev' : 'Seminar Hasil';
    const session = useOptionalAdminSession();
    const [periods, setPeriods] = useState<Period[]>([]);
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [periodId, setPeriodId] = useState('');
    const [schemeId, setSchemeId] = useState('');
    const [trash, setTrash] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [periodForm, setPeriodForm] = useState<PeriodForm | null>(null);
    const [schemeForm, setSchemeForm] = useState<SchemeForm | null>(null);
    const generation = useRef(0);
    async function load() {
        const ticket = ++generation.current;
        const [p, pt, s, st] = await Promise.all([
            request(`/api/admin/acara-periode?acara=${event}`), request(`/api/admin/acara-periode?acara=${event}&trash=1`),
            request(`/api/admin/acara-skema?acara=${event}`), request(`/api/admin/acara-skema?acara=${event}&trash=1`),
        ]);
        if (ticket !== generation.current) return;
        setPeriods([...p,...pt].sort((a,b) => b.tahun-a.tahun)); setSchemes([...s,...st].sort((a,b) => a.order-b.order));
    }
    useEffect(() => {
        setPeriods([]); setSchemes([]); setPeriodId(''); setSchemeId(''); setTrash(false); setPeriodForm(null); setSchemeForm(null); setError('');
        setBusy(true); void load().catch(e => setError(e.message)).finally(() => setBusy(false));
        return () => { generation.current++; };
    }, [event]);
    useEffect(() => {
        if (!periodForm && !schemeForm) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
    }, [periodForm,schemeForm]);
    const availablePeriods = periods.filter(item => trash || !item.deletedAt);
    const period = availablePeriods.find(item => item.id === periodId) ?? availablePeriods[0];
    const availableSchemes = schemes.filter(item => item.periodeId === period?.id && (trash || !item.deletedAt));
    const scheme = availableSchemes.find(item => item.id === schemeId) ?? availableSchemes[0];
    const editing = !!periodForm || !!schemeForm;
    async function perform(work: () => Promise<void>) {
        if (busy) return;
        setBusy(true); setError(''); setNotice('');
        try { await work(); await load(); }
        catch (e) { setError(e instanceof TypeError ? 'Koneksi terputus. Isian tetap tersedia; periksa daftar sebelum mencoba lagi.' : (e as Error).message); }
        finally { setBusy(false); }
    }
    function newPeriod() {
        setSchemeForm(null);
        setPeriodForm({ acara: event, tahun: new Date().getFullYear(), judul: '', tanggalMulai: '', tanggalSelesai: '', tempat: '', keterangan: '', timeline: [], published: false });
    }
    function editPeriod() {
        if (!period) return;
        setSchemeForm(null);
        setPeriodForm({ id: period.id, acara: period.acara, tahun: period.tahun, judul: period.judul, tanggalMulai: period.tanggalMulai, tanggalSelesai: period.tanggalSelesai ?? '', tempat: period.tempat ?? '', keterangan: period.keterangan ?? '', timeline: JSON.parse(period.timeline || '[]'), published: period.published });
    }
    async function savePeriod(e: React.FormEvent) {
        e.preventDefault(); if (!periodForm) return;
        const { id, ...body } = periodForm;
        await perform(async () => {
            const saved = await request(`/api/admin/acara-periode${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', { ...body, timeline: JSON.stringify(body.timeline) });
            setPeriodId(saved.id); setSchemeId(''); setPeriodForm(null); setTrash(false); setNotice('Periode tersimpan. Berikutnya, buat atau pilih skema di dalam periode ini.');
        });
    }
    async function saveScheme(e: React.FormEvent) {
        e.preventDefault(); if (!schemeForm || !period) return;
        const { id, ...body } = schemeForm;
        await perform(async () => {
            const saved = await request(`/api/admin/acara-skema${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', { ...body, acara: event, periodeId: period.id });
            setSchemeId(saved.id); setSchemeForm(null); setTrash(false); setNotice('Skema tersimpan. Kelola jadwal dan dokumen pada skema yang dipilih.');
        });
    }
    function action(resource: string, row: Period | Scheme, kind: 'toggle' | 'delete' | 'restore' | 'permanent') {
        if (['delete','permanent'].includes(kind) && !window.confirm(kind === 'permanent' ? 'Hapus permanen data ini? Tindakan ini tidak dapat dipulihkan.' : 'Pindahkan data ini ke Sampah? Data yang masih memiliki anak tidak akan dihapus.')) return;
        void perform(async () => {
            await request(`/api/admin/${resource}/${row.id}${kind === 'permanent' ? '?permanent=1' : ''}`, kind === 'toggle' ? 'PUT' : kind === 'restore' ? 'PATCH' : 'DELETE', kind === 'toggle' ? { published: !row.published } : undefined);
            setNotice('Perubahan tersimpan.');
        });
    }
    function actions(resource: string, row: Period | Scheme, edit: () => void) {
        return <div className="cms-actions mt-3">{row.deletedAt ? <><button type="button" className="cms-button" onClick={() => action(resource,row,'restore')}>Pulihkan</button>{session?.role === 'SUPERADMIN' && <button type="button" className="cms-button danger" onClick={() => action(resource,row,'permanent')}>Hapus permanen</button>}</> : <><button type="button" className="cms-button" onClick={edit}>Edit</button><button type="button" className="cms-button" onClick={() => action(resource,row,'toggle')}>{row.published ? 'Sembunyikan' : 'Terbitkan'}</button><button type="button" className="cms-button danger" onClick={() => action(resource,row,'delete')}>Hapus</button></>}</div>;
    }
    return <div>
        <h2>Periode dan skema {eventLabel}</h2>
        <p className="cms-help my-3">1. Buat periode tahunan, isi tanggal dan timeline. 2. Tambahkan skema di dalam periode. 3. Kelola jadwal dan dokumen skema. Contoh: periode 2026 memiliki Skema 1 dan Skema 2; periode 2027 mempunyai daftar skemanya sendiri.</p>
        <p className="cms-help mb-4">Penyimpanan di sini langsung mengikuti status Tampil masing-masing data. Periode, skema, dan datanya harus sama-sama diterbitkan agar terlihat di situs. Menyembunyikan induk menyembunyikan seluruh anaknya tanpa menghapus isi. Kelompok “Data lama (belum dipilah)” mempertahankan data sebelum pembaruan; ganti namanya setelah skema dikonfirmasi.</p>
        {error && <div role="alert" className="cms-notice error mb-4">{error}</div>}{notice && <div role="status" className="cms-notice success mb-4">{notice}</div>}
        {busy && <p role="status">Memproses…</p>}
        <fieldset disabled={busy || editing} className="min-w-0">
            {!fixed && <label className="cms-field"><span>Acara</span><select value={event} onChange={e => setChoice(e.target.value)}><option value="monev">Monev</option><option value="semhas">Seminar Hasil</option></select></label>}
            <div className="cms-actions mb-4"><button type="button" className="cms-button primary" onClick={newPeriod}>Tambah periode</button><label><CmsInput type="checkbox" checked={trash} onChange={e => {setTrash(e.target.checked);setPeriodId('');setSchemeId('');}}/> Sertakan Sampah</label></div>
            <label className="cms-field"><span>1. Pilih periode tahunan</span><select value={period?.id ?? ''} onChange={e => {setPeriodId(e.target.value);setSchemeId('');}}><option value="" disabled>Belum ada periode</option>{availablePeriods.map(item => <option value={item.id} key={item.id}>{item.tahun || 'Tahun belum diisi'} - {item.judul}{item.deletedAt ? ' (Sampah)' : item.published ? '' : ' (Disembunyikan)'}</option>)}</select></label>
            {period && <div className="cms-panel mb-5"><h3>{period.judul}</h3><p>{formatRentang(period.tanggalMulai,period.tanggalSelesai) || 'Tanggal belum diisi'}{period.tempat ? ` ${period.tempat}` : ''}</p>{actions('acara-periode',period,editPeriod)}</div>}
        </fieldset>
        {periodForm && <form onSubmit={savePeriod} className="cms-panel mb-6"><fieldset disabled={busy}>
            <h3 className="mb-4">{periodForm.id ? 'Edit periode' : 'Periode baru'}</h3>
            <label className="cms-field"><span>Tahun periode *</span><CmsInput policy="year" type="number" min={1900} max={2099} required value={periodForm.tahun || ''} onChange={e => setPeriodForm({...periodForm,tahun:numericInput(e.target.value)})}/></label>
            <label className="cms-field"><span>Judul periode *</span><CmsInput required maxLength={180} placeholder={`${eventLabel} 2026`} value={periodForm.judul} onChange={e => setPeriodForm({...periodForm,judul:e.target.value})}/></label>
            <div className="grid sm:grid-cols-2 gap-4">{(['tanggalMulai','tanggalSelesai'] as const).map((key,index) => <label key={key} className="cms-field"><span>{index ? 'Tanggal selesai (opsional)' : 'Tanggal mulai *'}</span><CmsInput type="date" required={!index} value={periodForm[key] ?? ''} onChange={e => setPeriodForm({...periodForm,[key]:e.target.value})}/></label>)}</div>
            <label className="cms-field"><span>Tempat (opsional)</span><CmsInput value={periodForm.tempat ?? ''} onChange={e => setPeriodForm({...periodForm,tempat:e.target.value})}/></label>
            <label className="cms-field"><span>Keterangan periode (opsional)</span><CmsTextarea rows={3} value={periodForm.keterangan ?? ''} onChange={e => setPeriodForm({...periodForm,keterangan:e.target.value})}/></label>
            <h4 className="font-semibold mt-5">Timeline periode</h4><p className="cms-help mb-3">Isi tahapan yang sudah diketahui, misalnya pengumpulan berkas atau pelaksanaan paparan. Boleh dikosongkan jika belum ditetapkan. Tanggal harus sesuai tahun periode. Urutan tampil mengikuti daftar ini.</p>
            {periodForm.timeline.map((step,index) => <div key={index} className="border p-3 mb-3"><label className="cms-field"><span>Tahap {index+1} *</span><CmsInput required maxLength={180} value={step.judul} onChange={e => setPeriodForm({...periodForm,timeline:periodForm.timeline.map((x,i)=>i===index?{...x,judul:e.target.value}:x)})}/></label><div className="grid sm:grid-cols-2 gap-3">{(['tanggalMulai','tanggalSelesai'] as const).map((key,i) => <label className="cms-field" key={key}><span>{i ? 'Selesai (opsional)' : 'Mulai *'}</span><CmsInput type="date" required={!i} value={step[key]} onChange={e => setPeriodForm({...periodForm,timeline:periodForm.timeline.map((x,j)=>j===index?{...x,[key]:e.target.value}:x)})}/></label>)}</div><div className="cms-actions"><button type="button" className="cms-button small" disabled={!index} onClick={() => {const next=[...periodForm.timeline];[next[index-1],next[index]]=[next[index],next[index-1]];setPeriodForm({...periodForm,timeline:next});}}>Naik</button><button type="button" className="cms-button small" disabled={index===periodForm.timeline.length-1} onClick={() => {const next=[...periodForm.timeline];[next[index+1],next[index]]=[next[index],next[index+1]];setPeriodForm({...periodForm,timeline:next});}}>Turun</button><button type="button" className="cms-button small danger" onClick={()=>setPeriodForm({...periodForm,timeline:periodForm.timeline.filter((_,i)=>i!==index)})}>Hapus tahap</button></div></div>)}
            <button type="button" className="cms-button mb-4" disabled={periodForm.timeline.length>=50} onClick={()=>setPeriodForm({...periodForm,timeline:[...periodForm.timeline,{judul:'',tanggalMulai:'',tanggalSelesai:''}]})}>Tambah tahapan</button>
            <label className="block mb-4"><CmsInput type="checkbox" checked={periodForm.published} onChange={e=>setPeriodForm({...periodForm,published:e.target.checked})}/> Tampilkan periode di situs</label>
            <div className="cms-actions"><button className="cms-button primary" type="submit">Simpan periode</button><button className="cms-button" type="button" onClick={()=>setPeriodForm(null)}>Batalkan</button></div>
        </fieldset></form>}
        {period && !period.deletedAt && <>
            <fieldset disabled={busy || editing} className="min-w-0">
                <div className="cms-actions mb-4"><h3>2. Skema dalam periode {period.tahun}</h3><button type="button" className="cms-button" onClick={()=>setSchemeForm({nama:'',keterangan:'',published:false})}>Tambah skema</button></div>
                <label className="cms-field"><span>Pilih skema</span><select value={scheme?.id ?? ''} onChange={e=>setSchemeId(e.target.value)}><option value="" disabled>Belum ada skema</option>{availableSchemes.map(item=><option key={item.id} value={item.id}>{item.nama}{item.deletedAt?' (Sampah)':item.published?'':' (Disembunyikan)'}</option>)}</select></label>
                {scheme && <div className="cms-panel mb-5"><h4>{scheme.nama}</h4><p className="whitespace-pre-line">{scheme.keterangan}</p>{actions('acara-skema',scheme,()=>setSchemeForm({id:scheme.id,nama:scheme.nama,keterangan:scheme.keterangan??'',published:scheme.published,order:scheme.order}))}</div>}
            </fieldset>
            {schemeForm && <form onSubmit={saveScheme} className="cms-panel mb-6"><fieldset disabled={busy}><h3 className="mb-4">Skema untuk {period.judul}</h3><label className="cms-field"><span>Nama skema *</span><CmsInput required maxLength={180} value={schemeForm.nama} onChange={e=>setSchemeForm({...schemeForm,nama:e.target.value})}/></label><label className="cms-field"><span>Informasi skema (opsional)</span><CmsTextarea rows={4} value={schemeForm.keterangan} onChange={e=>setSchemeForm({...schemeForm,keterangan:e.target.value})}/></label>{schemeForm.id && <label className="cms-field"><span>Urutan tampil (mulai 1)</span><CmsInput type="number" min={1} value={(schemeForm.order??0)+1} onChange={e=>setSchemeForm({...schemeForm,order:Math.max(0,numericInput(e.target.value)-1)})}/></label>}<label className="block mb-4"><CmsInput type="checkbox" checked={schemeForm.published} onChange={e=>setSchemeForm({...schemeForm,published:e.target.checked})}/> Tampilkan skema di situs</label><div className="cms-actions"><button type="submit" className="cms-button primary">Simpan skema</button><button type="button" className="cms-button" onClick={()=>setSchemeForm(null)}>Batalkan</button></div></fieldset></form>}
            {!editing && !scheme?.deletedAt && scheme && <EventRecords key={`${event}:${period.id}:${scheme.id}`} event={event} period={period} scheme={scheme} schemes={schemes.filter(item=>item.periodeId===period.id&&!item.deletedAt)}/>}
        </>}
    </div>;
}

function EventRecords({ event, period, scheme, schemes }: { event: string; period: Period; scheme: Scheme; schemes: Scheme[] }) {
    const [tab,setTab] = useState<'schedule'|'documents'|'parallel'>('schedule');
    const [jurusan,setJurusan] = useState('adbis');
    const [sesi,setSesi] = useState('penelitian');
    const departments = { adbis:'Administrasi Bisnis',akuntansi:'Akuntansi',teknik:'Teknik' };
    const sessions = { penelitian:'Penelitian',pkm:'Pengabdian kepada Masyarakat' };
    const scope = { periodeId:period.id,skemaId:scheme.id };
    const schemeField: FieldDef = {key:'skemaId',label:'Skema tujuan',type:'select',options:schemes.map(x=>x.id),optionLabels:Object.fromEntries(schemes.map(x=>[x.id,x.nama])),required:true,help:'Data dapat dipindahkan ke skema lain dalam periode yang sama.'};
    const scheduleScope = {acara:event,...scope,jurusan,sesi};
    const documentScope = {section:event,...scope,year:String(period.tahun),category:'Dokumen skema'};
    return <div className="mt-6"><h3>3. Data {period.tahun}  {scheme.nama}</h3><p className="cms-help my-3">Template Excel dan hasil impor terikat pada periode serta skema yang dipilih. Unggahan untuk periode atau skema lain harus menggunakan template dari bagian tujuannya.</p><div className="cms-actions mb-5"><button type="button" aria-pressed={tab==='schedule'} className={`cms-button ${tab==='schedule'?'primary':''}`} onClick={()=>setTab('schedule')}>Jadwal pemakalah</button><button type="button" aria-pressed={tab==='documents'} className={`cms-button ${tab==='documents'?'primary':''}`} onClick={()=>setTab('documents')}>Dokumen skema</button><button type="button" aria-pressed={tab==='parallel'} className={`cms-button ${tab==='parallel'?'primary':''}`} onClick={()=>setTab('parallel')}>PDF jadwal paralel Teknik</button></div>
        {tab==='parallel' ? <><p className="cms-help mb-4">Dokumen tambahan khusus Jurusan Teknik pada periode dan skema ini. Unggah PDF, isi nama tombol, lalu centang Dipublikasikan. Tidak menambah atau mengubah jadwal pemakalah. Tombol publik muncul setelah PDF diisi dan diterbitkan.</p><ResourceEditor key={`parallel:${scheme.id}`} apiPath="/api/admin/documents" listPath={`/api/admin/documents?${new URLSearchParams({section:event,...scope,category:'Jadwal paralel'})}`} extraFields={{...documentScope,category:'Jadwal paralel',groupTitle:'Teknik',kind:'pdf',name:'Lihat jadwal paralel Jurusan Teknik (PDF)'}} hasPublished defaultUploadVisibility="public" publicHref={`/layanan/${event}`} title="PDF jadwal paralel Jurusan Teknik" fields={[{key:'name',label:'Nama tombol',required:true},{key:'href',label:'Unggah PDF atau tautan langsung .pdf',type:'file',required:true}]}/></> : tab==='schedule' ? <><div className="grid sm:grid-cols-2 gap-4"><label className="cms-field"><span>Jurusan</span><select value={jurusan} onChange={e=>setJurusan(e.target.value)}>{Object.entries(departments).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="cms-field"><span>Sesi</span><select value={sesi} onChange={e=>setSesi(e.target.value)}>{Object.entries(sessions).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
            <ResourceEditor key={`${jurusan}:${sesi}`} apiPath="/api/admin/monev-slot" listPath={`/api/admin/monev-slot?${new URLSearchParams(scheduleScope)}`} extraFields={scheduleScope} hasPublished publicHref={`/layanan/${event}`} title={`Jadwal ${period.tahun} ${scheme.nama}`} tableFields={['tanggal','mulai','selesai','nama','prodi']} filters={[{key:'tanggal',label:'Tanggal'}]} sortKeys={[{key:'tanggal',dir:'asc'},{key:'order',dir:'asc'}]} fields={[schemeField,{key:'jurusan',label:'Jurusan',type:'select',options:Object.keys(departments),optionLabels:departments,required:true},{key:'sesi',label:'Sesi',type:'select',options:Object.keys(sessions),optionLabels:sessions,required:true},{key:'tanggal',label:'Tanggal paparan',type:'date',required:true},{key:'mulai',label:'Jam mulai',type:'time',required:true},{key:'selesai',label:'Jam selesai',type:'time',required:true},{key:'nama',label:'Nama pemakalah',required:true},{key:'prodi',label:'Program studi',type:'combobox',required:true},{key:'tempat',label:'Lokasi paparan'},{key:'reviewer',label:'Reviewer'},{key:'catatan',label:'Catatan jadwal',type:'textarea'},{key:'order',label:'Urutan tampil',type:'number'}]}/>
        </> : <ResourceEditor apiPath="/api/admin/documents" listPath={`/api/admin/documents?${new URLSearchParams({section:event,...scope})}`} extraFields={documentScope} hasPublished publicHref={`/layanan/${event}`} defaultUploadVisibility="public" flagEmptyField="href" title={`Dokumen ${period.tahun} ${scheme.nama}`} tableFields={['groupTitle','name','kind']} fields={[schemeField,{key:'groupTitle',label:'Kelompok dokumen',type:'combobox',required:true},{key:'name',label:'Nama dokumen',type:'textarea',required:true},{key:'kind',label:'Jenis berkas',type:'select',options:['pdf','docx','xlsx','pptx','link'],required:true},{key:'href',label:'Berkas atau tautan tujuan',type:'file'},{key:'order',label:'Urutan tampil',type:'number'}]}/>}
    </div>;
}
