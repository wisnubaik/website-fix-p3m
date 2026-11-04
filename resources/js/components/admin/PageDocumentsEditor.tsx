import { useState } from 'react';
import EventManager from './EventManager';
import ResourceEditor, { type FieldDef } from './ResourceEditor';
import { useEditedPage, useEditedFields } from './PageEditorContext';
import { MONEV_BAGIAN, SEMHAS_BAGIAN } from '@/lib/monev-content';

const PAGES: Record<string, { label: string; path: string }> = {
    kegiatan: { label: 'Kegiatan', path: '/informasi/kegiatan' }, 'laporan-keuangan': { label: 'Laporan Keuangan', path: '/informasi/laporan-keuangan' },
    luaran: { label: 'Luaran', path: '/informasi/luaran' }, mitra: { label: 'Mitra', path: '/informasi/mitra' }, sinta: { label: 'SINTA', path: '/informasi/sinta' }, tkt: { label: 'TKT', path: '/informasi/tkt' },
    monev: { label: 'Monev', path: '/layanan/monev' }, semhas: { label: 'Seminar Hasil', path: '/layanan/semhas' }, ki: { label: 'Kekayaan Intelektual', path: '/layanan/ki' },
    panduan: { label: 'Panduan', path: '/layanan/panduan' }, asesmen: { label: 'Asesmen', path: '/layanan/asesmen' }, repository: { label: 'Repository', path: '/repository' },
};

export default function PageDocumentsEditor({ sections }: { sections: string[] }) {
    const pagePath = useEditedPage();
    const labels = useEditedFields();
    const fixed = sections.find(section => PAGES[section].path === pagePath);
    const [choice, setChoice] = useState(fixed ?? sections[0]);
    const section = fixed ?? choice;
    const page = PAGES[section];
    if (section === 'semhas') return <div>{!fixed && <label className="cms-field"><span>Pilih halaman dokumen</span><select value={choice} onChange={e=>setChoice(e.target.value)}>{sections.map(key=><option key={key} value={key}>{PAGES[key].label}</option>)}</select></label>}<EventManager initialEvent={section}/></div>;
    const placement = section === 'monev' ? MONEV_BAGIAN.filter(item => item.id !== 'monev-2026') : section === 'semhas' ? SEMHAS_BAGIAN : [];
    const placementLabels: Record<string, string> = section === 'monev' ? {
        'Indikator Penilaian': labels.f_31994e55916b46 || 'Indikator Penilaian',
        'Monev 2026': labels.period_monev_title || 'Monev 2026',
        'Monitoring dan Evaluasi': labels.f_01a365d291b0fc || 'Monitoring dan Evaluasi',
    } : {
        [SEMHAS_BAGIAN[0].judul]: 'Berkas di bawah jadwal',
        [SEMHAS_BAGIAN[1].judul]: labels.semhas_berkas_title || 'Dokumen Seminar Hasil',
    };
    const fields: FieldDef[] = [
        ...(placement.length ? [{ key: 'category', label: 'Letak dokumen di halaman', type: 'select' as const, options: placement.map(part => part.judul), optionLabels: placementLabels,
            help: 'Pilih bagian tujuan. Nama bagian boleh berubah melalui Teks & gambar; hubungan dokumennya tetap terjaga.' }] : []),
        { key: 'groupTitle', label: 'Judul kelompok dokumen', type: 'combobox', required: true, help: 'Dokumen dengan judul kelompok yang sama tampil bersama. Pilih yang sudah ada atau tambahkan kelompok baru.' },
        { key: 'name', label: 'Nama dokumen', type: 'textarea', required: true },
        { key: 'kind', label: 'Jenis berkas', type: 'select', options: ['pdf', 'docx', 'xlsx', 'pptx', 'link'], optionLabels: { pdf: 'PDF', docx: 'Word', xlsx: 'Excel', pptx: 'PowerPoint', link: 'Link' }, required: true },
        { key: 'year', label: 'Tahun (opsional)' },
        { key: 'href', label: 'Berkas atau tautan tujuan', type: 'file', help: 'Unggah berkas atau pilih tautan. Jika belum tersedia, matikan Publikasikan sebelum menyimpan.' },
        { key: 'order', label: 'Urutan tampil', type: 'number' },
    ];
    return <div>
        <h2>Dokumen {page.label}</h2>{section === 'monev' && <p className="cms-notice my-4">Dokumen tahunan dikelola melalui Periode, skema, dan jadwal → pilih periode → pilih skema → Dokumen skema. Bagian ini hanya untuk indikator umum dan arsip Monitoring dan Evaluasi.</p>}
        <p className="cms-help my-4">Daftar ini hanya memuat dokumen untuk halaman {page.label}. Nama kelompok, nama dokumen, jenis berkas, dan tahun mengikuti daftar yang dilihat pengunjung.</p>
        {!fixed && sections.length > 1 && <label className="cms-field"><span>Pilih halaman dokumen</span><select aria-label="Pilih halaman dokumen" value={choice} onChange={event => setChoice(event.target.value)}>{sections.map(key => <option value={key} key={key}>{PAGES[key].label}</option>)}</select></label>}
        <ResourceEditor key={section} apiPath="/api/admin/documents" listPath={`/api/admin/documents?section=${section}${section === 'monev' ? '&unscoped=1' : ''}`} extraFields={{ section, ...(placement.length ? {category: placement[0].judul} : {}) }} publicHref={page.path}
            title={`Dokumen ${page.label}`} hasPublished defaultUploadVisibility="public" flagEmptyField="href" fields={fields}
            filters={[{ key: 'groupTitle', label: 'Kelompok dokumen' }]} tableFields={['groupTitle', 'name', 'kind', 'year']}
            sortKeys={[{ key: 'order', dir: 'asc' }]} />
    </div>;
}
