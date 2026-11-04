import { router } from '@inertiajs/react';
import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import LinkInput from '@/components/admin/LinkInput';
import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/admin/Toast";


type Hero = {
    badge: string;
    titleText: string;
    titleItalicWord: string;
    lead: string;
    ctaPrimaryLabel: string;
    ctaPrimaryHref: string;
    ctaSecondaryLabel: string;
    ctaSecondaryHref: string;
};

const FIELD_LABELS: { key: keyof Hero; label: string; type?: "text" | "textarea" | "select" }[] = [
    { key: "badge", label: "Teks kecil di atas judul" },
    { key: "titleText", label: "Judul utama" },
    { key: "lead", label: "Paragraf di bawah judul", type: "textarea" },
    { key: "ctaPrimaryLabel", label: "Label tombol 1" },
    { key: "ctaPrimaryHref", label: "Link tombol 1", type: "select" },
    { key: "ctaSecondaryLabel", label: "Label tombol 2" },
    { key: "ctaSecondaryHref", label: "Link tombol 2", type: "select" },
];

export default function HeroAdminPage() {
    const { showToast } = useToast();
    const [data, setData] = useState<Hero | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const [saved, setSaved] = useState('');
    const snapshot = (value: Hero) => JSON.stringify(FIELD_LABELS.map(field => value[field.key]));
    const dirty = !!data && snapshot(data) !== saved;
    const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
    useEffect(() => {
        const unload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', unload);
        const remove = router.on('before', () => { if (dirtyRef.current && !window.confirm('Perubahan judul utama belum disimpan. Tinggalkan editor?')) return false; });
        return () => { window.removeEventListener('beforeunload', unload); remove(); };
    }, []);

    useEffect(() => {
        cmsFetch("/api/admin/hero")
            .then((r) => { if(!r.ok) throw new Error("Gagal memuat"); return r.json(); })
            .then((d) => {
                setData(d);
                setSaved(snapshot(d));
                setLoading(false);
            })
            .catch(() => {
                showToast("Gagal memuat data Hero.", "error");
                setLoading(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function save() {
        try {
        if (!data) return;
        setSaving(true);
        setNotice('');
        const res = await cmsFetch("/api/admin/hero", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...Object.fromEntries(FIELD_LABELS.map(f => [f.key, data[f.key]])), titleItalicWord: "" }),
        });
        setSaving(false);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.errors ? Object.values(err.errors).flat().join(" ") : err.message ?? err.error ?? "Gagal menyimpan.", "error");
            return;
        }
        setSaved(snapshot(data));
        setNotice("Judul utama tersimpan. Muat ulang Beranda untuk melihat hasilnya.");
        showToast("Judul utama beranda berhasil diperbarui.");
        } catch { showToast("Jaringan gagal. Isian tetap ada, coba lagi.","error"); } finally { setSaving(false); }
    }

    if (loading) return <div className="text-sm text-[var(--color-graphite)]">Memuat...</div>;
    if (!data) return <div className="text-sm text-[var(--color-rose-600)]">Gagal memuat data.</div>;

    return (
        <div className="max-w-[560px]">
            <div className="flex items-center justify-between mb-1">
                <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)]">Judul utama beranda</h1>
                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--color-cosmic-candy)] hover:underline"
                >
                    Lihat di situs ↗
                </a>
            </div>
            <p className="text-sm text-[var(--color-graphite)] mb-6">
                Atur teks di atas judul, judul utama, paragraf pembuka, dan dua tombol Beranda. Judul ditampilkan tanpa cetak miring.
            </p>
            <p className="text-[13px] text-[var(--color-graphite)] mb-6 border-l-2 border-[var(--color-outline-gray)] pl-3">
                <b>Aturan tombol:</b> label harus sesuai isi halaman tujuannya, dan tujuannya harus tetap benar
                sepanjang tahun. Jangan pakai label seperti &ldquo;Submit proposal&rdquo; kalau halaman tujuannya
                bukan formulir. Tautan formulir yang hanya berlaku per periode dipasang di menu{" "}
                <b>Tautan Pengusulan</b>. Kalau label memuat tahun (mis. &ldquo;Buka panduan 2026&rdquo;), perbarui
                setiap tahun.
            </p>

            <div className="cms-notice mb-4">{dirty ? 'Ada perubahan yang belum disimpan. ' : ''}Simpan perubahan melalui tombol Simpan judul utama. Tombol Terbitkan halaman tidak menyimpan bagian ini.</div>
            {notice && <p role="status" className="cms-notice success mb-4">{notice}</p>}
            <fieldset disabled={saving} className="flex flex-col gap-4">
                {FIELD_LABELS.map((f) => (
                    <div key={f.key}>
                        <label htmlFor={f.key} className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                            {f.label}
                        </label>
                        {f.type === "textarea" ? (
                            <CmsTextarea
                                id={f.key}
                                rows={3}
                                value={data[f.key]}
                                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                                className="w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]"
                            />
                        ) : f.type === "select" ? (
                            <LinkInput id={f.key} internalOnly value={data[f.key] ?? ''} onChange={value=>setData({...data,[f.key]:value})}/>
                        ) : (
                            <CmsInput
                                id={f.key}
                                value={data[f.key]}
                                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                                className="w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]"
                            />
                        )}

                    </div>
                ))}
            </fieldset>

            <button
                onClick={save}
                disabled={saving}
                className="mt-6 bg-[var(--color-absolute-zero)] text-white text-sm font-semibold px-5 py-2.5 hover:bg-black transition-colors disabled:opacity-50"
            >
                {saving ? "Menyimpan..." : "Simpan judul utama"}
            </button>
        </div>
    );
}
