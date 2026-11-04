import ResourceEditor from "@/components/admin/ResourceEditor";

export default function QuickAccessAdminPage() {
    return (
        <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">
                Quick Access (Beranda)
            </h1>
            <p className="text-sm text-[var(--color-graphite)] mb-6">
                Dokumen utama beranda: Renstra Penelitian, Renstra Pengabdian, Buku Panduan, dan Petunjuk Pelaporan Keuangan.
            </p>
            <ResourceEditor
                hasPublished
                apiPath="/api/admin/quick-access"
                title="Quick Access"
                publicHref="/"
                fields={[
                    { key: "title", label: "Judul", required: true },
                    { key: "meta", label: "Meta (mis. 'PDF 2025-2029')", required: true },
                    { key: "href", label: "Tautan dokumen atau halaman", required: true },
                    {
                        key: "iconName",
                        label: "Nama ikon",
                        type: "select",
                        options: ["FileText", "BookOpen", "Wallet", "Star", "Users", "Award"],
                        required: true,
                    },
                ]}
            />

            <div className="mt-10">
                <ResourceEditor
                    hasPublished
                    apiPath="/api/admin/content-list"
                    listPath="/api/admin/content-list?section=marquee"
                    extraFields={{ section: "marquee" }}
                    title="Teks Berjalan (Marquee)"
                    publicHref="/"
                    fields={[{ key: "text", label: "Teks", required: true }]}
                />
            </div>
        </div>
    );
}
