// Domain resmi P3M. Isi NEXT_PUBLIC_SITE_URL di .env begitu domain
// production sudah fix. lihat .env.example. Fallback di bawah cuma
// placeholder biar build tidak error kalau env belum di-set.
export const SITE_URL = "https://p3m.pnm.ac.id";

export const SITE_NAME = "P3M Politeknik Negeri Madiun";

export const SITE_DESCRIPTION =
    "Pusat Penelitian dan Pengabdian Kepada Masyarakat Politeknik Negeri Madiun. Mendorong riset terapan, hilirisasi, dan kolaborasi industri.";

// Gambar pratinjau saat link dibagikan (WhatsApp, Facebook, LinkedIn).
// Sementara memakai logo resmi. Idealnya diganti gambar khusus 1200x630 px
// di public/og/, karena logo persegi sering terpotong di kartu pratinjau.
export const DEFAULT_OG_IMAGE = "/logo/p3m-pnm.png";

/**
 * Helper metadata per halaman: title + description yang kamu isi di
 * page.tsx otomatis dipakai juga untuk Open Graph (preview share
 * WhatsApp/medsos) & Twitter card, plus canonical URL. jadi tiap page.tsx
 * cukup isi sekali, tidak perlu tulis openGraph{} manual berulang-ulang.
 *
 * `path` = path relatif halaman ini, mis. "/penelitian/internal".
 * Kosongkan untuk halaman root ("/").
 */
export function pageMetadata({
    title,
    description,
    path = "",
}: {
    title: string;
    description: string;
    path?: string;
}): Record<string, unknown> {
    return {
        title,
        description,
        alternates: { canonical: path || "/" },
        openGraph: {
            title,
            description,
            url: path || "/",
            siteName: SITE_NAME,
            locale: "id_ID",
            type: "website",
            images: [{ url: DEFAULT_OG_IMAGE }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [DEFAULT_OG_IMAGE],
        },
    };
}
