const BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * "2026-08-18" -> "18 Agustus 2026".
 *
 * Sengaja tidak memakai Date atau toLocaleDateString: tanggal di sini
 * adalah tanggal kalender polos tanpa jam, dan mengubahnya jadi objek Date
 * membuatnya tergeser satu hari pada zona waktu tertentu. Nilai yang bukan
 * ISO dikembalikan apa adanya supaya data lama tetap terbaca.
 */
export function formatTanggal(iso?: string | null) {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return iso;
    return `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** "08:00" + "08:20" -> "08:00-08:20". */
export function formatWaktu(mulai?: string | null, selesai?: string | null) {
    if (!mulai) return "";
    return selesai ? `${mulai}-${selesai}` : mulai;
}

/** Rentang dua tanggal ISO: "17-20 November 2025" kalau bulannya sama. */
export function formatRentang(mulai?: string | null, selesai?: string | null) {
    const a = formatTanggal(mulai);
    if (!selesai || selesai === mulai) return a;
    const b = formatTanggal(selesai);
    const pa = a.split(" "), pb = b.split(" ");
    if (pa.length === 3 && pb.length === 3 && pa[1] === pb[1] && pa[2] === pb[2]) {
        return `${pa[0]}-${pb[0]} ${pb[1]} ${pb[2]}`;
    }
    return `${a} - ${b}`;
}
