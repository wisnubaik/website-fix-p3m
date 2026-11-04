import { CmsInput } from '@/components/admin/CmsInput';
import { useEffect, useRef, useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';
import { managedRequest, type ManagedPage } from './managed-site';
type Template = {id:string;name:string;description:string;sections:string[]};
export default function CreatePageDialog({onClose,onCreated,prefix='',source}:{onClose:()=>void;onCreated:(page:ManagedPage)=>void;prefix?:string;source?:ManagedPage}) {
    const [title,setTitle]=useState(source ? `${source.title ?? source.document?.title} (Salinan)` : '');
    const [path,setPath]=useState(source ? `${source.path}-salinan` : prefix);
    const [manual,setManual]=useState(false);const [template,setTemplate]=useState('information');
    const [templates,setTemplates]=useState<Template[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);
    useEffect(()=>{dialog.current?.showModal();const controller=new AbortController();cmsFetch('/api/admin/site-menu',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('Template belum dapat dimuat. Tutup lalu coba lagi.');setTemplates((await r.json()).templates);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>{controller.abort();dialog.current?.close();};},[]);
    async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const data=await managedRequest('/api/admin/managed-pages','POST',{title,path,template,...(source?{sourceId:source.id,sourceVersion:source.version}:{})});onCreated(data.page);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
    return <dialog ref={dialog} className="cms-modal cms-create-page-dialog backdrop:bg-slate-900/60 m-auto" onCancel={e=>{e.preventDefault();if(!busy)onClose();}} aria-labelledby="create-page-title"><form onSubmit={create}>
        <h2 id="create-page-title">{source?'Duplikat halaman':'Tambah halaman'}</h2><p className="mt-2 mb-6">{source?'Isi draf terakhir yang tersimpan akan disalin. Salinan tidak langsung diterbitkan dan belum masuk menu.':'Pilih susunan awal, isi kontennya, lalu pratinjau sebelum diterbitkan. Bagian kosong tidak tampil kepada pengunjung.'}</p>
        <label className="cms-field"><span>Nama halaman</span><CmsInput autoFocus required value={title} maxLength={180} onChange={e=>{setTitle(e.target.value);if(!manual)setPath(prefix+e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));}} placeholder="Contoh: Kerja Sama Industri"/></label>
        <p className="cms-help mb-3">Alamat: /{path.replace(/^\/+/, '') || 'nama-halaman'}</p>
        <details className="mb-5"><summary className="cms-link cursor-pointer">Sesuaikan alamat halaman</summary><label className="cms-field mt-3"><span>Alamat halaman</span><CmsInput aria-label="Alamat halaman" value={path} onChange={e=>{setManual(true);setPath(e.target.value);}}/><small>Alamat dibuat dari nama halaman. Setelah dibuat, alamat dikunci agar tautan tetap konsisten.</small></label></details>
        {!source&&<fieldset><legend className="font-semibold mb-3">Pilih template</legend><div className="cms-template-options">{templates.map(item=><button type="button" key={item.id} className="cms-template text-left" aria-pressed={template===item.id} onClick={()=>setTemplate(item.id)}><strong>{item.name}</strong><small>{item.description}</small><ol className="cms-template-preview">{item.sections.map((section,i)=><li key={section}><span>{i+1}</span>{section}</li>)}</ol></button>)}</div><p className="cms-help mt-3">Header, footer, warna, dan jenis huruf mengikuti website P3M. Bagian dapat ditambah, dipindahkan, atau dihapus.</p></fieldset>}
        {error&&<div role="alert" className="cms-notice error">{error}</div>}
        <div className="cms-actions justify-end mt-5"><button type="button" className="cms-button" disabled={busy} onClick={onClose}>Batal</button><button className="cms-button primary" disabled={busy||!templates.length}>{busy?'Membuat…':source?'Buat salinan draf':'Buat halaman draf'}</button></div>
    </form></dialog>;
}
