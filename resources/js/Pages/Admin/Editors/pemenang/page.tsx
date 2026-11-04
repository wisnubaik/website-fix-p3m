"use client";
import ResourceEditor from "@/components/admin/ResourceEditor";

export default function Page() {
    return (
        <div>
        <p className="mb-5 text-sm leading-relaxed text-[var(--color-graphite)]">
            Beranda menampilkan satu kategori pemenang setiap halaman. Tombol Next berpindah ke kategori berikutnya.
            Gunakan nama kategori yang sama persis untuk mengelompokkan pemenang dalam satu halaman.
            Kategori mengikuti urutan kemunculan pemenang pertama; nilai Urutan yang lebih kecil tampil lebih dahulu.
            Hanya pemenang yang dipublikasikan yang tampil. Kategori tanpa pemenang terbit tidak ditampilkan.
        </p>
        <ResourceEditor
            hasPublished
            apiPath="/api/admin/winners"
            publicHref="/"
            title="Pemenang Hibah (Beranda)"
            fields={[
                { key: "category", label: "Subjudul / kategori halaman (contoh: Penelitian)", required: true },
                { key: "name", label: "Nama pemenang", required: true },
                { key: "skema", label: "Skema", required: true },
                { key: "tag", label: "Tag badge (contoh: PDP)", required: true },
                { key: "order", label: "Urutan", type: "number" },
            ]}
        />
        </div>
    );
}
