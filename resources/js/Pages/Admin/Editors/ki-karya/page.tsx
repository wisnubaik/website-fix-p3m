"use client";

import ResourceEditor from "@/components/admin/ResourceEditor";

/**
 * Daftar karya Kekayaan Intelektual yang tampil sebagai tabel di
 * /layanan/ki. Program studi memakai combobox supaya penamaannya tetap
 * seragam: di berkas rekap aslinya satu prodi bisa tertulis dua versi
 * ("Teknik Listrik" dan "D3 Teknik Listrik"), yang membuat penyaringan
 * per prodi pecah jadi dua kategori.
 */
export default function Page() {
    return (
        <div>
            <p className="text-sm text-[var(--color-graphite)] mb-5 max-w-[680px]">
                Daftar karya Kekayaan Intelektual yang ditampilkan sebagai tabel di halaman{" "}
                <b>/layanan/ki</b>. Pengunjung dapat menyaringnya per program studi dan per tahun.
            </p>
            <ResourceEditor
                hasPublished
                apiPath="/api/admin/ki-karya"
                listPath="/api/admin/ki-karya"
                publicHref="/layanan/ki"
                title="Karya Kekayaan Intelektual"
                tableFields={["tahun", "judul", "ketua", "prodi", "jenisKi"]}
                filters={[
                    { key: "jenisKi", label: "Jenis KI" },
                    { key: "prodi", label: "Program Studi" },
                    { key: "tahun", label: "Tahun" },
                ]}
                sortKeys={[
                    { key: "tahun", dir: "desc" },
                    { key: "order", dir: "asc" },
                ]}
                fields={[
                    { key: "tahun", label: "Tahun (4 digit)", required: true },
                    { key: "judul", label: "Judul karya", type: "textarea", required: true },
                    { key: "ketua", label: "Nama ketua dan anggota (pisahkan dengan titik koma)", type: "textarea", required: true },
                    { key: "prodi", label: "Program studi", type: "combobox", required: true },
                    {
                        key: "jenisKi",
                        label: "Jenis perlindungan",
                        type: "select",
                        options: ["Hak Cipta", "Paten", "Paten Sederhana", "Desain Industri", "Merek", "PVT"],
                        required: true,
                    },
                    { key: "bentuk", label: "Bentuk ciptaan (mis. Buku, Program Komputer, Modul)", type: "combobox" },
                    {
                        // Hanya berarti untuk paten; hak cipta yang sudah tercatat
                        // tidak melacak status permohonan.
                        key: "status",
                        label: "Status permohonan (khusus paten)",
                        type: "select",
                        options: ["GRANTED", "Dalam Proses", "Ditolak", "Ditarik Kembali", "Berakhir"],
                    },
                    { key: "order", label: "Urutan tampil", type: "number" },
                ]}
            />
        </div>
    );
}
