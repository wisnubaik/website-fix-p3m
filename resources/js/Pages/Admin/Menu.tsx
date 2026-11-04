import { CmsInput } from '@/components/admin/CmsInput';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import CreatePageDialog from '@/components/admin/CreatePageDialog';
import { type ManagedPage, type MenuEntry } from '@/components/admin/managed-site';
import { cmsFetch } from '@/lib/cms-fetch';

type Navigation = { items: MenuEntry[]; version: number; hasChanges: boolean };
type Limits = { roots: number; children: number };
function newItem(): MenuEntry { return { id: crypto.randomUUID(), label: 'Menu baru', pageId: '', href: '', visible: true, children: [] }; }

async function menuRequest(method: 'GET' | 'PUT', body?: unknown) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
        const response = await cmsFetch('/api/admin/site-menu', {
            method, signal: controller.signal, headers: { 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(' ') : data.error || data.message || 'Permintaan belum berhasil. Silakan coba kembali.');
        return data;
    } catch (error) {
        if (controller.signal.aborted) throw new Error('Server belum memberikan jawaban. Isian menu tetap ada di layar. Jika tadi menyimpan atau menerbitkan, buka Menu & navigasi di tab baru untuk memeriksa hasilnya sebelum mencoba lagi.');
        if (error instanceof TypeError) throw new Error('Koneksi ke server terputus. Isian menu tetap ada di layar. Periksa koneksi dan status penyimpanan sebelum mencoba lagi.');
        throw error;
    } finally {
        window.clearTimeout(timer);
    }
}

function MenuCard({item,index,number,controls,children}:{item:MenuEntry;index:number;number:string;controls:ReactNode;children:ReactNode}) {
    const [expanded,setExpanded]=useState(index===0||(!item.pageId&&!item.href&&!item.children.length));
    const bodyId=`menu-body-${item.id}`;
    return <section className="cms-menu-item cms-menu-card"><div className="cms-menu-card-heading">
        <button type="button" className="cms-menu-disclosure" aria-expanded={expanded} aria-controls={bodyId} onClick={()=>setExpanded(!expanded)}><span className="cms-menu-number">{number}</span><span className="cms-menu-card-title"><strong>{item.label||'Menu tanpa nama'}</strong><small>{item.children.length?`${item.children.length} submenu`:'Tautan halaman'}{!item.visible?' Disembunyikan':''}</small></span><span aria-hidden="true">{expanded?'▾':'▸'}</span></button>
        <div className="cms-menu-position">{controls}</div></div><div id={bodyId} className="cms-menu-body" hidden={!expanded}>{children}</div></section>;
}

function NavigationPreview({onClose}:{onClose:()=>void}) {
    const dialog=useRef<HTMLDialogElement>(null);
    const [size,setSize]=useState<'desktop'|'mobile'>('desktop');
    useEffect(()=>{dialog.current?.showModal();},[]);
    return <dialog ref={dialog} className="cms-modal cms-navigation-dialog m-auto" onCancel={onClose} aria-labelledby="navigation-preview-title">
        <div className="cms-heading"><div><h2 id="navigation-preview-title">Pratinjau menu</h2><p className="cms-help mt-2">Menampilkan draf tersimpan dengan ukuran layar yang dipilih. Pengunjung tetap melihat versi terbit.</p></div><button type="button" className="cms-button" onClick={onClose}>Tutup</button></div>
        <div className="cms-actions mb-3" aria-label="Ukuran pratinjau"><button type="button" className={`cms-button ${size==='desktop'?'primary':''}`} aria-pressed={size==='desktop'} onClick={()=>setSize('desktop')}>Desktop</button><button type="button" className={`cms-button ${size==='mobile'?'primary':''}`} aria-pressed={size==='mobile'} onClick={()=>setSize('mobile')}>Ponsel</button><a href="/?cms_preview=1" target="_blank" rel="noreferrer" className="cms-link">Buka di tab baru ↗</a></div>
        <p className="cms-help mb-3">Jika menu tidak muat dalam satu baris, situs menyediakan tombol Menu. Pada layar kecil, pratinjau desktop dapat digeser ke samping.</p>
        <div className="cms-menu-preview"><iframe key={size} title={`Pratinjau menu ${size==='desktop'?'desktop':'ponsel'}`} src="/?cms_preview=1" style={{width:size==='desktop'?1280:390}} /></div>
    </dialog>;
}

