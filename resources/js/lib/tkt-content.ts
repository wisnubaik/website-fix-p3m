/**
 * Isi halaman /informasi/tkt.
 *
 * Sembilan tingkat di bawah disalin dari diagram TKT pada halaman situs
 * lama. Di sana bentuknya gambar, sehingga tidak dapat dicari, tidak dapat
 * dibaca pembaca layar, dan tidak terbaca di layar kecil. Di sini isinya
 * dijadikan data agar dapat dirender sebagai tabel; gambar diagramnya tetap
 * ditampilkan sebagai pelengkap.
 */

export type TingkatTkt = { tingkat: number; judul: string };

export const TKT_TINGKAT: TingkatTkt[] = [
    { tingkat: 1, judul: "Prinsip dasar telah diketahui dan dilaporkan" },
    { tingkat: 2, judul: "Formulasi konsep dan/atau aplikasi formulasi" },
    {
        tingkat: 3,
        judul: "Pembuatan konsep fungsi dan/atau karakteristik penting secara analitis dan eksperimental",
    },
    { tingkat: 4, judul: "Validasi komponen atau subsistem dalam ruang laboratorium" },
    { tingkat: 5, judul: "Validasi komponen atau subsistem dalam suatu lingkungan yang relevan" },
    {
        tingkat: 6,
        judul: "Demonstrasi model atau purwarupa sistem dan subsistem dalam suatu lingkungan yang relevan",
    },
    { tingkat: 7, judul: "Demonstrasi purwarupa sistem dalam lingkungan yang sebenarnya" },
    {
        tingkat: 8,
        judul: "Sistem telah melalui pengujian dan demonstrasi dalam lingkungan sebenarnya",
    },
    { tingkat: 9, judul: "Sistem benar-benar teruji dan terbukti melalui keberhasilan pengoperasian" },
];

/** Pengelompokan tingkat menurut jenis penelitian, sesuai diagram aslinya. */
export const TKT_TAHAP = [
    { nama: "Penelitian Dasar", dari: 1, sampai: 3, warna: "#C0392B" },
    { nama: "Penelitian Terapan", dari: 4, sampai: 6, warna: "#E8A317" },
    { nama: "Penelitian Pengembangan", dari: 7, sampai: 9, warna: "#2E8B4A" },
];

/** Pengantar, kalimat asli dari halaman situs lama. */
export const TKT_PENGANTAR =
    "Tingkat Kesiapan Teknologi adalah ukuran mengenai tingkat kesiapan sebuah teknologi, yaitu indikator yang menunjukkan seberapa siap atau matang suatu teknologi untuk diterapkan dan diadopsi oleh pengguna atau calon pengguna. Pengukurannya bersifat sistematis dan mendukung penilaian kematangan teknologi tertentu, sekaligus perbandingan kematangan antarteknologi.";

export const TKT_DIAGRAM = "/tkt/diagram.png";
