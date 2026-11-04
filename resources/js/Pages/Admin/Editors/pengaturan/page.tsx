import { fieldPolicy } from '@/lib/field-validation';
import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import { useEditedPage } from '@/components/admin/PageEditorContext';
import LinkInput from '@/components/admin/LinkInput';
import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { useRouter } from "@/lib/navigation";

type Settings = {
    logoUrl: string;
    institution: string;
    officeTitle: string;
    officeDescription: string;
    email: string;
    phone: string;
    fax: string;
    instagram: string;
    address: string;
    mapsUrl: string;
    poBox: string;
};

const FIELD_LABELS: { key: keyof Settings; label: string; type?: "text" | "textarea" }[] = [
    { key: "institution", label: "Nama institusi (tampil di TopBar)" },
    { key: "officeTitle", label: "Judul kartu kontak (halaman Hubungi), mis. \"Kantor P3M PNM\"" },
    { key: "officeDescription", label: "Deskripsi kartu kontak (halaman Hubungi)", type: "textarea" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telepon" },
    { key: "fax", label: "Fax (boleh kosong)" },
    { key: "instagram", label: "Instagram (mis. @p3m_pnm)" },
    { key: "address", label: "Alamat lengkap", type: "textarea" },
    { key: "mapsUrl", label: "Link Google Maps (dibuka saat alamat diklik, boleh kosong)" },
    { key: "poBox", label: "PO BOX (boleh kosong)" },
];

export default function SettingsAdminPage() {
    const globalOnly = useEditedPage() === "@global";
    const contactOnly = useEditedPage() === "/hubungi";
    const visibleFields = FIELD_LABELS.filter(field => (!contactOnly || field.key !== "institution") && (!globalOnly || !["institution","officeTitle","officeDescription","fax","poBox"].includes(field.key)));
    const { showToast } = useToast();
    const router = useRouter();
    const [data, setData] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        cmsFetch("/api/admin/settings")
            .then((r) => { if(!r.ok) throw new Error("Gagal memuat"); return r.json(); })
            .then((d) => {
                setData({ ...d, logoUrl: d.logoUrl ?? "", fax: d.fax ?? "", poBox: d.poBox ?? "", mapsUrl: d.mapsUrl ?? "" });
                setLoading(false);
            })
            .catch(() => {
                showToast("Gagal memuat pengaturan.", "error");
                setLoading(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function uploadLogo(file: File) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024 || !file.size) {
            showToast("Pilih logo PNG, JPG, atau WebP dengan ukuran maksimal 2 MiB.", "error");
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("visibility", "public");
            const res = await cmsFetch("/api/admin/upload", { method: "POST", body: form });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error ?? "Gagal mengunggah logo.");
            if (typeof result.url !== "string" || !/^\/uploads\/[a-zA-Z0-9-]+\.(png|jpg|webp)$/.test(result.url)) {
                throw new Error("Isi berkas harus berupa gambar PNG, JPG, atau WebP.");
            }
            setData(current => current ? { ...current, logoUrl: result.url } : current);
            showToast("Logo terunggah. Klik Simpan perubahan untuk menerapkannya.");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Gagal mengunggah logo. Coba lagi.", "error");
        } finally {
            setUploading(false);
        }
    }

    async function save() {
        try {
        if (!data || uploading || saving) return;
        setSaving(true);
        const res = await cmsFetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...Object.fromEntries(visibleFields.map(f => [f.key, data[f.key]])),
                ...(!contactOnly ? { logoUrl: data.logoUrl || null } : {}),
            }),
        });
        setSaving(false);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.errors ? Object.values(err.errors).flat().join(" ") : err.error ?? "Gagal menyimpan.", "error");
            return;
        }
        showToast("Pengaturan berhasil diperbarui.");
        router.refresh();
        } catch { showToast("Jaringan gagal. Isian tetap ada, coba lagi.","error"); } finally { setSaving(false); }
    }

    if (loading) return <div className="text-sm text-[var(--color-graphite)]">Memuat...</div>;
    if (!data) return <div className="text-sm text-[var(--color-rose-600)]">Gagal memuat data.</div>;

    return (
        <div className="max-w-[560px]">
            <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">
                {globalOnly ? "Logo dan kontak situs" : contactOnly ? "Kontak kantor P3M" : "Pengaturan Situs"}
            </h1>
            <p className="text-sm text-[var(--color-graphite)] mb-6">
                {globalOnly ? "Email, telepon, dan alamat tampil di bagian bawah footer. Instagram digunakan pada tombol sosial; tautan peta dibuka saat alamat diklik. Tombol Simpan perubahan di bagian ini langsung memperbarui kontak situs." : "Judul dan deskripsi kartu tampil di Hubungi Kami. Email, telepon, Instagram, alamat, dan tautan peta juga digunakan di bagian kontak lain pada situs. Perubahan kontak langsung berlaku setelah disimpan."}
            </p>

            {!contactOnly && <fieldset disabled={saving || uploading} className="mb-8 border-b border-[var(--color-outline-gray)] pb-6 disabled:opacity-60">
                <legend className="text-base font-semibold mb-3">Logo navigasi</legend>
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-3">
                    {/* Preview memakai sesi admin agar unggahan yang belum disimpan tetap terlihat. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.logoUrl || "/logo/p3m-pnm.png"} alt="Pratinjau logo navigasi" width={80} height={80} className="h-20 w-20 object-contain" />
                    <div className="min-w-0 flex-1">
                        <label htmlFor="logoFile" className="block text-[13px] font-medium mb-1">Ganti logo</label>
                        <CmsInput
                            id="logoFile"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            aria-describedby="logoHelp"
                            className="block w-full max-w-full text-sm"
                            onChange={event => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                if (file) void uploadLogo(file);
                            }}
                        />
                        <p id="logoHelp" className="text-xs text-[var(--color-graphite)] mt-2">PNG, JPG, atau WebP. Maksimal 2 MiB.</p>
                    </div>
                </div>
                {uploading && <p role="status" className="text-sm">Mengunggah logo...</p>}
                {data.logoUrl && <button type="button" onClick={() => setData({ ...data, logoUrl: "" })} className="text-sm underline underline-offset-2">Gunakan logo bawaan</button>}
            </fieldset>}

            <div className="flex flex-col gap-4">
                {visibleFields.map((f) => (
                    <div key={f.key}>
                        <label htmlFor={f.key} className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                            {f.label}
                        </label>
                        {f.key === "mapsUrl" ? <LinkInput id={f.key} value={data[f.key]} onChange={value => setData({...data, [f.key]:value})}/> : f.type === "textarea" ? (
                            <CmsTextarea
                                id={f.key}
                                rows={2}
                                value={data[f.key]}
                                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                                className="w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]"
                            />
                        ) : (
                            <CmsInput
                                policy={fieldPolicy("settings", f.key)}
                                id={f.key}
                                value={data[f.key]}
                                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                                className="w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]"
                            />
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={save}
                disabled={saving || uploading}
                className="mt-6 bg-[var(--color-absolute-zero)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-black transition-colors disabled:opacity-50"
            >
                {saving ? "Menyimpan..." : "Simpan perubahan"}
            </button>
        </div>
    );
}
