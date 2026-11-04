import { fieldPolicy } from '@/lib/field-validation';
import { numericInput } from '@/lib/field-validation';
import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import { cmsGeneration } from '@/lib/cms-fetch';
import ExcelImport from '@/components/admin/ExcelImport';
import { displayOrder, storedOrder } from '@/lib/display-order';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { researchUrl, type ResearchEntry, type ResearchForm } from '@/types';

type Props = {
    entries: { data: ResearchEntry[]; total: number; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null };
    categories: Record<string, string>;
    filters: { category: string; q: string; trash: boolean };
};

function Editor({ entry, category, close }: { entry: ResearchEntry | null; category: string; close: () => void }) {
    const form = useForm<ResearchForm>(entry ? {
        category: entry.category, year: entry.year, title: entry.title, leader: entry.leader,
        member1: entry.member1 ?? '', member2: entry.member2 ?? '', funding: entry.funding,
        order: entry.order, published: entry.published,
    } : { category, year: String(new Date().getFullYear()), title: '', leader: '', member1: '', member2: '', funding: 0, order: 0, published: false });

    function submit(event: FormEvent) {
        event.preventDefault();
        const options = { headers: { 'X-CMS-Generation': cmsGeneration() }, preserveScroll: true, onSuccess: close };
        if (entry) form.put('/admin/riset-entries/' + entry.id, options);
        else form.post('/admin/riset-entries', options);
    }
    return <section aria-label={entry ? 'Edit entri' : 'Tambah entri'} className="bg-white border border-blue-200 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold mb-5">{entry ? 'Edit entri' : 'Tambah entri'}</h2>
        {Object.keys(form.errors).length > 0 && <p role="alert" className="cms-error mb-4">Periksa isian di bawah. Perubahan Anda belum disimpan.</p>}
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
            {([['year', 'Tahun'], ['leader', 'Ketua'], ['member1', 'Anggota 1'], ['member2', 'Anggota 2']] as const).map(([key, label]) => <label key={key}>
                {label}<CmsInput policy={fieldPolicy("riset-entries", key)} className="cms-input" value={form.data[key]} required={key === 'year' || key === 'leader'} onChange={e => form.setData(key, e.target.value)} />
                {form.errors[key] && <span className="cms-error">{form.errors[key]}</span>}
            </label>)}
            <label className="md:col-span-2">Judul
                <CmsTextarea autoFocus className="cms-input min-h-24" required value={form.data.title} onChange={e => form.setData('title', e.target.value)} />
                {form.errors.title && <span className="cms-error">{form.errors.title}</span>}
            </label>
            {([['funding', 'Pendanaan (rupiah)'], ['order', 'Urutan dalam tahun']] as const).map(([key, label]) => <label key={key}>
                {label}<CmsInput className="cms-input" type="number" min={key === 'order' ? 1 : 0} max={key === 'order' ? 2147483648 : 2147483647} step={1} required value={key === 'order' ? displayOrder(form.data[key]) : form.data[key]} onChange={e => form.setData(key, key === 'order' ? storedOrder(e.target.value) : numericInput(e.target.value))} />
                {form.errors[key] && <span className="cms-error">{form.errors[key]}</span>}
            </label>)}
            <label className="md:col-span-2 flex items-center gap-3"><CmsInput type="checkbox" checked={form.data.published} onChange={e => form.setData('published', e.target.checked)} />Publikasikan di situs</label>
            <div className="md:col-span-2 flex gap-3">
                <button className="cms-button" disabled={form.processing}>{form.processing ? 'Menyimpan…' : 'Simpan'}</button>
                <button type="button" onClick={close} disabled={form.processing} className="cms-button-secondary">Batal</button>
            </div>
        </form>
    </section>;
}

