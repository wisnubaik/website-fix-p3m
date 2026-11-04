import OrganisationArrowCanvas from './OrganisationArrowCanvas';
import {useState} from 'react';
import type {ProfileTable} from '@/lib/profile-tables';
import {defaultConnections,organisationNodes,validateConnections} from '@/lib/organisation-connections';
export default function OrganisationConnectionsEditor({table,kind,onChange}:{table:ProfileTable;kind:string;onChange:(table:ProfileTable)=>void}) {
    const [visual,setVisual]=useState(false);
    const [from,setFrom]=useState(''),[to,setTo]=useState(''),[editing,setEditing]=useState<number|null>(null),[error,setError]=useState('');
    const nodes=organisationNodes(table),links=table.connections??[];
    function save(){try{const next=[...links];if(editing===null)next.push({from,to});else next[editing]={from,to};validateConnections(table,next);onChange({...table,connections:next});setEditing(null);setFrom('');setTo('');setError('');}catch(e){setError((e as Error).message);}}
    return <details className="cms-panel my-4"><summary className="font-semibold cursor-pointer">Atur hubungan dan panah antar-kotak</summary>
        <p className="cms-help my-3">Pilih kotak asal dan tujuan. Kotak tujuan ditempatkan di bawah induknya, dengan panah penghubung. Susunan otomatis menjaga teks tetap terbaca. Perubahan menunggu Simpan bagian ini.</p>
        {table.connections===undefined?<><p className="cms-help mb-3">Aktifkan untuk memakai susunan berdasarkan hubungan. {kind==='institution'?'Bagan PNM akan beralih ke hierarki otomatis. Jurusan dan program studi tetap terhubung; hubungan lain dipilih sesuai struktur institusi.':'Hubungan pimpinan, operator, dan kelompok dosen yang sudah ada menjadi hubungan awal.'}</p><button type="button" className="cms-button" onClick={()=>onChange({...table,connections:defaultConnections(table,kind)})}>Aktifkan pengaturan panah</button></>:<>
        <button type="button" className="cms-button primary mb-3" aria-expanded={visual} onClick={()=>setVisual(!visual)}>{visual?'Tutup pengaturan visual':'Atur Panah'}</button>{visual&&<OrganisationArrowCanvas table={table} onChange={onChange}/>}
        <div className="cms-row">{[['Kotak asal',from,setFrom],['Kotak tujuan',to,setTo]].map(([label,value,setter])=><label className="cms-field" key={label as string}><span>{label as string}</span><select value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)}><option value="">Pilih kotak</option>{nodes.map(node=><option key={node.id} value={node.id}>{node.label} (bagian {node.row+1}, {node.entry===-1?'judul bagian':`kotak ${node.entry+1}`})</option>)}</select></label>)}</div>
        <div className="cms-actions"><button type="button" className="cms-button" disabled={!from||!to} onClick={save}>{editing===null?'Tambah panah':'Terapkan perubahan panah'}</button>{editing!==null&&<button type="button" className="cms-button" onClick={()=>{setEditing(null);setFrom('');setTo('');}}>Batal</button>}</div>
        {error&&<p role="alert" className="cms-notice error">{error}</p>}
        <ol className="my-4 space-y-3">{links.map((link,index)=><li key={`${link.from}-${link.to}`}><span>{index+1}. {nodes.find(node=>node.id===link.from)?.label} menuju {nodes.find(node=>node.id===link.to)?.label}</span><div className="cms-actions"><button type="button" className="cms-link" onClick={()=>{setEditing(index);setFrom(link.from);setTo(link.to);setError('');}}>Ubah</button><button type="button" className="cms-link" onClick={()=>{onChange({...table,connections:links.filter((_,i)=>i!==index)});setEditing(null);setFrom('');setTo('');}}>Hapus panah</button></div></li>)}</ol>
        {!links.length&&<p className="cms-help">Belum ada panah. Setiap kotak berdiri sendiri sampai diberi hubungan.</p>}
        <button type="button" className="cms-button" onClick={()=>{if(window.confirm('Kembali ke susunan awal dan hapus pengaturan panah khusus dari draf? Isi kotak tetap dipertahankan.')){const next={...table};delete next.connections;onChange(next);setEditing(null);setError('');}}}>Gunakan susunan awal</button>
        </>}
    </details>;
}
