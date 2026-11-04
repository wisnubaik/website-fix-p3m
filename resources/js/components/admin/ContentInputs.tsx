import { fieldPolicy } from '@/lib/field-validation';
import { numericInput } from '@/lib/field-validation';
import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import { StructuredExcel } from './ExcelImport';
import LinkInput from './LinkInput';
import { useEffect, useId, useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';
import { move } from './managed-site';

export function AssetInput({value,onChange,image=false,internalOnly=false}:{value:string;onChange:(value:string)=>void;image?:boolean;internalOnly?:boolean}) {
    const id=useId();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
    useEffect(() => { setError(''); }, [value]);
    async function upload(file?: File) {
        setError('');
        if (!file) return;
        const svg = /\.svg$/i.test(file.name);
        const limit = (svg ? 2 : 10) * 1024 * 1024;
        if (file.size > limit) { setError(`Ukuran berkas melebihi batas ${svg ? 2 : 10} MB. Pilih berkas yang lebih kecil.`); return; }
        if (image && !/\.(jpe?g|png|webp|gif|svg)$/i.test(file.name)) { setError('Format gambar harus JPG, PNG, WebP, GIF, atau SVG.'); return; }
        setBusy(true);
        try {
            const body = new FormData(); body.append('file', file); body.append('visibility', 'public');
            const response = await cmsFetch('/api/admin/upload', { method: 'POST', body });
            if (response.status === 413) throw new Error('Ukuran unggahan melebihi batas server. Kecilkan gambar atau minta pengelola memeriksa upload_max_filesize dan post_max_size pada PHP.');
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                const message = data?.errors ? Object.values(data.errors).flat().join(' ') : data?.error || data?.message;
                throw new Error(message && !/The file failed to upload/i.test(message) ? message : 'Server gagal menerima berkas. Batas unggahan PHP atau penyimpanan sementara mungkin tidak mencukupi. Coba gambar lebih kecil; jika tetap gagal, hubungi pengelola.');
            }
            if (!data?.url) throw new Error('Server tidak mengembalikan alamat berkas. Coba unggah kembali.');
            onChange(data.url);
        } catch (e) { setError(e instanceof TypeError ? 'Koneksi ke server terputus. Periksa koneksi, lalu ulangi unggahan.' : (e as Error).message); }
        finally { setBusy(false); }
    }
    return <div>{image?<><CmsInput className="cms-input" aria-label="Alamat gambar" readOnly={value.startsWith('/')} value={value} onChange={e=>{if(!e.target.value.startsWith('/'))onChange(e.target.value);}} placeholder="https://… atau unggah gambar"/>{value.startsWith('/')&&<button type="button" className="cms-link text-xs mt-2" onClick={()=>{setError('');onChange('');}}>Ganti dengan alamat gambar eksternal</button>}</>:<LinkInput value={value} onChange={onChange} internalOnly={internalOnly} allowFile/>}
        {!internalOnly&&<div className="cms-actions mt-2"><label className={`cms-button small ${busy?'opacity-50':''}`} htmlFor={id}>{busy?'Mengunggah…':image?'Pilih gambar dari perangkat':'Pilih berkas dari perangkat'}</label><CmsInput id={id} type="file" className="sr-only" disabled={busy} accept={image?'.jpg,.jpeg,.png,.webp,.gif,.svg':'.jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.docx,.xlsx,.pptx'} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/><small className="cms-help">Maksimal 10 MB; SVG maksimal 2 MB. Batas server dapat lebih kecil.{image?' JPG, PNG, WebP, GIF, SVG':''}</small></div>}{image&&value&&<img src={value} alt="Pratinjau gambar pilihan" className="cms-image-preview"/>}{error&&<div className="cms-notice error" role="alert">{error}<button type="button" className="cms-link block mt-2" onClick={()=>setError('')}>Tutup pesan</button></div>}</div>;
}
export const LABELS:Record<string,string>={title:'Judul',label:'Nama / label',judul:'Judul',text:'Isi teks',description:'Keterangan',keterangan:'Keterangan',nama:'Nama',href:'Tautan tujuan',url:'Tautan',src:'Gambar',alt:'Deskripsi gambar',tingkat:'Tingkat',dari:'Dari tingkat',sampai:'Sampai tingkat',warna:'Warna',skema:'Skema',lingkup:'Ruang lingkup',jabatan:'Jabatan minimal',saintek:'Saintek',soshum:'Sosial humaniora & seni',name:'Nama',value:'Nilai',year:'Tahun',heading:'Judul bagian',lead:'Pengantar',subtitle:'Subjudul',body:'Isi',desc:'Deskripsi',hex:'Warna contoh',kode:'Kode cetak',font:'Warna tulisan'};
function blank(sample:any):any {if(Array.isArray(sample))return [];if(sample&&typeof sample==='object')return Object.fromEntries(Object.entries(sample).map(([k,v])=>[k,blank(v)]));return typeof sample==='number'?0:'';}
export function StructuredInput({value,sample,onChange,name='Isi',fieldKey='',excelContext='',excelLimit=200}:{value:any;sample:any;onChange:(value:any)=>void;name?:string;fieldKey?:string;excelContext?:string;excelLimit?:number}) {
    if(Array.isArray(sample))return <div><StructuredExcel value={value} sample={sample[0]??''} onChange={onChange} name={name} context={excelContext||fieldKey||name} labels={LABELS} limit={excelLimit}/>{(value as any[]).map((row,i)=><div key={i} className="cms-collection-row"><div className="cms-section-head"><h3>{name} {i+1}</h3><div className="cms-order-buttons"><button type="button" className="cms-button small" disabled={i===0} aria-label={`Naikkan ${name} ${i+1}`} onClick={()=>onChange(move(value,i,-1))}>↑</button><button type="button" className="cms-button small" disabled={i===value.length-1} aria-label={`Turunkan ${name} ${i+1}`} onClick={()=>onChange(move(value,i,1))}>↓</button><button type="button" className="cms-button small danger" onClick={()=>{if(window.confirm('Hapus baris ini dari draf?'))onChange(value.filter((_:any,j:number)=>j!==i));}}>Hapus</button></div></div><StructuredInput value={row} sample={sample[0]??''} onChange={row=>onChange(value.map((v:any,j:number)=>j===i?row:v))} name={name} excelContext={`${excelContext||fieldKey||name}.${i}`} excelLimit={excelLimit}/></div>)}<button type="button" className="cms-add" onClick={()=>onChange([...value,blank(sample[0]??'')])}>+ Tambah {name.toLowerCase()}</button></div>;
    if(sample&&typeof sample==='object')return <div>{Object.keys(sample).map(key=><StructuredInput key={key} excelContext={`${excelContext}.${key}`} excelLimit={excelLimit} fieldKey={key} name={LABELS[key]??key.replace(/([A-Z])/g,' $1')} value={value[key]} sample={sample[key]} onChange={v=>onChange({...value,[key]:v})}/>)}</div>;
    return <label className="cms-field"><span>{name}</span>{/href|url|src/i.test(fieldKey)?<AssetInput value={value} onChange={onChange} image={fieldKey==='src'}/>:typeof sample==='number'?<CmsInput type="number" value={value} onChange={e=>onChange(numericInput(e.target.value))}/>:(fieldKey==='hex'||(fieldKey==='warna'&&String(sample).startsWith('#')))?<CmsInput type="color" value={value} onChange={e=>onChange(e.target.value)}/>:<CmsTextarea policy={fieldPolicy("collection",fieldKey)} rows={String(value).length>130?4:2} value={value} onChange={e=>onChange(e.target.value)} maxLength={15000}/>}</label>;
}
