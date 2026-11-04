import { useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';

type Inventory = {totalBytes:number;quotaBytes:number;total:number;page:number;last:number;uncertain:boolean;files:{id:string;name:string;size:number;createdAt:string;visibility:string;missing:boolean;status:'content'|'backup'|'unknown'|'candidate'}[]};
const labels = {content:'Masih dirujuk konten, draf, atau riwayat',backup:'Diperlukan cadangan',unknown:'Belum dapat dipastikan',candidate:'Tidak ditemukan rujukan dalam database'};
const size = (bytes:number) => `${(bytes/1024/1024).toLocaleString('id-ID',{maximumFractionDigits:2})} MB`;
export default function UploadInventory() {
    const [data,setData]=useState<Inventory|null>(null);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    async function load(page=1) {
        if(busy)return;
        setBusy(true);setError('');
        try {
            const response=await cmsFetch(`/api/admin/upload-inventory?page=${page}`);
            const result=await response.json();
            if(!response.ok)throw new Error(result.message || 'Daftar berkas belum dapat dimuat.');
            setData(result);
        } catch(e){setError((e as Error).message);} finally{setBusy(false);}
    }
    return <details className="cms-panel mb-6"><summary className="font-semibold cursor-pointer">Penyimpanan berkas unggahan</summary><p className="cms-help my-3">Periksa pemakaian ruang dan rujukan berkas, termasuk draf, arsip, dan cadangan. Berkas tanpa rujukan database masih mungkin digunakan melalui tautan di luar situs. Daftar ini tidak menghapus berkas.</p><button type="button" className="cms-button" disabled={busy} onClick={()=>void load(data?.page ?? 1)}>{busy?'Memeriksa…':'Periksa penyimpanan'}</button>{error && <p role="alert" className="cms-notice error">{error}</p>}{data && <><p className="my-3">{size(data.totalBytes)} dari {size(data.quotaBytes)}, {data.total} berkas.</p>{data.totalBytes>=data.quotaBytes*.9 && <p className="cms-notice">Penyimpanan mendekati atau telah mencapai kuota. Hubungi pengelola server sebelum menambah banyak berkas.</p>}{data.uncertain && <p className="cms-notice">Ada cadangan yang tidak dapat dibaca. Berkas terkait belum boleh dianggap tidak terpakai.</p>}<div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Berkas</th><th>Ukuran</th><th>Status</th></tr></thead><tbody>{data.files.map(file=><tr key={file.id}><td className="break-all">{file.name}</td><td>{size(file.size)}</td><td>{file.missing?'Berkas fisik tidak ditemukan. ':''}{labels[file.status]}</td></tr>)}</tbody></table></div><div className="cms-actions my-3"><button type="button" className="cms-button" disabled={busy||data.page<=1} onClick={()=>void load(data.page-1)}>Sebelumnya</button><span>Halaman {data.page} dari {data.last}</span><button type="button" className="cms-button" disabled={busy||data.page>=data.last} onClick={()=>void load(data.page+1)}>Berikutnya</button></div></>}</details>;
}
