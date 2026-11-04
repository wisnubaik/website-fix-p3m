import { useEffect, useRef, useState } from 'react';
import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { KegiatanItem } from "@/lib/kegiatan.server";

/**
 * Kartu kegiatan beserta galeri fotonya.
 *
 * Foto ditampilkan sebagai grid kecil di samping keterangan, bukan sebagai
 * tumpukan besar seperti di situs lama. Alasannya: foto kegiatan berfungsi
 * sebagai bukti pelaksanaan, jadi cukup terlihat dan dapat diperbesar bila
 * perlu. Menyusunnya berjajar besar justru mendorong keterangan kegiatan,
 * yang lebih informatif, turun jauh ke bawah.
 */
export default function KegiatanKartu({ data }: { data: KegiatanItem[] }) {
    const cms = useCms();

    if (data.length === 0) return null;

    return (
        <ul className="flex flex-col gap-3">
            {data.map((k) => (
                <li
                    key={k.judul}
                    className="border border-[var(--color-outline-gray)] bg-white p-6 md:p-8"
                >
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
                        <div>
                            <h3 className="font-display text-[21px] md:text-[25px] font-bold leading-snug tracking-[-0.025em] text-[var(--color-absolute-zero)] max-w-[36ch]">
                                {k.judul}
                            </h3>

                            {k.ringkasan && (
                                <p className="text-[15px] text-[var(--color-graphite)] mt-3 leading-relaxed max-w-[62ch]">
                                    {k.ringkasan}
                                </p>
                            )}

                            <dl className="mt-6 border-t border-[var(--color-outline-gray)]">
                                {[
                                    [cms.text("kegiatan_tanggal", "Tanggal"), k.tanggal],
                                    [cms.text("kegiatan_tempat", "Tempat"), k.tempat],
                                    [cms.text("kegiatan_narasumber", "Narasumber"), k.narasumber],
                                ]
                                    .filter(([, v]) => v)
                                    .map(([label, v]) => (
                                        <div
                                            key={label}
                                            className="grid grid-cols-[7rem_1fr] gap-4 py-2.5 border-b border-[var(--color-outline-gray)]"
                                        >
                                            <dt className="text-[12px] font-semibold tracking-wider  text-[var(--color-graphite)] pt-0.5">
                                                {label}
                                            </dt>
                                            <dd className="text-[14px] text-[var(--color-absolute-zero)] leading-snug">
                                                {v}
                                            </dd>
                                        </div>
                                    ))}
                            </dl>
                        </div>

                        {k.foto.length > 0 && (
                            <div>
                                <p className="text-[12px] font-semibold tracking-wider  text-[var(--color-graphite)] mb-2.5"><CmsText field="f_5765a476aea2c2" fallback="Dokumentasi" /></p>
                                <PhotoGallery photos={k.foto} title={k.judul} />
                            </div>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function PhotoGallery({photos,title}:{photos:string[];title:string}) {
    const cms=useCms();
    const [active,setActive]=useState<number|null>(null);
    const dialog=useRef<HTMLDialogElement>(null);
    const opened=active!==null;
    useEffect(()=>{
        if(!opened)return;
        const modal=dialog.current;if(!modal)return;
        const old=document.body.style.overflow;document.body.style.overflow='hidden';modal.showModal();
        return()=>{modal.close();document.body.style.overflow=old;};
    },[opened]);
    const index=active===null?0:Math.min(active,photos.length-1);
    const move=(step:number)=>setActive(value=>Math.max(0,Math.min(photos.length-1,(value??0)+step)));
    return <><div className="grid grid-cols-3 lg:grid-cols-2 gap-2">{photos.map((src,i)=><button key={`${src}-${i}`} type="button" aria-label={`${cms.text('gallery_open','Lihat foto')} ${i+1}: ${title}`} onClick={()=>setActive(i)} className="relative block aspect-[4/3] overflow-hidden border border-[var(--color-outline-gray)] group"><img src={src} alt={`${title}, foto ${i+1}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></button>)}</div>
    <dialog ref={dialog} data-lenis-prevent aria-label={title} onCancel={()=>setActive(null)} onClose={()=>setActive(null)} onClick={e=>{if(e.target===e.currentTarget)setActive(null);}} onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}if(e.key==='ArrowRight'){e.preventDefault();move(1);}}} className="m-auto w-[min(96vw,1100px)] max-h-[94dvh] overflow-y-auto overscroll-contain bg-white p-4 rounded-md backdrop:bg-black/80">
      {opened&&<><div className="flex justify-between items-start gap-4 mb-3"><h3 className="font-semibold">{title}</h3><button type="button" autoFocus onClick={()=>setActive(null)} className="border px-3 py-2">{cms.text('gallery_close','Tutup')}</button></div><img src={photos[index]} alt={`${title}, foto ${index+1}`} className="w-full h-[65dvh] object-contain bg-slate-950"/><div className="flex justify-between items-center gap-3 mt-3"><button type="button" disabled={index===0} onClick={()=>move(-1)} className="border px-3 py-2 disabled:opacity-40">{cms.text('gallery_previous','Sebelumnya')}</button><span aria-live="polite">{index+1} / {photos.length}</span><button type="button" disabled={index===photos.length-1} onClick={()=>move(1)} className="border px-3 py-2 disabled:opacity-40">{cms.text('gallery_next','Berikutnya')}</button></div></>}
    </dialog></>;
}
