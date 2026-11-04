import type { DocSection, FilterChip } from "./doc-types";

// =====================================================================
// Hub dokumen terpusat. SEMUA dokumen (template, panduan, kontrak,
// seleksi, rekognisi, renstra, laporan) untuk Penelitian & PkM ada di
// SINI, dikelompokkan per jenis dokumen (bukan per skema). Halaman
// Penelitian/PkM (Internal/Eksternal/Unggulan) sendiri HANYA menampilkan
// grafik + daftar proposal/laporan dari tabel RisetEntry.
// =====================================================================

export const DOKUMEN_CHIPS: FilterChip[] = [
    { id: "all", label: "Semua" },
    { id: "renstra", label: "Renstra" },
    { id: "panduan", label: "Panduan & Skema" },
    { id: "template", label: "Template" },
    { id: "kontrak", label: "Kontrak" },
    { id: "seleksi", label: "Seleksi" },
    { id: "rekognisi", label: "Rekognisi" },
    { id: "laporan", label: "Laporan & Arsip" },
];

export const DOKUMEN_SECTIONS: DocSection[] = [
    {
        title: "Renstra P3M PNM",
        mark: "REN",
        items: [
            { name: "Renstra Penelitian P3M PNM 2025-2029", kind: "pdf", year: "2025", cat: "renstra" },
            { name: "Renstra Pengabdian P3M PNM 2025-2029", kind: "pdf", year: "2025", cat: "renstra" },
        ],
    },
    {
        title: "Buku Panduan Umum",
        mark: "BUK",
        items: [
            { name: "Buku Panduan 2026", kind: "pdf", year: "2026", cat: "panduan" },
            { name: "Buku Panduan 2025", kind: "pdf", year: "2025", cat: "panduan" },
            { name: "Buku Panduan Dirjen Kemdiktisaintek 2025", kind: "pdf", year: "2025", cat: "panduan" },
        ],
    },
    {
        title: "Panduan Skema Penelitian & PkM",
        mark: "SKM",
        items: [
            { name: "Panduan Penelitian Unggulan 2026", kind: "pdf", year: "2026", cat: "panduan" },
            { name: "Skema SINERGI 2026 (Hilirisasi Riset)", kind: "pdf", year: "2026", cat: "panduan" },
            { name: "Skema Ajakan Industri 2026 (Hilirisasi Riset)", kind: "pdf", year: "2026", cat: "panduan" },
            { name: "Panduan PkM Desa Binaan", kind: "pdf", cat: "panduan" },
            { name: "Panduan PkM Reguler", kind: "pdf", cat: "panduan" },
            { name: "Panduan PkM Unggulan", kind: "pdf", cat: "panduan" },
        ],
    },
    {
        title: "Template Penelitian",
        mark: "TPL",
        items: [
            { name: "Template Proposal Penelitian Internal", kind: "docx", cat: "template" },
            { name: "Template Proposal Penelitian Unggulan", kind: "docx", cat: "template" },
            { name: "Template Laporan Kemajuan", kind: "docx", cat: "template" },
            { name: "Template Laporan Akhir Penelitian", kind: "docx", cat: "template" },
            { name: "Format SPTJB Bermaterai", kind: "pdf", cat: "template" },
            { name: "Format Cover Buku Laporan Penelitian (kuning gading)", kind: "pdf", cat: "template" },
        ],
    },
    {
        title: "Template PkM",
        mark: "TPM",
        items: [
            { name: "Template Proposal PkM", kind: "docx", cat: "template" },
            { name: "Template Proposal PkM Unggulan", kind: "docx", cat: "template" },
            { name: "Template Laporan Kemajuan PkM", kind: "docx", cat: "template" },
            { name: "Template Laporan Akhir PkM", kind: "docx", cat: "template" },
            { name: "Format Cover Buku Laporan PkM (biru donker)", kind: "pdf", cat: "template" },
        ],
    },
    {
        title: "Surat Kontrak & Kesanggupan",
        mark: "KTR",
        items: [
            { name: "Nomor Surat Kontrak PPM 2025", kind: "xlsx", year: "2025", cat: "kontrak" },
            { name: "Surat Pernyataan Kesanggupan Penelitian 2025", kind: "xlsx", year: "2025", cat: "kontrak" },
            { name: "Nomor Surat Kontrak Penelitian 2024", kind: "pdf", year: "2024", cat: "kontrak" },
            { name: "Surat Pernyataan Kesanggupan Penelitian 2024", kind: "pdf", year: "2024", cat: "kontrak" },
            { name: "Nomor Surat Kontrak PkM 2025", kind: "xlsx", year: "2025", cat: "kontrak" },
            { name: "Surat Pernyataan Kesanggupan PkM 2025", kind: "xlsx", year: "2025", cat: "kontrak" },
        ],
    },
    {
        title: "Seleksi Administrasi & Proposal Unggulan",
        mark: "SEL",
        items: [
            { name: "Checklist Administrasi Proposal", kind: "pdf", cat: "seleksi" },
            { name: "Pedoman Seleksi Substansi 2026", kind: "pdf", year: "2026", cat: "seleksi" },
            { name: "Form Penilaian Proposal Unggulan", kind: "docx", cat: "seleksi" },
            { name: "Hasil Seleksi Administrasi 2025", kind: "pdf", year: "2025", cat: "seleksi" },
            { name: "Hasil Seleksi Administrasi 2024", kind: "pdf", year: "2024", cat: "seleksi" },
            { name: "Hasil Seleksi Substansi Penelitian Unggulan 2025", kind: "pdf", year: "2025", cat: "seleksi" },
            { name: "Hasil Seleksi Substansi Penelitian Unggulan 2024", kind: "pdf", year: "2024", cat: "seleksi" },
            { name: "Hasil Seleksi Substansi Penelitian Unggulan 2023", kind: "pdf", year: "2023", cat: "seleksi" },
            { name: "Hasil Seleksi PkM Unggulan 2025", kind: "pdf", year: "2025", cat: "seleksi" },
        ],
    },
    {
        title: "Rekognisi Luaran PkM",
        mark: "REK",
        items: [
            { name: "Pedoman Rekognisi Luaran PkM", kind: "pdf", cat: "rekognisi" },
            { name: "Form Pengajuan Rekognisi", kind: "docx", cat: "rekognisi" },
            { name: "Daftar Rekognisi Luaran PkM 2025", kind: "xlsx", year: "2025", cat: "rekognisi" },
        ],
    },
    {
        title: "Laporan & Arsip Kegiatan",
        mark: "LAP",
        items: [
            { name: "Laporan Tahunan P3M 2025", kind: "pdf", year: "2025", cat: "laporan" },
            { name: "Laporan Tahunan P3M 2024", kind: "pdf", year: "2024", cat: "laporan" },
            { name: "Laporan Tahunan P3M 2023", kind: "pdf", year: "2023", cat: "laporan" },
            { name: "Laporan Tahunan P3M 2022", kind: "pdf", year: "2022", cat: "laporan" },
            { name: "Laporan SEMHAS 2025", kind: "pdf", year: "2025", cat: "laporan" },
            { name: "Laporan SEMHAS 2024", kind: "pdf", year: "2024", cat: "laporan" },
            { name: "Laporan SEMHAS 2023", kind: "pdf", year: "2023", cat: "laporan" },
            { name: "Laporan SEMHAS Penelitian Kompetitif Internal 2022", kind: "pdf", year: "2022", cat: "laporan" },
            { name: "Daftar Penerima BIMA Penelitian 2026", kind: "xlsx", year: "2026", cat: "laporan" },
            { name: "Daftar Penerima BIMA PkM 2026", kind: "xlsx", year: "2026", cat: "laporan" },
            { name: "Rekap Pendanaan Eksternal 2023", kind: "pdf", year: "2023", cat: "laporan" },
        ],
    },
];
