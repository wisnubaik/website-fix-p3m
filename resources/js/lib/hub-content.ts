// Runtime: database adalah sumber kebenaran. Hasil kosong tetap kosong; kegagalan DB diteruskan.
export type HubItem = {
    index: string;
    title: string;
    desc: string;
    href: string;
    accent: string;
    bg: string;
};

const A = {
    navy: { accent: "var(--color-navy-700)", bg: "var(--color-navy-100)" },
    gold: { accent: "var(--color-gold-600)", bg: "var(--color-gold-100)" },
    teal: { accent: "var(--color-teal-600)", bg: "var(--color-teal-100)" },
    violet: { accent: "var(--color-violet-600)", bg: "var(--color-violet-100)" },
    rose: { accent: "var(--color-rose-600)", bg: "var(--color-rose-100)" },
};

/** Resolve nama warna aksen (dari DB) ke CSS var. fallback navy kalau nama nggak dikenali. */
export function resolveAccent(name: string): { accent: string; bg: string } {
    return A[name as keyof typeof A] ?? A.navy;
}

// Catatan: kartu "Dokumen" & "Rekognisi" sengaja tidak ada di sini lagi, // semua jenis dokumen (termasuk rekognisi) sekarang terpusat di /dokumen,
// bukan tersebar per skema.
export const PENELITIAN_ITEMS: HubItem[] = [
    { index: "01", title: "Penelitian internal", desc: "Skema kompetitif yang didanai dari DIPA Politeknik Negeri Madiun.", href: "/penelitian/internal", ...A.navy },
    { index: "02", title: "Penelitian eksternal", desc: "Pendanaan dari BIMA Kemdiktisaintek dan mitra eksternal lainnya.", href: "/penelitian/eksternal", ...A.gold },
    { index: "03", title: "Penelitian unggulan", desc: "Skema unggulan program studi dengan output strategis.", href: "/penelitian/unggulan", ...A.teal },
];

export const PKM_ITEMS: HubItem[] = [
    { index: "01", title: "PkM internal", desc: "Skema kompetitif PkM internal dari DIPA Politeknik Negeri Madiun.", href: "/pkm/internal", ...A.navy },
    { index: "02", title: "PkM eksternal", desc: "Pendanaan PkM dari BIMA Kemdiktisaintek dan mitra eksternal.", href: "/pkm/eksternal", ...A.gold },
    { index: "03", title: "PkM unggulan", desc: "Skema unggulan untuk pengabdian berdampak strategis.", href: "/pkm/unggulan", ...A.teal },
];

/** Ambil kartu hub (Penelitian/PkM) dari DB, fallback ke default hardcode kalau kosong. */
export async function getHubCards(hub: "penelitian" | "pkm", fallback: HubItem[]): Promise<HubItem[]> {
    return fallback.filter((item) => item.href.startsWith(`/${hub}/`));
}
