/**
 * Daftar SEMUA halaman situs lama (Google Sites, sites.google.com/pnm.ac.id/p3m)
 * yang perlu di-backup ke ArchiveBlock, satu per satu, sebelum situs lama
 * dimatikan. Nggak semuanya udah keisi. status di bawah nunjukin progress.
 *
 * "slug" di sini = value kolom `page` di ArchiveBlock, dan HARUS persis
 * sama dengan slug yang dipakai pas nulis data (lihat prisma/seed.ts,
 * bagian archiveBlocks kalau udah ada).
 *
 * status:
 * - "done"    sudah di-backup lengkap ke ArchiveBlock
 * - "pending" belum disentuh sama sekali
 */
export const ARCHIVE_PAGES: {
    slug: string;
    label: string;
    originalUrl: string;
    status: "done" | "pending";
}[] = [
    { slug: "home", label: "Home", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/home", status: "done" },
    { slug: "profil-p3m", label: "Profil P3M", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/profil-p3m", status: "done" },

    { slug: "penelitian-internal", label: "Penelitian. Internal", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/penelitian/internal", status: "done" },
    { slug: "penelitian-eksternal", label: "Penelitian. Eksternal", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/penelitian/eksternal", status: "done" },
    { slug: "penelitian-unggulan", label: "Penelitian. Unggulan", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/penelitian/unggulan", status: "done" },
    { slug: "penelitian-unggulan-seleksi-proposal", label: "Penelitian. Unggulan. Seleksi Proposal", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/penelitian/unggulan/seleksi-proposal", status: "done" },
    { slug: "penelitian-unggulan-seleksi-administrasi", label: "Penelitian. Unggulan. Seleksi Administrasi", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/penelitian/unggulan/seleksi-administrasi", status: "done" },
    { slug: "penelitian-dokumen", label: "Penelitian. Dokumen", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/penelitian/dokumen", status: "done" },

    { slug: "pkm-internal", label: "PkM. Internal", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/pkm/internal", status: "done" },
    { slug: "pkm-eksternal", label: "PkM. Eksternal", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/pkm/ekternal", status: "done" },
    { slug: "pkm-unggulan", label: "PkM. Unggulan", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/pkm/unggulan", status: "done" },
    { slug: "pkm-dokumen", label: "PkM. Dokumen", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/pkm/dokumen", status: "done" },
    { slug: "pkm-rekognisi-luaran", label: "PkM. Rekognisi Luaran PkM", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/pkm/rekognisi-luaran-pkm", status: "done" },

    { slug: "monitoring", label: "Monev. Monitoring dan Evaluasi", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/monitoring", status: "done" },
    { slug: "monev-indikator", label: "Monev. Indikator Penilaian", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/monitoring/indikator-penilian-monev", status: "done" },
    { slug: "monev-2026", label: "Monev. Monev 2026", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/monitoring/monev-2026", status: "done" },
    { slug: "monev-bima", label: "Monev. Monev BIMA", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/monitoring/monev-bima", status: "done" },

    { slug: "semhas", label: "Seminar Hasil", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/semhas", status: "done" },
    { slug: "ki", label: "KI (Kekayaan Intelektual)", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/Kekayaan-intelektual", status: "done" },
    { slug: "panduan", label: "Panduan", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/panduan", status: "done" },
    { slug: "asesmen", label: "Asesmen Lapangan", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/TRPL", status: "done" },

    { slug: "informasi-pengumuman", label: "Informasi. Pengumuman", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/informasi/pengumuman", status: "done" },
    { slug: "informasi-luaran", label: "Informasi. Luaran", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/informasi/luaran", status: "done" },
    { slug: "informasi-laporan-keuangan", label: "Informasi. Laporan Keuangan", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/informasi/laporan-keuangan", status: "done" },
    { slug: "informasi-mitra-kerjasama", label: "Informasi. Mitra Kerjasama", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/informasi/mitra-kerjasama", status: "done" },
    { slug: "informasi-kegiatan", label: "Informasi. Kegiatan", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/informasi/kegiatan", status: "done" },
    { slug: "informasi-sinta", label: "Informasi. SINTA", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/informasi/sinta", status: "done" },
    { slug: "informasi-tkt", label: "Informasi. TKT", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/informasi/Tingkat-Kesiapterapan-Teknologi", status: "done" },

    { slug: "repository", label: "Repository", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/repository", status: "done" },
    { slug: "hubungi-kami", label: "Hubungi Kami", originalUrl: "https://sites.google.com/pnm.ac.id/p3m/hubungi-kami", status: "done" },
];
