"use client";
import ResourceEditor from "@/components/admin/ResourceEditor";

export default function Page() {
    return (
        <ResourceEditor
            hasPublished
            flagEmptyField="href"
            apiPath="/api/admin/announcements"
            publicHref="/informasi/pengumuman"
            title="Pengumuman"
            fields={[
                { key: "num", label: "Nomor surat", required: true },
                { key: "tahun", label: "Tahun" },
                    { key: "title", label: "Judul", required: true },
                { key: "badge", label: "Kategori pengumuman", required: true },
                { key: "kind", label: "Jenis file", type: "select", options: ["pdf", "docx"], required: true },
                { key: "href", label: "File dokumen (opsional)", type: "file" },
                { key: "urgent", label: "Tampilkan tanda Penting", type: "boolean" },
                { key: "order", label: "Urutan", type: "number" },
            ]}
        />
    );
}