export default function MenuEditor({ navigation, pages: initialPages, limits }: { navigation: Navigation; pages: ManagedPage[]; limits: Limits }) {
    const [items, setItems] = useState(navigation.items);
    const [version, setVersion] = useState(navigation.version);
    const [saved, setSaved] = useState(JSON.stringify(navigation.items));
    const [hasChanges, setHasChanges] = useState(navigation.hasChanges);
    const [pages, setPages] = useState(initialPages);
    const [previewOpen,setPreviewOpen]=useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [createFor, setCreateFor] = useState<string | null>(null);
    const [createdPage, setCreatedPage] = useState<ManagedPage | null>(null);
    const requestInFlight = useRef(false);
    const dirty = JSON.stringify(items) !== saved;
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;
    const rootLimitReached = items.length >= limits.roots;
    const pendingPages = items.flatMap(item => item.visible ? [item, ...item.children.filter(child => child.visible)] : [])
        .filter(item => item.pageId && pages.some(page => page.id === item.pageId && !page.archived && !page.published));

    useEffect(() => {
        const unload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', unload);
        const remove = router.on('before', () => { if (dirtyRef.current && !window.confirm('Perubahan menu belum disimpan. Tinggalkan halaman?')) return false; });
        return () => { window.removeEventListener('beforeunload', unload); remove(); };
    }, []);

    function update(id: string, patch: Partial<MenuEntry>) {
        setItems(list => list.map(item => item.id === id ? { ...item, ...patch } : { ...item, children: item.children.map(child => child.id === id ? { ...child, ...patch } : child) }));
    }
    function reposition(id:string,target:number,parentId?:string) {
        const reorder=(list:MenuEntry[])=>{const index=list.findIndex(item=>item.id===id);if(index<0||target<0||target>=list.length)return list;const copy=[...list];const [item]=copy.splice(index,1);copy.splice(target,0,item);return copy;};
        setItems(list=>parentId?list.map(item=>item.id===parentId?{...item,children:reorder(item.children)}:item):reorder(list));
    }
    function remove(id: string) {
        if (window.confirm('Hapus item dari menu? Halaman tujuannya tetap tersimpan.')) setItems(list => list.filter(item => item.id !== id).map(item => ({ ...item, children: item.children.filter(child => child.id !== id) })));
    }
    async function save(action: 'save' | 'publish' | 'discard') {
        if (requestInFlight.current) return;
        if (action === 'discard' && !window.confirm('Kembalikan draf seluruh menu dan submenu ke susunan yang sedang terbit? Perubahan draf menu akan diganti. Isi halaman tidak ikut berubah.')) return;
        requestInFlight.current = true;
        setBusy(true); setError(''); setMessage('');
        try {
            const data = await menuRequest('PUT', { version, action, items });
            setItems(data.navigation.items); setVersion(data.navigation.version); setHasChanges(data.navigation.hasChanges); setSaved(JSON.stringify(data.navigation.items));
            if (action === 'discard') setCreatedPage(null);
            setMessage(action === 'publish' ? 'Menu telah diterbitkan.' : action === 'discard' ? 'Draf menu sudah dikembalikan ke versi terbit. Isi halaman tidak berubah.' : 'Draf menu berhasil disimpan. Halaman tujuan yang masih draf tetap tersimpan dan belum tampil untuk pengunjung.');
        } catch (error) { setError((error as Error).message); }
        finally { requestInFlight.current = false; setBusy(false); }
    }
    async function refreshPages() {
        if (requestInFlight.current) return;
        requestInFlight.current = true; setBusy(true); setError(''); setMessage('');
        try {
            const data = await menuRequest('GET');
            setPages(data.pages);
            setMessage('Status halaman sudah diperbarui. Isian menu Anda tetap dipertahankan.');
        } catch (error) { setError((error as Error).message); }
        finally { requestInFlight.current = false; setBusy(false); }
    }
    function pageCreated(page: ManagedPage) {
        const targetId = createFor;
        setPages(list => [...list, { ...page, title: page.document.title }]);
        const attach = (item: MenuEntry): MenuEntry => item.id === targetId ? {
            ...item, pageId: page.id, href: '', label: !item.label.trim() || item.label === 'Menu baru' ? page.document.title.slice(0, 60) : item.label,
        } : { ...item, children: item.children.map(attach) };
        setItems(list => list.map(attach));
        setCreatedPage(page); setCreateFor(null); setError(''); setMessage('');
    }
    function renderItem(item: MenuEntry, index: number, parent?: MenuEntry): ReactNode {
        const page = pages.find(page => page.id === item.pageId);
        const siblings = parent ? parent.children : items;
        const childLimitReached = item.children.length >= limits.children;
        const number=parent?`${items.findIndex(root=>root.id===parent.id)+1}.${index+1}`:String(index+1);
        return <MenuCard key={item.id} item={item} index={index} number={number} controls={<>
            <label className="cms-menu-order-select"><span>Urutan</span><select aria-label={`Urutan ${item.label}`} value={index} disabled={busy} onChange={event=>reposition(item.id,Number(event.target.value),parent?.id)}>{siblings.map((sibling,i)=><option key={sibling.id} value={i}>{i+1}</option>)}</select><small>{page?`Alamat: ${page.path}`:item.href?'Gunakan alamat lengkap untuk situs di luar P3M.':'Judul kelompok membuka daftar submenu.'}</small></label>
            <button type="button" className="cms-button small" aria-label={`Naikkan ${item.label}`} disabled={!index||busy} onClick={()=>reposition(item.id,index-1,parent?.id)}>↑</button>
            <button type="button" className="cms-button small" aria-label={`Turunkan ${item.label}`} disabled={index===siblings.length-1||busy} onClick={()=>reposition(item.id,index+1,parent?.id)}>↓</button>
        </>}>
            <div className="cms-row">
                <label className="cms-field"><span>Nama yang tampil di navbar</span><CmsInput maxLength={60} value={item.label} onChange={event => update(item.id, { label: event.target.value })} /></label>
                <label className="cms-field"><span>Halaman yang dibuka saat diklik</span><select aria-label="Tujuan menu" value={item.pageId || (item.href ? 'external' : '')} onChange={event => update(item.id, { pageId: event.target.value === 'external' ? '' : event.target.value, href: event.target.value === 'external' ? 'https://' : '' })}>
                    <option value="">{parent ? 'Pilih halaman…' : 'Judul kelompok (memiliki submenu)'}</option>
                    {item.pageId&&(!page||page.archived)&&<option value={item.pageId} disabled>{page?.title||item.label} ({page?.archived?'Di Sampah':'Tidak tersedia'})</option>}
                    {pages.filter(page => page.path !== '@global' && !page.archived).map(page => <option key={page.id} value={page.id}>{page.path==='/'?'Beranda':page.title||page.document?.title} ({page.path}){!page.published?' Draf':''}</option>)}
                    <option value="external">Tautan lain / situs eksternal</option>
                </select><small>{page?`Alamat: ${page.path}`:item.href?'Gunakan alamat lengkap untuk situs di luar P3M.':'Judul kelompok membuka daftar submenu.'}</small></label>
            </div>
            {!item.pageId && item.href && <label className="cms-field"><span>Alamat tujuan</span><CmsInput value={item.href} onChange={event => update(item.id, { href: event.target.value })} placeholder="https://…" /></label>}
            {item.pageId&&(!page||page.archived)&&<p className="cms-notice">Halaman tujuan {page?.archived?'berada di Sampah':'tidak tersedia'}. Pilih tujuan lain atau sembunyikan menu ini. Untuk memulihkan halaman, buka <a href="/admin/halaman" target="_blank" rel="noreferrer" className="cms-link">Halaman → Sampah ↗</a>.</p>}
            {page && !page.archived && <p className="cms-help mb-3">{page.published ? 'Halaman tujuan sudah terbit.' : 'Halaman tujuan masih draf. Menu boleh disimpan sebagai draf.'} <a href={`/admin/halaman/${page.id}`} target="_blank" rel="noreferrer" className="cms-link">{page.published ? 'Edit halaman' : 'Isi dan terbitkan halaman'} ↗</a></p>}
            <div className="cms-actions justify-between">
                <label className="cms-inline-label"><CmsInput type="checkbox" checked={item.visible} onChange={event => update(item.id, { visible: event.target.checked })} />Tampilkan di menu</label>
                <button type="button" className="cms-link text-xs" onClick={() => { setError(''); setCreateFor(item.id); }}>+ Buat halaman untuk menu ini</button>
            </div>
            <div className="cms-menu-delete"><button type="button" className="cms-link" disabled={busy} onClick={()=>remove(item.id)}>Hapus menu ini</button><small className="cms-help">Halaman tujuannya tetap tersimpan.</small></div>
            {!parent && <div className={item.children.length ? 'cms-menu-child' : ''}>
                {item.children.map((child, childIndex) => renderItem(child, childIndex, item))}
                <button type="button" className="cms-add mt-4" disabled={busy || childLimitReached} onClick={() => setItems(list => list.map(root => root.id === item.id && root.children.length < limits.children ? { ...root, children: [...root.children, newItem()] } : root))}>+ Tambah submenu</button>
                {item.children.length > 0 && <p className="cms-help mt-2">{item.children.length} dari {limits.children} submenu.{childLimitReached ? ' Batas tercapai. Hapus submenu yang tidak diperlukan untuk menambah yang baru.' : ''}</p>}
            </div>}
        </MenuCard>;
    }

    return <AdminLayout>
        <div className="cms-heading"><div><div className="cms-overline">Konten situs</div><h1>Menu & navigasi</h1><p>Atur nama, urutan, dan halaman tujuan navbar. Setiap menu utama dapat memiliki submenu.</p></div>
            <div><button type="button" className="cms-button primary" disabled={busy || rootLimitReached} aria-describedby="menu-count" onClick={() => setItems(list => list.length < limits.roots ? [...list, newItem()] : list)}>+ Tambah menu utama</button><p id="menu-count" className="cms-help mt-2">{items.length} dari {limits.roots} menu utama</p></div>
        </div>
        {rootLimitReached && <div className="cms-notice" role="status">Batas {limits.roots} menu utama tercapai, termasuk menu yang disembunyikan. Hapus menu yang tidak diperlukan atau gunakan submenu. Menghapus menu tidak menghapus halaman tujuannya.</div>}
        {busy && <p className="cms-notice" role="status">Sedang memproses permintaan. Tombol akan aktif kembali setelah selesai.</p>}
        {error && <div className="cms-notice error" role="alert">{error}</div>}
        {message && <div className="cms-notice success" role="status">{message}</div>}
        {createdPage && <div className="cms-notice"><strong>Halaman “{createdPage.document.title}” berhasil dibuat.</strong><p className="mt-2">Simpan draf menu untuk menyimpan tautannya. Selanjutnya, <a href={`/admin/halaman/${createdPage.id}`} target="_blank" rel="noreferrer" className="cms-link">isi dan terbitkan halaman ↗</a>. Kembali ke sini, perbarui status halaman, lalu terbitkan menu.</p></div>}
        <div className="cms-editor-grid">
            <fieldset disabled={busy} className="min-w-0"><div className="cms-template-tip"><strong>Mulai dari nama menu, lalu pilih halaman tujuannya.</strong><p className="text-sm mt-1">Nomor menunjukkan posisi di navbar. Pilih nomor urutan atau gunakan ↑ dan ↓, tanpa perlu membuka isian menu. Perubahan baru tampil setelah Terbitkan menu.</p></div>
                {items.map((item, index) => renderItem(item, index))}
                {!items.length && <div className="cms-empty">Belum ada menu. Klik Tambah menu utama untuk memulai.</div>}
            </fieldset>
            <aside className="cms-sidebar-panel">
                <div className="cms-panel"><h2>Publikasi menu</h2><p className="my-3">{dirty ? 'Ada perubahan yang belum disimpan.' : hasChanges ? 'Draf tersimpan, belum diterbitkan.' : 'Menu sesuai versi yang terbit.'}</p>
                    <div className="cms-actions">
                        <button type="button" className="cms-button" disabled={busy} onClick={() => save('save')}>Simpan draf menu</button>
                        <button type="button" className="cms-button primary" disabled={busy} onClick={() => save('publish')}>Terbitkan menu</button>
                        <button type="button" className="cms-button" disabled={dirty||busy} onClick={()=>setPreviewOpen(true)}>Pratinjau desktop & ponsel</button>{dirty&&<p className="cms-help">Simpan draf menu terlebih dahulu untuk melihat pratinjau terbaru.</p>}
                        <button type="button" className="cms-link text-xs py-2" disabled={busy} onClick={() => save('discard')}>Pulihkan draf menu ke versi terbit</button>
                    </div>
                    <p className="mt-4">Simpan draf boleh dilakukan meskipun halaman tujuan belum terbit. Terbitkan menu setelah halaman tujuan siap.</p>
                    <p className="cms-help mt-3">Pemulihan hanya mengganti draf susunan menu dan submenu. Isi halaman tidak ikut dipulihkan.</p>
                    <section className="mt-6 border-t pt-4"><h2>Status halaman tujuan</h2>
                    <p className="my-3">Setelah menerbitkan halaman di tab lain, perbarui statusnya di sini. Isian menu tidak akan hilang.</p>
                    <button type="button" className="cms-button" disabled={busy} onClick={refreshPages}>Perbarui status halaman</button>
                    {pendingPages.length > 0 ? <div className="mt-4"><p>Menu berikut menuju halaman yang masih draf:</p><ul className="mt-2 space-y-2 text-sm">{pendingPages.map(item => <li key={item.id}><a className="cms-link" href={`/admin/halaman/${item.pageId}`} target="_blank" rel="noreferrer">{item.label}: buka halaman ↗</a></li>)}</ul><p className="cms-help mt-3">Terbitkan halaman tujuan atau hilangkan centang Tampilkan di menu untuk menyembunyikannya sementara.</p></div> : <p className="cms-help mt-3">Tidak ada halaman draf pada tujuan menu yang ditampilkan.</p>}
                    </section>
                </div>
                <div className="cms-panel"><h2>Susunan ringkas</h2><ol className="space-y-3 mt-4 text-sm">{items.map((item,index) => <li key={item.id} className={item.visible ? '' : 'opacity-40'}>{index+1}. {item.label || 'Tanpa nama'}{item.children.length > 0 && <ul className="border-l pl-3 mt-2 space-y-1 text-xs">{item.children.map((child,childIndex) => <li key={child.id} className={child.visible ? '' : 'opacity-40'}>{index+1}.{childIndex+1}. {child.label || 'Tanpa nama'}</li>)}</ul>}</li>)}</ol></div>
                <Link href="/admin/halaman" className="cms-link">Kelola isi halaman →</Link>
            </aside>
        </div>
        {previewOpen&&<NavigationPreview onClose={()=>setPreviewOpen(false)}/>}
        {createFor && <CreatePageDialog onClose={() => setCreateFor(null)} onCreated={pageCreated} />}
    </AdminLayout>;
}
