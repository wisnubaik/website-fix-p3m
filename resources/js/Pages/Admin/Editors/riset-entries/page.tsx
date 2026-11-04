import { useEditedPage } from '@/components/admin/PageEditorContext';
"use client";

import { useState } from "react";
import ResourceEditor from "@/components/admin/ResourceEditor";
import { RISET_CATEGORIES, RISET_CATEGORY_LABELS, type RisetCategory } from "@/lib/riset-entries";

/** Halaman publik yang menampilkan tiap kategori. buat tombol "Lihat di situs". */
const PUBLIC_HREF: Record<RisetCategory, string> = {
    "penelitian-internal": "/penelitian/internal",
    "penelitian-eksternal": "/penelitian/eksternal",
    "penelitian-unggulan": "/penelitian/unggulan",
    "pkm-internal": "/pkm/internal",
    "pkm-eksternal": "/pkm/eksternal",
    "pkm-unggulan": "/pkm/unggulan",
};

/**
 * Editor data Penelitian & PkM per judul.
 *
 * Yang diubah di sini LANGSUNG mengubah halaman publik: jumlah judul,
 * total nominal, grafik tren, dan isi tabelnya semua dihitung ulang dari
 * baris-baris ini. Jadi kalau ada koreksi data, cukup edit di sini, * nggak perlu menyentuh kode atau meng-upload ulang file apa pun.
 */
export default function Page() {
    const pagePath = useEditedPage();
    const fixedCategory = RISET_CATEGORIES.some(category => PUBLIC_HREF[category] === pagePath);
    const [category, setCategory] = useState<RisetCategory>((pagePath.slice(1).replace("/", "-") || "penelitian-internal") as RisetCategory);

    return (
        <div>
            <p className="text-sm text-[var(--color-graphite)] mb-4 max-w-[680px]">
                Data yang <b>dipublikasikan</b> di halaman Penelitian &amp; PkM. Perubahan di sini
                otomatis memperbarui grafik, jumlah judul, total nominal, dan tabel di situs.
                Berkas dokumen aslinya tidak ditampilkan di situs publik. kelola melalui sistem dokumen internal institusi. <b>Data Internal P3M-PNM</b> adalah arsip situs lama yang hanya-baca, bukan tempat unggah dokumen tahunan.
            </p>

            {/* Pilih kategori. tiap kategori punya daftarnya sendiri */}
            {!fixedCategory && <div className="flex flex-wrap gap-2 mb-6">
                {RISET_CATEGORIES.map((c) => (
                    <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`text-sm font-medium px-3 py-2 border transition-colors ${
                            category === c
                                ? "bg-[var(--color-absolute-zero)] text-white border-[var(--color-absolute-zero)]"
                                : "text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
                        }`}
                    >
                        {RISET_CATEGORY_LABELS[c]}
                    </button>
                ))}
            </div>}

            {/* key={category} -> remount penuh tiap ganti kategori, biar form &
                daftar nggak kebawa sisa state kategori sebelumnya. */}
            <ResourceEditor
                key={category}
                hasPublished
                apiPath="/api/admin/riset-entries"
                listPath={`/api/admin/riset-entries?category=${category}`}
                publicHref={PUBLIC_HREF[category]}
                title={RISET_CATEGORY_LABELS[category]}
                extraFields={{ category }}
                // Semua kolom yang dipublikasikan ikut tampil di tabel, biar
                // isi backend persis mencerminkan apa yang dilihat pengunjung.
                tableFields={["year", "title", "leader", "member1", "member2", "funding"]}
                // Pilihan tahunnya diambil otomatis dari data, jadi tahun baru
                // langsung muncul sendiri tanpa perlu ubah kode.
                filters={[{ key: "year", label: "Tahun" }]}
                sortKeys={[
                    { key: "year", dir: "desc" },
                    { key: "order", dir: "asc" },
                ]}
                fields={[
                    { key: "year", label: "Tahun (4 digit, mis. 2025)", required: true },
                    { key: "title", label: "Judul penelitian / pengabdian", type: "textarea", required: true },
                    { key: "leader", label: "Ketua penelitian / pengabdian", required: true },
                    { key: "member1", label: "Anggota 1" },
                    { key: "member2", label: "Anggota 2" },
                    {
                        key: "funding",
                        label: "Jumlah pendanaan (rupiah, angka saja)",
                        type: "number",
                        display: "currency",
                    },
                    { key: "order", label: "Urutan dalam tahun", type: "number" },
                ]}
            />
        </div>
    );
}
