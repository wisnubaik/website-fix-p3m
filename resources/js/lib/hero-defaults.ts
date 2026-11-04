/**
 * Isi awal Hero beranda. SATU sumber untuk tiga pemakai:
 * seed (prisma/seed/core.ts), API admin (app/api/admin/hero), dan fallback
 * beranda kalau database belum siap (app/(site)/page.tsx).
 *
 * Aturan tombol CTA: label harus sesuai isi halaman tujuannya, dan tujuannya
 * harus tetap benar sepanjang tahun. Link formulir yang hanya berlaku per
 * periode (mis. usulan proposal) dipasang lewat menu Tautan Pengusulan,
 * bukan di tombol Hero.
 */
export const HERO_DEFAULTS = {
    badge: "P3M Politeknik Negeri Madiun",
    titleText: "Pusat Penelitian dan Pengabdian kepada Masyarakat",
    titleItalicWord: "Masyarakat",
    lead: "Pusat Penelitian dan Pengabdian Kepada Masyarakat Politeknik Negeri Madiun mendorong riset terapan, hilirisasi, dan kolaborasi industri yang berdampak nyata bagi masyarakat dan dunia kerja.",
    ctaPrimaryLabel: "Buka panduan 2026",
    ctaPrimaryHref: "/layanan/panduan",
    ctaSecondaryLabel: "Lihat pengumuman",
    ctaSecondaryHref: "/informasi/pengumuman",
};
