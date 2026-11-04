export type NavItem = {
    label: string;
    href?: string;
    id?: string;
    children?: { label: string; href: string }[];
};

export const NAV: NavItem[] = [
    { label: "Beranda", href: "/", id: "home" },
    { label: "Tentang", href: "/profil", id: "profil" },
    {
        label: "Penelitian",
        id: "penelitian",
        children: [
            { label: "Internal", href: "/penelitian/internal" },
            { label: "Eksternal", href: "/penelitian/eksternal" },
            { label: "Unggulan", href: "/penelitian/unggulan" },
        ],
    },
    {
        label: "PkM",
        id: "pkm",
        children: [
            { label: "Internal", href: "/pkm/internal" },
            { label: "Eksternal", href: "/pkm/eksternal" },
            { label: "Unggulan", href: "/pkm/unggulan" },
        ],
    },
    { label: "Riset Grup", href: "/riset-grup", id: "riset-grup" },
    {
        label: "Layanan",
        id: "layanan",
        children: [
            { label: "Monev", href: "/layanan/monev" },
            { label: "Semhas", href: "/layanan/semhas" },
            { label: "Kekayaan intelektual", href: "/layanan/ki" },
            { label: "Panduan", href: "/layanan/panduan" },
            { label: "Asesmen", href: "/layanan/asesmen" },
        ],
    },
    {
        label: "Informasi",
        id: "informasi",
        children: [
            { label: "Pengumuman", href: "/informasi/pengumuman" },
            { label: "Luaran", href: "/informasi/luaran" },
            { label: "Laporan keuangan", href: "/informasi/laporan-keuangan" },
            { label: "Mitra kerjasama", href: "/informasi/mitra" },
            { label: "Kegiatan", href: "/informasi/kegiatan" },
            { label: "SINTA", href: "/informasi/sinta" },
            { label: "TKT", href: "/informasi/tkt" },
        ],
    },
    { label: "Repository", href: "/repository", id: "dokumen" },
];

/**
 * Daftar route publik yang diratakan (flatten) dari NAV, dipakai buat
 * dropdown pilihan link di admin (mis. CTA Hero). biar admin nggak bisa
 * ngetik link sembarang/typo yang berujung 404. Tambah manual route yang
 * nggak ada di NAV (mis. /hubungi, yang cuma dipasang sebagai tombol CTA
 * di Navbar, bukan item menu).
 */
export const ROUTE_OPTIONS: { label: string; href: string }[] = [
    ...NAV.flatMap((item) =>
        item.children
            ? item.children.map((c) => ({ label: `${item.label}, ${c.label}`, href: c.href }))
            : item.href
              ? [{ label: item.label, href: item.href }]
              : []
    ),
    { label: "Hubungi kami", href: "/hubungi" },
];
