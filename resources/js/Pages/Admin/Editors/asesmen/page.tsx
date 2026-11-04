"use client";

import ResourceEditor from "@/components/admin/ResourceEditor";

/**
 * Pelaksanaan asesmen lapangan akreditasi. Dipisah dari Kelola Periode
 * Acara karena bentuk datanya memang beda: asesmen tidak punya tempat,
 * keterangan, maupun rentang tanggal, dan bisa berulang untuk program
 * studi yang berbeda-beda.
 */
export default function Page() {
    return (
        <div>
            <p className="text-sm text-[var(--color-graphite)] mb-5 max-w-[680px]">
                Program studi dan tanggal pelaksanaan asesmen lapangan yang tampil di halaman{" "}
                <b>/layanan/asesmen</b>. Tambahkan satu baris setiap kali ada asesmen program studi
                lain. Urutan tampil mengikuti angka urutan yang Anda atur.
            </p>
            <ResourceEditor
                hasPublished
                hasOrder
                apiPath="/api/admin/asesmen"
                listPath="/api/admin/asesmen"
                publicHref="/layanan/asesmen"
                title="Asesmen Lapangan"
                tableFields={["prodi", "tanggal"]}
                fields={[
                    { key: "prodi", label: "Program studi", type: "combobox", required: true },
                    { key: "tanggal", label: "Tanggal asesmen", type: "date", required: true },
                    { key: "order", label: "Urutan tampil", type: "number" },
                ]}
            />
        </div>
    );
}
