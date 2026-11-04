import UploadInventory from '@/components/admin/UploadInventory';
import { CmsInput } from '@/components/admin/CmsInput';
import { useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { managedRequest } from '@/components/admin/managed-site';

type ResetPage = { id: string; path: string; title: string; builtin: boolean };
type Backup = { id: string; scope: string; label: string; action: string; actor: string; created_at: string };
type Preview = { scope: string; backupId: string | null; label: string; fingerprint: string; baseline: string; rows: { label: string; before: number; after: number }[]; pages: number; customPages: number; customTemplate: boolean; sharedContact: boolean; phrase: string };
type Props = { resetPages: ResetPage[]; backups: { data: Backup[]; current_page: number; last_page: number; prev_page_url: string | null; next_page_url: string | null }; initialScope: string; baseline: string; completedBackup: string | null };

export default function Reset({ resetPages, backups, initialScope, baseline, completedBackup }: Props) {
    const validScope = ['all', 'menu', ...resetPages.map(page => page.id)].includes(initialScope) ? initialScope : '';
    const [scope, setScope] = useState(validScope);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [confirmation, setConfirmation] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const summary = useRef<HTMLHeadingElement>(null);

    async function inspect(target: string, backupId?: string) {
        if (busy || !target) return;
        setBusy(true); setError(''); setPreview(null); setConfirmation('');
        try {
            const result = await managedRequest('/api/admin/cms-reset/preview', 'POST', { scope: target, backupId });
            setPreview(result);
            requestAnimationFrame(() => { summary.current?.focus(); summary.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        } catch (e) { setError((e as Error).message); }
        finally { setBusy(false); }
    }

    async function execute() {
        if (!preview || busy || confirmation !== preview.phrase) return;
        setBusy(true); setError('');
        try {
            const result = await managedRequest('/api/admin/cms-reset/execute', 'POST', { scope: preview.scope, backupId: preview.backupId, fingerprint: preview.fingerprint, confirmation });
            window.location.assign(`/admin/reset-konten?completed=${encodeURIComponent(result.backupId)}`);
        } catch (e) { setError((e as Error).message); setBusy(false); setPreview(null); setConfirmation(''); }
    }

    return <AdminLayout>
        <UploadInventory />
        <div className="cms-heading"><div><div className="cms-overline">Pengelolaan situs</div><h1>Reset & pemulihan</h1><p>Kembalikan konten ke bawaan proyek atau pulihkan kondisi sebelum reset.</p></div><Link href="/admin/halaman" className="cms-button">Kembali ke halaman</Link></div>
        {completedBackup && <div className="cms-notice" role="status">Tindakan selesai. Cadangan sebelum tindakan sudah tersimpan pada baris yang ditandai di bawah. Muat ulang tab CMS lain sebelum melanjutkan pengeditan.</div>}
        <div className="cms-notice"><strong>Data yang tetap disimpan</strong><p>Data Internal P3M-PNM, Akun Saya, Kelola Akun, Activity Log, dan berkas unggahan tidak dihapus. Tindakan reset dan pemulihan dicatat pada Activity Log.</p></div>
        <section className="cms-panel mb-6" aria-labelledby="reset-select-title">
            <h2 id="reset-select-title">1. Pilih bagian yang ingin dikembalikan</h2>
            <p className="cms-help my-3">Acuan: {baseline}. Ini mengembalikan isi dan pengaturan CMS, bukan memasang ulang aplikasi atau mengganti desain.</p>
            <label className="cms-field"><span>Cakupan reset</span><select value={scope} disabled={busy} onChange={e => { setScope(e.target.value); setPreview(null); setConfirmation(''); setError(''); }}><option value="">Pilih bagian terlebih dahulu</option><optgroup label="Halaman dan pengaturan">{resetPages.map(page => <option key={page.id} value={page.id}>{page.path === '/' ? 'Beranda' : page.title}{!page.builtin ? ' (template halaman tambahan)' : ''}</option>)}</optgroup><optgroup label="Pengaturan seluruh situs"><option value="menu">Menu & navigasi saja</option><option value="all">Seluruh konten situs, termasuk menu</option></optgroup></select></label>
            <button type="button" className="cms-button" disabled={!scope || busy} onClick={() => inspect(scope)}>{busy ? 'Memproses…' : 'Lihat cakupan reset'}</button>
        </section>
        {error && <div className="cms-notice error" role="alert">{error}</div>}
        {preview && <section className="cms-panel mb-6 border-l-4 border-amber-600" aria-labelledby="reset-summary-title">
            <h2 ref={summary} tabIndex={-1} id="reset-summary-title">2. Periksa sebelum {preview.backupId ? 'memulihkan' : 'mereset'}</h2>
            <p className="font-semibold my-3">{preview.label}</p>
            <ul className="list-none pl-5 text-sm space-y-2 mb-4">
                <li>Cadangan kondisi saat ini dibuat otomatis sebelum tindakan dijalankan. Jika proses gagal, perubahan dibatalkan.</li>
                {preview.backupId ? <li>Isi, draf, dan status publikasi dalam cakupan ini dikembalikan sesuai cadangan yang dipilih. Perubahan yang dibuat sesudah cadangan tersebut akan tertimpa. Kondisi saat ini tetap disimpan sebagai cadangan baru.</li> : preview.customTemplate ? <li>Halaman tambahan tidak memiliki konten asli bawaan proyek. Isinya dikosongkan sesuai template, nama dan alamat tetap, lalu disimpan sebagai draf. Halaman perlu diterbitkan kembali.</li> : <li>{preview.scope === 'menu' ? 'Susunan menu draf dan menu terbit kembali ke bawaan. Isi dan status publikasi halaman tetap. Tautan ke halaman yang belum terbit tetap tidak ditampilkan.' : 'Teks, gambar, susunan, dan data isi dalam cakupan ini kembali ke bawaan. Halaman bawaan langsung diterbitkan, termasuk yang sebelumnya ditarik dari publik.'}</li>}
                {preview.scope === 'all' && <li>Seluruh halaman bawaan, identitas, kontak, data publik, dan navbar ikut berubah. Halaman tambahan masuk ke Sampah. Halaman tambahan dapat dipulihkan kembali, tidak dihapus permanen.</li>}
                {!['all', 'menu'].includes(preview.scope) && <li>Halaman lain dan susunan navbar tidak ikut direset. Pengaturan bersama tetap mengikuti pengaturan situs, kecuali jika Anda memilih Identitas, header &amp; footer.</li>}
                {preview.sharedContact && <li>Identitas dan kontak kantor dipakai bersama di beberapa halaman. Data tersebut tidak ikut reset Hubungi Kami. Pilih Identitas, header &amp; footer atau seluruh konten situs untuk mengembalikannya.</li>}
                <li>Pratinjau impor Excel yang belum disimpan akan dibatalkan. Unggah ulang Excel jika ingin melanjutkan impor.</li>
            </ul>
            {preview.rows.length > 0 && <details className="my-4"><summary className="cursor-pointer text-sm font-semibold">Lihat rincian data ({preview.rows.length} kelompok)</summary><div className="cms-table-wrap mt-3"><table className="cms-table"><thead><tr><th>Kelompok data</th><th>Saat ini</th><th>Setelah tindakan</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.label}><td>{row.label}</td><td>{row.before} baris</td><td>{row.after} baris</td></tr>)}</tbody></table></div><p className="cms-help mt-2">Jumlah mencakup data aktif dan data di Sampah dalam cakupan tersebut.</p></details>}
            <form onSubmit={e => { e.preventDefault(); execute(); }}>
                <label className="cms-field"><span>Ketik {preview.phrase} untuk mengonfirmasi</span><CmsInput autoComplete="off" spellCheck={false} value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} /></label>
                <div className="cms-actions"><button className="cms-button danger" disabled={busy || confirmation !== preview.phrase}>{busy ? 'Sedang memproses…' : preview.backupId ? 'Pulihkan dari cadangan' : 'Jalankan reset'}</button><button type="button" className="cms-button" disabled={busy} onClick={() => { setPreview(null); setConfirmation(''); }}>Batal</button></div>
            </form>
        </section>}
        <section className="cms-panel" aria-labelledby="reset-backups-title">
            <h2 id="reset-backups-title">Riwayat cadangan</h2><p className="cms-help my-3">Setiap baris menyimpan kondisi sebelum tindakan yang tercantum. Pilih Pulihkan, periksa cakupannya, lalu konfirmasi. Cadangan ini tersimpan di database aplikasi; tetap lakukan backup database dan folder unggahan secara terpisah.</p>
            {backups.data.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Waktu</th><th>Cakupan</th><th>Dibuat sebelum</th><th>Pelaksana</th><th><span className="sr-only">Tindakan</span></th></tr></thead><tbody>{backups.data.map(backup => <tr key={backup.id} className={backup.id === completedBackup ? 'bg-amber-50' : ''}><td className="whitespace-nowrap">{new Date(backup.created_at.replace(' ', 'T') + (backup.created_at.endsWith('Z') ? '' : 'Z')).toLocaleString('id-ID')}{backup.id === completedBackup && <span className="cms-status draft block mt-2">Cadangan tindakan terakhir</span>}</td><td>{backup.label}</td><td>{backup.action === 'reset' ? 'Reset ke bawaan' : 'Pemulihan cadangan'}</td><td>{backup.actor}</td><td><button className="cms-button small" disabled={busy} onClick={() => inspect(backup.scope, backup.id)}>Pulihkan</button></td></tr>)}</tbody></table></div> : <div className="cms-empty">Belum ada reset atau pemulihan. Cadangan pertama dibuat saat Anda menjalankan tindakan.</div>}
            {backups.last_page > 1 && <div className="cms-actions mt-4">{backups.prev_page_url && <Link className="cms-button small" href={backups.prev_page_url}>Sebelumnya</Link>}<span className="text-sm">Halaman {backups.current_page} dari {backups.last_page}</span>{backups.next_page_url && <Link className="cms-button small" href={backups.next_page_url}>Berikutnya</Link>}</div>}
        </section>
    </AdminLayout>;
}