export default function Research({ entries, categories, filters }: Props) {
    const [query, setQuery] = useState(filters.q);
    const [editing, setEditing] = useState<ResearchEntry | null | undefined>(undefined);
    const [deleting, setDeleting] = useState<ResearchEntry | null>(null);
    const [busy, setBusy] = useState(false);
    function browse(extra: Partial<typeof filters> = {}) {
        router.get('/admin/riset-entries', { ...filters, ...extra, trash: (extra.trash ?? filters.trash) ? 1 : 0 }, { preserveState: false });
    }
    return <AdminLayout title="Penelitian & PkM">{!filters.trash&&<ExcelImport resource="riset-entries" title={categories[filters.category]??'Penelitian dan PkM'} scope={{category:filters.category}} disabled={editing!==undefined||busy} onImported={()=>browse()}/>}
        <Head title="Kelola Penelitian & PkM" />
        <p className="text-slate-500 mb-6">Perubahan data terpublikasi akan memperbarui tabel, grafik, dan rekap pada situs.</p>
        <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(categories).map(([key, label]) => <button key={key} disabled={editing !== undefined} onClick={() => browse({ category: key })} className={filters.category === key ? 'cms-button' : 'cms-button-secondary'}>{label}</button>)}
        </div>
        {editing !== undefined && <Editor key={editing?.id ?? 'new'} entry={editing} category={filters.category} close={() => setEditing(undefined)} />}
        <div className="flex flex-wrap gap-3 items-center mb-5">
            <form onSubmit={e => { e.preventDefault(); browse({ q: query }); }} className="flex gap-2 flex-1">
                <CmsInput aria-label="Cari judul atau ketua" placeholder="Cari judul atau ketua…" className="cms-input !mt-0 max-w-sm" value={query} onChange={e => setQuery(e.target.value)} />
                <button disabled={editing !== undefined} className="cms-button-secondary">Cari</button>
            </form>
            <button disabled={editing !== undefined} onClick={() => browse({ trash: !filters.trash })} className="cms-button-secondary">{filters.trash ? 'Kembali ke data aktif' : 'Buka sampah'}</button>
            {!filters.trash && <button disabled={editing !== undefined} onClick={() => setEditing(null)} className="cms-button">+ Tambah entri</button>}
            <Link href={researchUrl(filters.category)} className="text-sm text-blue-700">Lihat di situs ↗</Link>
        </div>
        {deleting && <div role="alertdialog" aria-label="Konfirmasi pindah ke sampah" className="p-5 bg-amber-50 border border-amber-200 mb-5 rounded-xl">
            <p>Pindahkan <strong>{deleting.title || '(Judul belum diisi)'}</strong> ke sampah? Entri akan hilang dari situs dan dapat dipulihkan.</p>
            <div className="flex gap-3 mt-3"><button disabled={busy} className="cms-button" onClick={() => {
                setBusy(true);
                router.delete('/admin/riset-entries/' + deleting.id, { headers: { 'X-CMS-Generation': cmsGeneration() }, preserveScroll: true, onSuccess: () => setDeleting(null), onFinish: () => setBusy(false) });
            }}>Pindahkan</button><button disabled={busy} onClick={() => setDeleting(null)} className="cms-button-secondary">Batal</button></div>
        </div>}
        <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr>
                {['Tahun', 'Judul & tim', 'Pendanaan', 'Status', 'Aksi'].map(label => <th className="p-4" key={label}>{label}</th>)}
            </tr></thead><tbody>
                {entries.data.map(entry => <tr key={entry.id} className="border-t border-slate-100">
                    <td className="p-4 align-top">{entry.year}</td>
                    <td className="p-4 min-w-64 max-w-xl"><p className="font-semibold">{entry.title || '(Judul belum diisi)'}</p><p className="text-slate-500 mt-1">{[entry.leader, entry.member1, entry.member2].filter(Boolean).join(' ')}</p></td>
                    <td className="p-4 whitespace-nowrap">Rp {new Intl.NumberFormat('id-ID').format(entry.funding)}</td>
                    <td className="p-4">{filters.trash ? 'Sampah' : entry.published ? 'Terbit' : 'Draft'}</td>
                    <td className="p-4"><div className="flex gap-3">
                        {filters.trash ? <button className="text-blue-700" disabled={busy} onClick={() => {
                            setBusy(true); router.post('/admin/riset-entries/' + entry.id + '/restore', {}, { headers: { 'X-CMS-Generation': cmsGeneration() }, preserveScroll: true, onFinish: () => setBusy(false) });
                        }}>Pulihkan</button> : <>
                            <button className="text-blue-700" disabled={editing !== undefined} onClick={() => setEditing(entry)}>Edit</button>
                            <button className="text-red-700" disabled={editing !== undefined} onClick={() => setDeleting(entry)}>Sampah</button>
                        </>}
                    </div></td>
                </tr>)}
                {!entries.data.length && <tr><td colSpan={5} className="p-10 text-center text-slate-500">Tidak ada entri yang sesuai.</td></tr>}
            </tbody></table>
        </div>
        <div className="flex flex-wrap gap-4 items-center justify-between mt-5 text-sm">
            <p>{entries.total} entri Halaman {entries.current_page} dari {entries.last_page}</p>
            <div className="flex gap-3">
                {entries.prev_page_url && <Link className="cms-button-secondary" href={entries.prev_page_url}>← Sebelumnya</Link>}
                {entries.next_page_url && <Link className="cms-button-secondary" href={entries.next_page_url}>Berikutnya →</Link>}
            </div>
        </div>
    </AdminLayout>;
}
