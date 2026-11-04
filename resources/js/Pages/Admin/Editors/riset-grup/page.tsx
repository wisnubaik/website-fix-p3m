"use client";
import ResourceEditor from "@/components/admin/ResourceEditor";

export default function Page() {
    return (
        <ResourceEditor
            defaultUploadVisibility="public"
            hasPublished
            apiPath="/api/admin/riset-grup"
            publicHref="/riset-grup"
            title="Riset Grup"
            tableFields={["nama", "ketua", "fokus", "anggota", "roadmapHref"]}
            fields={[
                { key: "nama", label: "Nama riset grup", required: true },
                { key: "ketua", label: "Ketua", required: true },
                { key: "fokus", label: "Fokus riset", required: true },
                { key: "deskripsi", label: "Deskripsi", type: "textarea", required: true },
                { key: "roadmapHref", label: "Roadmap (opsional)", type: "file" },
                { key: "anggota", label: "Jumlah anggota", type: "number" },
                { key: "order", label: "Urutan", type: "number" },
            ]}
        />
    );
}
