import {documentKind} from '@/Pages/Public/ProfileDocument';
import type {ProfileTableRecord} from '@/lib/profile-tables';
import ProfileRoadmapEditor from '@/components/admin/ProfileRoadmapEditor';
import { useEffect, useState } from 'react';
import ProfileTablesEditor from '@/components/admin/ProfileTablesEditor';
import ProfileListEditor from '@/components/admin/ProfileListEditor';

export const PROFILE_SECTIONS = [
    { key: 'profil-pengantar', label: 'Pengantar P3M', group: '1. Tentang P3M', anchor: 'tentang-p3m' },
    { key: 'profil-visi', label: 'Visi', group: '1. Tentang P3M', anchor: 'tentang-p3m' },
    { key: 'profil-misi', label: 'Misi', group: '1. Tentang P3M', anchor: 'tentang-p3m' },
    { key: 'profil-tujuan', label: 'Tujuan', group: '1. Tentang P3M', anchor: 'tentang-p3m' },
    { key: 'organisasi', label: 'Struktur organisasi P3M dan PNM', group: '2. Organisasi dan tata kerja', anchor: 'struktur-organisasi' },
    { key: 'profil-tupoksi', label: 'Tugas pokok dan fungsi', group: '2. Organisasi dan tata kerja', anchor: 'struktur-organisasi' },
    { key: 'profil-ketua', label: 'Tugas ketua', group: '2. Organisasi dan tata kerja', anchor: 'struktur-organisasi' },
    { key: 'profil-sekretaris', label: 'Tugas sekretaris', group: '2. Organisasi dan tata kerja', anchor: 'struktur-organisasi' },
    { key: 'pelaksanaan', label: 'Tahapan pelaksanaan dan tugas dosen/reviewer', group: '3. Pelaksanaan', anchor: 'pelaksanaan' },
    { key: 'klaster', label: 'Daftar bidang fokus riset', group: '4. Klaster riset', anchor: 'bidang-fokus' },
    { key: 'klaster-tabel', label: 'Klaster, fokus penelitian, dan program studi', group: '4. Klaster riset', anchor: 'bidang-fokus' },
    { key: 'peta-jalan', label: 'Peta jalan dan indikator ketercapaian', group: '5. Peta jalan', anchor: 'peta-jalan' },
    { key: 'target-luaran', label: 'Target penelitian dan pengabdian', group: '6. Target luaran', anchor: 'target-luaran' },
    { key: 'informasi-lain', label: 'Informasi tambahan', group: '7. Informasi lainnya', anchor: 'informasi-lain' },
];
const tableGroups: Record<string, string> = { organisasi: 'organisasi', pelaksanaan: 'pelaksanaan', 'klaster-tabel': 'klaster', 'peta-jalan': 'peta-jalan', 'target-luaran': 'target-luaran', 'informasi-lain': 'informasi-lain' };

export function hasAdditionalProfileData(records:ProfileTableRecord[]){
    return records.some(record=>documentKind(record.id,'')==='general'&&record.content.tables.length>0);
}
export function visibleProfileSections(hasAdditional:boolean){return PROFILE_SECTIONS.filter(item=>item.key!=='informasi-lain'||hasAdditional);}

export default function ProfilAdminPage({ initialSection = 'profil-pengantar' }: { initialSection?: string }) {
    const [section, setSection] = useState(initialSection);
    const [hasAdditional,setHasAdditional]=useState(false);
    const sections=visibleProfileSections(hasAdditional);
    useEffect(() => { setSection(initialSection); }, [initialSection]);
    const current = sections.find(item => item.key === section) ?? sections[0];
    const tableGroup = tableGroups[current.key];
    return <div>
        <div className="cms-section-head"><div><h2>Data halaman Profil</h2><p className="cms-help">Urutan pilihan mengikuti halaman website dari atas ke bawah. Pilih bagian, ubah isinya, lalu simpan melalui tombol pada bagian tersebut.</p></div><a className="cms-link" href={`/profil#${current.anchor}`} target="_blank" rel="noopener noreferrer">Lihat bagian di website</a></div>
        <div className="cms-field"><label htmlFor="profile-section">Bagian yang ingin diubah</label><select id="profile-section" value={current.key} onChange={event => setSection(event.target.value)}>{[...new Set(sections.map(item => item.group))].map(group => <optgroup key={group} label={group}>{sections.filter(item => item.group === group).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>)}</select></div>
        <div className="cms-notice mb-5"><p><strong>{current.group}: {current.label}</strong></p><p>Data berstatus Tampil langsung diperbarui di website setelah disimpan. Untuk judul, nama pada daftar isi, dan gambar banner, gunakan tab Teks &amp; gambar, kemudian Terbitkan halaman.</p><p>Tombol Simpan draf halaman tidak menyimpan perubahan pada Data halaman.</p></div>
        <div hidden={!tableGroup || tableGroup === 'peta-jalan'}><ProfileTablesEditor onRecordsLoaded={records=>setHasAdditional(hasAdditionalProfileData(records))} organisationOnly={tableGroup === 'organisasi'} sectionGroup={tableGroup} /></div>
        <div hidden={tableGroup !== 'peta-jalan'}><ProfileRoadmapEditor /></div>
        {!tableGroup && <ProfileListEditor key={current.key} section={current.key} title={current.label} />}
    </div>;
}
