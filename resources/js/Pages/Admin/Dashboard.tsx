import AdminLayout from "@/Layouts/AdminLayout";

import { usePage } from "@inertiajs/react";

import type { SharedProps } from "@/types";

import { Link } from "@inertiajs/react";

import MissingLinksPanel from "@/components/admin/MissingLinksPanel";

const CARD_META = [
    { href: "/admin/pengumuman", label: "Pengumuman", desc: "Daftar pengumuman di /informasi/pengumuman" },
    { href: "/admin/tautan-pengusulan", label: "Tautan Pengusulan", desc: "Link formulir usulan proposal di beranda (per periode)" },
    { href: "/admin/riset-grup", label: "Riset Grup", desc: "Tabel kelompok riset di /riset-grup" },
    { href: "/admin/dokumen-layanan", label: "Kelola Dokumen Layanan", desc: "Dokumen untuk Monev, Semhas, KI, Panduan, dan Asesmen" },
    { href: "/admin/dokumen-informasi", label: "Kelola Dokumen Informasi", desc: "Dokumen untuk menu Dokumen dan sub-menu Informasi" },
    { href: "/admin/pemenang", label: "Pemenang Hibah", desc: "Daftar pemenang BIMA & Hiliriset di beranda" },
    { href: "/admin/tim", label: "Tim P3M", desc: "Anggota tim di halaman Hubungi Kami" },
];

function MenuShortcut() {const {auth}=usePage<SharedProps>().props;return auth.user?.role==='SUPERADMIN'?<Link className="cms-button" href="/admin/menu">Menu & navigasi</Link>:null;}
function Page({counts,missingDocs,missingAnnouncements}: {counts:number[]; missingDocs:{id:string;name:string;section:string;kind:string}[]; missingAnnouncements:{id:string;num:string;title:string;kind:string}[]}) {
const CARDS = CARD_META.map((c, i) => ({ ...c, count: counts![i] }));
return (
        <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">
                Ringkasan
            </h1>
            <p className="text-sm text-[var(--color-graphite)] mb-6">
                Kelola isi situs, periksa dokumen, dan lanjutkan pekerjaan terakhir.
            </p>

            <div className="cms-panel mb-6"><h2>Pengelolaan situs</h2><p>Pilih halaman untuk mengubah isinya, atau buka pengaturan menu untuk menyusun navbar.</p><div className="cms-actions"><Link className="cms-button primary" href="/admin/halaman">Kelola halaman</Link><MenuShortcut /></div></div>
            <MissingLinksPanel docs={missingDocs} announcements={missingAnnouncements} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CARDS.map((c) => (
                    <Link
                        key={c.href}
                        href={c.href}
                        className="block min-w-0 break-words bg-white border border-[var(--color-outline-gray)] p-5 hover:border-[var(--color-absolute-zero)] transition-colors"
                    >
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                            <div className="font-semibold text-[var(--color-absolute-zero)]">{c.label}</div>
                            <div className="font-display text-2xl font-bold text-[var(--color-cosmic-candy)]">
                                {c.count}
                            </div>
                        </div>
                        <div className="text-[13px] text-[var(--color-graphite)]">{c.desc}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function Dashboard(props: Parameters<typeof Page>[0]) {return <AdminLayout><Page {...props}/></AdminLayout>;}