"use client";

import ResourceEditor from "@/components/admin/ResourceEditor";

/**
 * Proyek Problem Based Learning yang tampil sebagai tabel di
 * /informasi/luaran.
 *
 * Kolom mahasiswa sengaja hanya menyimpan JUMLAHNYA. Nama mahasiswa ditampilkan
 * sebagai pengakuan atas capaian mereka. Kolom mitra hanya memuat nama
 * usaha, bukan alamat lengkapnya.
 */
export default function Page() {
    return (
        <div>
            <p className="text-sm text-[var(--color-graphite)] mb-5 max-w-[680px]">
                Daftar proyek Problem Based Learning yang ditampilkan di halaman{" "}
                <b>/informasi/luaran</b>. Pengunjung dapat menyaringnya per program studi dan
                sumber proyek.
            </p>
            <ResourceEditor
                hasPublished
                hasOrder
                apiPath="/api/admin/pbl"
                listPath="/api/admin/pbl"
                publicHref="/informasi/luaran"
                title="Proyek Problem Based Learning"
                tableFields={["prodi", "proyek", "sumber", "mitra"]}
                filters={[
                    { key: "prodi", label: "Program Studi" },
                    { key: "sumber", label: "Sumber" },
                ]}
                fields={[
                    { key: "prodi", label: "Program studi", type: "combobox", required: true },
                    { key: "proyek", label: "Nama proyek", type: "textarea", required: true },
                    { key: "sumber", label: "Sumber proyek", type: "select", options: ["Internal", "Eksternal", "Kompetisi"], required: true },
                    { key: "mitra", label: "Nama mitra (tanpa alamat)", type: "textarea", preview: "pbl-text", placeholder: "1. Mitra pertama\n2. Mitra kedua" },
                    { key: "bidang", label: "Bidang usaha mitra", type: "textarea", preview: "pbl-text" },
                    { key: "waktu", label: "Waktu pelaksanaan" },
                    { key: "jumlahMahasiswa", label: "Jumlah mahasiswa terlibat", type: "number" },
                    { key: "mahasiswa", label: "Nama mahasiswa (pisahkan dengan titik koma)", type: "textarea" },
                    {
                        key: "peranNama",
                        label: "Cakupan nama yang dicantumkan",
                        type: "select",
                        options: ["semua", "ketua"],
                    },
                    { key: "jumlahProdi", label: "Jumlah program studi terlibat", type: "number" },
                    { key: "hasil", label: "Hasil PBL", type: "textarea", preview: "pbl-text", placeholder: "1. Hasil pertama\n2. Hasil kedua" },
                    { key: "belum", label: "Keterangan bila belum dimanfaatkan", type: "textarea", preview: "pbl-text" },
                    { key: "sudah", label: "Keterangan bila sudah dimanfaatkan", type: "textarea", preview: "pbl-text" },
                    { key: "order", label: "Urutan tampil", type: "number" },
                ]}
            />
        </div>
    );
}
