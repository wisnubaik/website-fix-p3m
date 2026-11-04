import { useState } from 'react';
import AdminLayout from "@/Layouts/AdminLayout";

import { usePage } from "@inertiajs/react";

import type { SharedProps } from "@/types";

const ACTION_LABEL: Record<string, string> = {
    logout: "Keluar", logout_all: "Keluar dari semua perangkat", logout_session: "Cabut sesi perangkat",
    password_changed: "Ganti password", google_disconnected: "Putus koneksi Google",
    export: "Unduh riwayat", prune: "Pembersihan riwayat", reset: "Reset", duplicate: "Duplikat",
    save: "Simpan draf", publish: "Terbitkan", unpublish: "Tarik dari publik", discard: "Buang draf",
    recover: "Kembalikan halaman", purge: "Hapus permanen", 'delete-permanent': "Hapus permanen",
    create: "Tambah",
    update: "Ubah",
    delete: "Hapus",
    restore: "Pulihkan",
    login: "Login",
    login_failed: "Login gagal",
};

const ACTION_COLOR: Record<string, string> = {
    create: "text-[var(--color-teal-600)]",
    update: "text-[var(--color-cosmic-candy)]",
    delete: "text-[var(--color-rose-600)]",
    restore: "text-[var(--color-teal-600)]",
    login: "text-[var(--color-graphite)]",
    login_failed: "text-[var(--color-rose-600)]",
};

function formatDate(d: string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(d));
}

function Page({logs,pagination,filters = {},retentionMonths = 12}: {filters?: Record<string,string>;retentionMonths?:number;pagination?: {current:number;last:number;total:number;previous:string|null;next:string|null};logs: {id:string;adminId:string|null;username:string;action:string;resource:string;detail:string|null;createdAt:string}[]}) {const {auth}=usePage<SharedProps>().props; const session=auth.user!; const [values,setValues]=useState(filters);
const [exporting,setExporting]=useState(false);
const [error,setError]=useState('');
const errors = (usePage().props.errors ?? {}) as Record<string,string>;
const query = new URLSearchParams(Object.entries(values).filter(([,value])=>Boolean(value))).toString();
async function download() {
 setExporting(true); setError('');
 try {
  const response=await fetch('/admin/log/export?'+query,{headers:{Accept:'application/json'},credentials:'same-origin'});
  if(!response.ok || !response.headers.get('content-type')?.includes('text/csv')) {
   const data=await response.json().catch(()=>({}));
   setError(data.message ?? 'Unduhan gagal. Periksa filter atau masuk kembali.'); return;
  }
  const url=URL.createObjectURL(await response.blob()); const link=document.createElement('a');
  link.href=url;link.download='riwayat-aktivitas.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 } catch {setError('Koneksi terputus. Coba unduh kembali.');} finally {setExporting(false);}
}
return (
        <div>
            {pagination && <nav aria-label="Halaman catatan aktivitas" className="cms-actions mb-4">{pagination.previous && <a className="cms-button" href={pagination.previous}>Sebelumnya</a>}<span>Halaman {pagination.current} dari {pagination.last}, {pagination.total} aktivitas</span>{pagination.next && <a className="cms-button" href={pagination.next}>Berikutnya</a>}</nav>}
            <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">
                Activity Log
            </h1>
            <p className="text-sm text-[var(--color-graphite)] mb-6">
                {session.role === "SUPERADMIN"
                    ? "Riwayat aktivitas semua akun: siapa mengubah apa dan kapan."
                    : "Riwayat aktivitas akun Anda."}
            </p>

            <p className="mb-4 text-sm">50 catatan per halaman. Masa simpan {retentionMonths} bulan. Catatan yang lebih lama dihapus oleh pembersihan terjadwal saat penjadwal server aktif. Unduh riwayat yang diperlukan sebelum masa simpan berakhir.</p>
            <form action="/admin/log" method="get" className="mb-5 flex flex-wrap items-end gap-3">
                {([['from','Dari tanggal'],['to','Sampai tanggal'],...(session.role === 'SUPERADMIN' ? [['account','Email akun (lengkap)']] : []),['action','Jenis aktivitas']] as string[][]).map(([key,label])=><label key={key} className="grid gap-1 text-sm">{label}
                    {key === 'action' ? <select name={key} value={values[key]??''} onChange={e=>setValues({...values,[key]:e.target.value})} className="border p-2"><option value="">Semua aktivitas</option>{Object.entries(ACTION_LABEL).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select> : <input className="border p-2" type={key==='account'?'email':'date'} name={key} value={values[key]??''} onChange={e=>setValues({...values,[key]:e.target.value})}/>}
                </label>)}
                <button className="cms-button" type="submit">Terapkan filter</button><a className="cms-button" href="/admin/log">Hapus filter</a>
                <button className="cms-button" type="button" disabled={exporting} onClick={download}>{exporting?'Menyiapkan...':'Unduh CSV (Excel)'}</button>
            </form>
            <p className="mb-4 text-sm">Unduhan mengikuti filter yang diisi, maksimal 10.000 catatan. File dapat dibuka di Excel.</p>
            {(error || Object.keys(errors).length > 0) && <p role="alert" className="mb-4 text-red-700">{error || Object.values(errors).join(' ')}</p>}
            {logs.length === 0 ? (
                <div className="text-sm text-[var(--color-graphite)] py-8 text-center border border-dashed border-[var(--color-outline-gray)]">
                    Belum ada aktivitas tercatat.
                </div>
            ) : (
                <div className="border border-[var(--color-outline-gray)] overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className="bg-[var(--color-whisper-white)] border-b border-[var(--color-outline-gray)]">
                                <th className="text-left px-4 py-2.5 font-semibold text-[var(--color-graphite)]">Waktu</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-[var(--color-graphite)]">Akun</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-[var(--color-graphite)]">Aksi</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-[var(--color-graphite)]">Bagian</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-[var(--color-graphite)]">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-b border-[var(--color-outline-gray)] last:border-0">
                                    <td className="px-4 py-2.5 text-[var(--color-graphite)] whitespace-nowrap">
                                        {formatDate(log.createdAt)}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-absolute-zero)] font-medium">{log.username}</td>
                                    <td className={`px-4 py-2.5 font-medium ${ACTION_COLOR[log.action] ?? ""}`}>
                                        {ACTION_LABEL[log.action] ?? log.action}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-graphite)]">{log.resource}</td>
                                    <td className="px-4 py-2.5 text-[var(--color-graphite)] max-w-[280px] truncate">
                                        {log.detail}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function Log(props: Parameters<typeof Page>[0]) {return <AdminLayout><Page {...props}/></AdminLayout>;}