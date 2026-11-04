"use client";
import ResourceEditor from "@/components/admin/ResourceEditor";

export default function Page() {
    return (
        <div>
            <p className="cms-help mb-5">Kartu tim yang tampil di halaman Hubungi Kami. Unggah foto, isi nama dan jabatan, lalu tambahkan keterangan melalui baris isian. Jika foto kosong, kartu memakai inisial.</p>
            <ResourceEditor
                defaultUploadVisibility="public"
                hasPublished
                apiPath="/api/admin/staff"
                publicHref="/hubungi"
                title="Tim P3M"
                fields={[
                    { key: "role", label: "Jabatan (contoh: Kepala P3M)", required: true },
                    { key: "name", label: "Nama lengkap", required: true },
                    { key: "initial", label: "Inisial saat foto kosong (contoh: AP)", required: true },
                    { key: "photoUrl", label: "Foto", type: "image" },
                    { key: "details", label: "Keterangan tim", type: "pairs" },
                    { key: "order", label: "Urutan", type: "number" },
                ]}
            />
        </div>
    );
}
