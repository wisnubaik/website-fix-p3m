"use client";
import ResourceEditor from "./ResourceEditor";
export default function PageMediaEditor({ section, title, groups, publicHref, images = false }: { section: string; title: string; groups: string[]; publicHref: string; images?: boolean }) {
    return <>{section === "home-prodi" && <p className="cms-notice mb-4">Setiap program studi memiliki tingkatan diploma. Pilih tingkatan yang sudah ada atau pilih Lainnya (ketik sendiri) untuk menambah, misalnya Diploma II. Filter beranda mengikuti tingkatan pada program studi yang ditampilkan. Ubah tingkatan melalui Edit; filter hilang jika tidak lagi dipakai oleh prodi yang tampil.</p>}<ResourceEditor key={section} hasPublished defaultUploadVisibility="public" apiPath="/api/admin/documents" listPath={`/api/admin/documents?sections=${section}`}
        extraFields={{ section, kind: "link", category: images ? "gambar" : "dokumen" }} title={title} publicHref={publicHref}
        tableFields={section === "home-prodi" ? ["name", "groupTitle", "href"] : undefined}
        fields={[
            { key: "name", label: section === "home-prodi" ? "Nama program studi" : images ? "Judul gambar / dokumen" : "Nama tautan", required: true },
            ...(section === "home-prodi" ? [{ key: "groupTitle", label: "Tingkatan diploma", type: "combobox" as const, required: true }] : [{ key: "groupTitle", label: "Bagian halaman", type: "select" as const, options: groups, required: true }]),
            ...(images ? [{ key: "category", label: "Tampilan", type: "select" as const, options: ["gambar", "dokumen"], required: true }] : []),
            { key: "href", label: section === "home-prodi" ? "Alamat website program studi" : "Tautan atau unggah berkas publik", type: section === "home-prodi" ? "text" : "file", required: true },
        ]} /></>;
}
