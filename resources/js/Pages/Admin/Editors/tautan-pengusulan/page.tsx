"use client";
import ResourceEditor from '@/components/admin/ResourceEditor';

export default function Page() {
    return <div>
        <div className="text-sm text-[var(--color-graphite)] mb-5 max-w-[760px] space-y-3">
            <h2 className="font-semibold text-lg text-[var(--color-absolute-zero)]">Pengusulan proposal di beranda</h2>
            <p>Isi bawaan mengikuti bagian <b>PPM Internal 2026</b> pada situs P3M: <b>Link Usulan Penelitian batch 2</b> dan <b>Link Usulan PkM batch 2</b>. Masing-masing menuju formulir yang berbeda.</p>
            <p>Bagian ini berisi tautan pengusulan, bukan rekap jumlah judul atau daftar penerima hibah BIMA. Tautan yang ditampilkan tidak otomatis berarti formulir masih menerima usulan. Periksa periode dan ketentuan dari P3M sebelum menulis keterangan pembukaan atau penutupan.</p>
            <p>Gunakan <b>Tambah</b> untuk tautan baru, <b>Edit</b> untuk judul dan alamatnya, serta tombol urutan untuk mengatur letaknya. Hapus centang publikasi untuk menyembunyikan tautan sementara. Tombol <b>Hapus</b> memindahkannya ke <b>Sampah</b> dan dapat dipulihkan. Jika seluruh tautan disembunyikan atau dihapus, bagian ini tidak tampil di beranda.</p>
        </div>
        <ResourceEditor
            hasPublished hasOrder apiPath="/api/admin/tautan-pengusulan" publicHref="/" title="Daftar tautan pengusulan"
            tableFields={["label", "href"]}
            fields={[
                { key: 'label', label: 'Judul tautan', required: true, placeholder: 'Link Usulan Penelitian batch 2' },
                { key: 'href', label: 'Alamat formulir', required: true, placeholder: 'https://forms.gle/...' },
                { key: 'order', label: 'Urutan tampil', type: 'number' },
            ]}
        />
    </div>;
}
