import {usePage} from '@inertiajs/react';
import {FOOTER_SOCIAL_TYPES,footerSocialHref,type FooterSocial} from '@/lib/footer-social';
import {CmsInput} from './CmsInput';
export default function FooterSocialEditor({value,onChange}:{value:FooterSocial[];onChange:(items:FooterSocial[])=>void}) {
    const settings=usePage<any>().props.site;
    const fallback=(type:FooterSocial['type'])=>footerSocialHref({type,href:''},settings)||(type==='website'&&typeof window!=='undefined'?window.location.origin:'');
    const update=(index:number,patch:Partial<FooterSocial>)=>onChange(value.map((item,i)=>i===index?{...item,...patch}:item));
    return <div><p className="cms-help mb-4">Pilih jenis tombol dan alamat tujuannya. Isi email, nomor telepon, atau alamat website sesuai pilihan. Awalan tautan akan disesuaikan otomatis. Kontak situs ditampilkan sebagai nilai awal. Perubahan mengikuti Terbitkan halaman.</p>
        {value.map((item,index)=><div key={index} className="cms-panel mb-3"><label className="cms-field"><span>Jenis tombol {index+1}</span><select value={item.type} onChange={event=>update(index,{type:event.target.value as FooterSocial['type'],href:fallback(event.target.value as FooterSocial['type'])})}>{Object.entries(FOOTER_SOCIAL_TYPES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="cms-field"><span>Alamat tujuan {FOOTER_SOCIAL_TYPES[item.type]}</span><CmsInput value={item.href||fallback(item.type)} placeholder={item.type==='email'?'p3m@pnm.ac.id':item.type==='phone'?'0351452970':item.type==='whatsapp'?'https://wa.me/6281234567890':'https://...'} onChange={event=>update(index,{href:event.target.value})}/></label>
        <div className="cms-actions"><button type="button" className="cms-button small" disabled={index===0} onClick={()=>{const next=[...value];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);}}>Naikkan</button><button type="button" className="cms-button small" disabled={index===value.length-1} onClick={()=>{const next=[...value];[next[index+1],next[index]]=[next[index],next[index+1]];onChange(next);}}>Turunkan</button><button type="button" className="cms-button small danger" onClick={()=>onChange(value.filter((_,i)=>i!==index))}>Hapus tombol</button></div></div>)}
        <button type="button" className="cms-button" disabled={value.length>=8} onClick={()=>onChange([...value,{type:'website',href:fallback('website')}])}>Tambah tombol kontak</button>
    </div>;
}
