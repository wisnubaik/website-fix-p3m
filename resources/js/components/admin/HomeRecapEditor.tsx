import { numericInput } from '@/lib/field-validation';
import { CmsInput } from '@/components/admin/CmsInput';
import ExcelImport from './ExcelImport';
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { cmsFetch } from '@/lib/cms-fetch';
import { managedRequest } from './managed-site';

type Row = {id:string;group:string;label:string;value:number;order:number;published:boolean};
const GROUPS = [
    ['rekap-batch-1-penelitian','Proposal penelitian - Batch I'],
    ['rekap-batch-1-pkm','Proposal PkM - Batch I'],
    ['pendanaan-resmi-2026','Kartu pendanaan'],
    ['rekap-batch-2-penelitian','Proposal penelitian - Batch II'],
    ['rekap-batch-2-pkm','Proposal PkM - Batch II'],
    ['diterima-batch-2','Diterima - Batch II'],
];
export default function HomeRecapEditor() {
    const [rows,setRows]=useState<Row[]>([]); const [saved,setSaved]=useState<Record<string,string>>({});
    const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');
    useEffect(()=>{cmsFetch('/api/admin/stat-entries').then(async response=>{if(!response.ok)throw new Error('Rekap belum dapat dimuat.');return response.json();}).then((data:Row[])=>{setRows(data);setSaved(Object.fromEntries(data.map(row=>[row.id,JSON.stringify(row)])));}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
    const dirty=rows.some(row=>saved[row.id]!==JSON.stringify(row));
    useEffect(()=>{const listener=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',listener);const off=router.on('before',()=>{if(dirty&&!window.confirm('Ada rekap yang belum disimpan. Tinggalkan halaman?'))return false;});return()=>{window.removeEventListener('beforeunload',listener);off();};},[dirty]);
    function change(id:string,patch:Partial<Row>){setRows(current=>current.map(row=>row.id===id?{...row,...patch}:row));}
    async function save(row:Row){setBusy(row.id);setError('');setMessage('');try{
        if(!row.label.trim()||!Number.isInteger(row.value)||row.value<0)throw new Error('Isi nama kategori dan jumlah berupa bilangan bulat minimal 0.');
        const isNew=row.id.startsWith('new-');const {id,group,label,value,published}=row;const body={group,label,value,published};
        const result=await managedRequest(`/api/admin/stat-entries${isNew?'':`/${id}`}`,isNew?'POST':'PUT',body);
        const stored:Row={id:result.id,group:result.group,label:result.label,value:result.value,order:result.order,published:result.published};
        setRows(current=>current.map(item=>item.id===id?stored:item));setSaved(current=>({...current,[stored.id]:JSON.stringify(stored)}));setMessage('Baris tersimpan. Baris yang dicentang Tampil langsung diperbarui di beranda.');
    }catch(e){setError((e as Error).message);}finally{setBusy('');}}
    async function remove(row:Row){if(!window.confirm(`Hapus “${row.label||'baris baru'}” dari rekap?`))return;setBusy(row.id);setError('');try{if(!row.id.startsWith('new-'))await managedRequest(`/api/admin/stat-entries/${row.id}`,'DELETE',{});setRows(current=>current.filter(item=>item.id!==row.id));}catch(e){setError((e as Error).message);}finally{setBusy('');}}
    if(loading)return <p role="status">Memuat rekap…</p>;
    return <div><h2 className="font-semibold text-lg mb-2">Rekap angka beranda</h2><p className="cms-help mb-5">Ubah nama kategori dan jumlah pada baris yang sama, lalu klik Simpan baris. Total kartu proposal dihitung dari jumlah baris yang ditampilkan. Setiap kartu pendanaan memiliki label lengkap sendiri, termasuk tahun.</p>{error&&<div role="alert" className="cms-notice error">{error}</div>}{message&&<div role="status" className="cms-notice success">{message}</div>}
        {GROUPS.map(([group,title])=><details key={group} className="cms-section" open><summary>{title}<span className="cms-count">{rows.filter(row=>row.group===group&&row.published).reduce((sum,row)=>sum+(Number.isFinite(row.value)?row.value:0),0)} judul pada isian</span></summary><div className="cms-section-body"><ExcelImport resource="stat-entries" title={title} scope={{group}} columns={[{key:'label',label:'Nama kategori'},{key:'value',label:'Jumlah'}]} disabled={!!busy||dirty} onImported={async()=>{const response=await cmsFetch('/api/admin/stat-entries');if(!response.ok)throw new Error('Daftar belum dapat dimuat.');const data:Row[]=await response.json();setRows(data);setSaved(Object.fromEntries(data.map(row=>[row.id,JSON.stringify(row)])));}}/>
            {rows.filter(row=>row.group===group).map(row=><div key={row.id} className="border-b pb-4 mb-4"><div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3"><label className="cms-field"><span>{group==='pendanaan-resmi-2026'?'Label lengkap kartu':'Nama kategori'}</span><CmsInput value={row.label} onChange={e=>change(row.id,{label:e.target.value})}/></label><label className="cms-field"><span>Jumlah</span><CmsInput type="number" min={0} step={1} value={row.value} onChange={e=>change(row.id,{value:numericInput(e.target.value)})}/></label></div><div className="cms-actions justify-between"><label className="cms-inline-label"><CmsInput type="checkbox" checked={row.published} onChange={e=>change(row.id,{published:e.target.checked})}/>Tampil di beranda</label><div className="cms-actions"><button type="button" className="cms-button small primary" disabled={!!busy||saved[row.id]===JSON.stringify(row)} onClick={()=>void save(row)}>{busy===row.id?'Memproses…':'Simpan baris'}</button><button type="button" className="cms-button small danger" disabled={!!busy} onClick={()=>void remove(row)}>Hapus</button></div></div></div>)}
            <button type="button" className="cms-add" disabled={!!busy} onClick={()=>setRows([...rows,{id:`new-${crypto.randomUUID()}`,group,label:'',value:0,order:Math.max(-1,...rows.filter(row=>row.group===group).map(row=>row.order))+1,published:true}])}>+ Tambah {group==='pendanaan-resmi-2026'?'kartu pendanaan':'kategori'}</button>
        </div></details>)}
    </div>;
}
