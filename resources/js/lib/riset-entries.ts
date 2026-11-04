import type { TrendPoint } from "@/components/ui/TrendChart";

/**
 * CATATAN PENTING: file ini HARUS bebas dari Prisma.
 *
 * Isinya (tipe, daftar kategori, label, dan fungsi hitung rekap) dipakai
 * bareng oleh Server Component, Client Component ("use client"), dan API
 * route. Kalau di sini ada `import`/`await import` ke lib/prisma, bundler
 * ikut menarik runtime Prisma ke bundle browser dan build-nya gagal dengan
 * "the chunking context does not support external modules (request:
 * node:module)".
 *
 * Query database-nya ada di lib/riset-entries.server.ts.
 */


/**
 * Satu entri Penelitian / PkM seperti yang ditampilkan di halaman publik.
 * Sengaja cuma 5 field: itu saja yang dipublikasikan. Data utuhnya (file
 * xlsx/PDF asli, kontrak, luaran, dst) tetap tersimpan di Data Internal
 * P3M-PNM di panel admin dan TIDAK dirender ke situs publik.
 */
export type RisetEntryView = {
    year: string;
    title: string;
    leader: string;
    member1: string;
    member2: string;
    funding: number;
};

/** Kunci kategori. harus sama persis dengan kolom `category` di RisetEntry. */
export const RISET_CATEGORIES = [
    "penelitian-internal",
    "penelitian-eksternal",
    "penelitian-unggulan",
    "pkm-internal",
    "pkm-eksternal",
    "pkm-unggulan",
] as const;

export type RisetCategory = (typeof RISET_CATEGORIES)[number];

/** Label manusiawi tiap kategori. dipakai di panel admin & judul tabel. */
export const RISET_CATEGORY_LABELS: Record<RisetCategory, string> = {
    "penelitian-internal": "Penelitian Internal",
    "penelitian-eksternal": "Penelitian Eksternal",
    "penelitian-unggulan": "Penelitian Unggulan",
    "pkm-internal": "PkM Internal",
    "pkm-eksternal": "PkM Eksternal",
    "pkm-unggulan": "PkM Unggulan",
};

export type YearSummary = { year: string; count: number; funding: number };

/**
 * Rekap jumlah judul & total nominal per tahun, urut tahun menaik.
 * Dihitung dari entri yang sama dengan yang tampil di tabel. jadi angka
 * di kartu rekap, grafik, dan tabel dijamin nggak pernah beda.
 */
export function summarizeByYear(entries: RisetEntryView[]): YearSummary[] {
    const map = new Map<string, YearSummary>();
    for (const e of entries) {
        const cur = map.get(e.year) ?? { year: e.year, count: 0, funding: 0 };
        cur.count += 1;
        cur.funding += e.funding;
        map.set(e.year, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.year.localeCompare(b.year));
}

/** Ubah rekap tahunan jadi titik-titik grafik tren (jumlah judul per tahun). */
export function trendFromSummary(summary: YearSummary[]): TrendPoint[] {
    return summary.map((s) => ({ year: s.year, value: s.count }));
}
