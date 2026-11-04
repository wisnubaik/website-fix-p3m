import HomeRecapEditor from '@/components/admin/HomeRecapEditor';
"use client";
import { useState } from "react";
import { Link } from "@inertiajs/react";
import ResourceEditor from "@/components/admin/ResourceEditor";
import PageMediaEditor from "@/components/admin/PageMediaEditor";
const TEXTS = [["home-agenda", "Agenda Berjalan"]];
export default function HomeAdminPage() {
    const [tab, setTab] = useState("home-agenda");
    const tabs = [...TEXTS, ["rekap", "Rekap Angka"], ["prodi", "Program Studi"]];
    return <div>
        <h1 className="font-display text-2xl font-bold mb-2">Konten Beranda</h1>
        <p className="text-sm text-[var(--color-graphite)] mb-4">Kelola label dan isi agenda, rincian proposal, pendanaan, serta program studi di beranda. Perbarui angka berdasarkan dokumen resmi; perubahan dicatat di log aktivitas.</p>
        <div className="flex flex-wrap gap-4 text-sm underline mb-6">
            <Link href="/admin/hero">Hero</Link><Link href="/admin/quick-access">Akses cepat</Link><Link href="/admin/pemenang">Pemenang hibah</Link><Link href="/admin/pengumuman">Pengumuman</Link>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`px-3 py-2 border text-sm ${tab === key ? "bg-[var(--color-absolute-zero)] text-white" : "bg-white"}`}>{label}</button>)}</div>
        {tab === "rekap" ? <HomeRecapEditor/> : tab === "prodi" ? <PageMediaEditor section="home-prodi" title="Program studi" publicHref="/" groups={["Program D-IV", "Program D-III"]} />
        : <ResourceEditor key={tab} hasPublished apiPath="/api/admin/content-list" listPath={`/api/admin/content-list?section=${tab}`} extraFields={{ section: tab }} title={TEXTS.find(t => t[0] === tab)![1]} publicHref="/" fields={[...(tab === "home-agenda" ? [{key:"label",label:"Label agenda (misalnya Agenda berjalan 2026)",required:true}] : []),{ key: "text", label: "Isi teks", type: "textarea", required: true }]} />}
    </div>;
}
