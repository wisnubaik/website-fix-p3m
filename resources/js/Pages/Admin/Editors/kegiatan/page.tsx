"use client";

import ResourceEditor from "@/components/admin/ResourceEditor";

/**
 * Kegiatan P3M beserta dokumentasi fotonya, tampil sebagai kartu bergambar
 * di /informasi/kegiatan.
 *
 * Foto diisi sebagai daftar alamat berkas, satu per baris. Unggah berkasnya
 * lebih dulu lewat kolom unggah di resource mana pun, lalu salin alamat
 * hasilnya ke sini. Cara ini dipilih agar satu kegiatan bisa memuat banyak
 * foto tanpa perlu tabel terpisah.
 */
export default function Page() {
    return (
        <div>
            <p className="text-sm text-[var(--color-graphite)] mb-5 max-w-[680px]">
                Kegiatan yang ditampilkan di halaman <b>/informasi/kegiatan</b>, lengkap dengan
                dokumentasi fotonya. Kegiatan terbaru sebaiknya diberi urutan paling kecil agar
                tampil di atas.
                <br />
                <br />
                Dokumentasi foto diunggah langsung lewat tombol pada formulir. Beberapa berkas
                dapat dipilih sekaligus, dan urutannya dapat digeser atau dihapus per gambar.
            </p>
            <ResourceEditor
                defaultUploadVisibility="public"
                hasPublished
                hasOrder
                apiPath="/api/admin/kegiatan"
                listPath="/api/admin/kegiatan"
                publicHref="/informasi/kegiatan"
                title="Kegiatan"
                tableFields={["judul", "tanggalMulai", "tanggalSelesai", "tempat"]}
                fields={[
                    { key: "judul", label: "Judul kegiatan", type: "textarea", required: true },
                    { key: "tanggalMulai", label: "Tanggal mulai", type: "date" },
                    { key: "tanggalSelesai", label: "Tanggal selesai (kosongkan jika satu hari)", type: "date" },
                    { key: "tempat", label: "Tempat pelaksanaan" },
                    { key: "narasumber", label: "Narasumber" },
                    { key: "ringkasan", label: "Ringkasan kegiatan", type: "textarea" },
                    { key: "foto", label: "Dokumentasi foto", type: "gallery" },
                    { key: "order", label: "Urutan tampil", type: "number" },
                ]}
            />
        </div>
    );
}
