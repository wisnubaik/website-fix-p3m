import type { Announcement } from "@/components/ui/PengumumanList";

/**
 * Riwayat pengumuman resmi P3M, disalin dari halaman Pengumuman situs lama.
 * Urutannya sengaja dipertahankan persis seperti di situs asli.
 *
 * `tahun` HANYA diisi bila situs lama memang mencantumkannya. Tahun tidak
 * disimpulkan dari judul, karena angka tahun pada judul menunjuk periode
 * yang dibicarakan surat, bukan tahun surat itu sendiri. Pengumuman
 * "data SCOPUS dan SINTA" misalnya bernomor surat 2024 meski judulnya tidak
 * menyebut tahun sama sekali. Pengisian tahun yang belum diketahui
 * dilakukan lewat /admin/pengumuman oleh yang memegang berkas aslinya.
 *
 * `badge` disimpulkan dari kata kunci pada judul; yang menyangkut LPj,
 * pajak, atau perpanjangan ditandai "Tenggat waktu".
 *
 * Cadangan saja; sumber utamanya tabel Announcement.
 */
export const PENGUMUMAN: Announcement[] = [
    { num: "92", title: "Pengumuman Pengumpulan Pelaporan Keuangan PPM 2026", kind: "pdf", badge: "Pengumuman", urgent: false, href: "https://drive.google.com/file/d/1C-Lipq_y5fPIolFVFG8TVdD4RrEjV1TD/view?usp=drive_link" },
    { num: "142", title: "Submit Usulan Penelitian dan PkM Platfom BIMA", kind: "pdf", badge: "Pengumuman", urgent: false, href: "https://drive.google.com/file/d/1769QgQBP0q5jxiQe6N2SpRffJWbGopqt/view?usp=drive_link" },
    { num: "141", title: "Pengumuman penerimaan proposal penelitian dan pengabdian internal TA 2026", kind: "pdf", badge: "Pengumuman", urgent: false, href: "https://drive.google.com/file/d/1sdOk9v35vUCDgAKezP6X20ZGHBpTz0Nl/view?usp=drive_link" },
    { num: "406", title: "Pengumuman Pengumpulan LPj Penelitian Unggulan 2025", kind: "pdf", badge: "Tenggat waktu", urgent: true, href: "https://drive.google.com/file/d/1Yckj_hiHsYpkSa08S0jaa6tBlgGTCAT-/view?usp=drive_link" },
    { num: "397", title: "Pengumuman Perpanjangan Pengumpulan LPj & Laporan Hasil 2025", kind: "pdf", badge: "Tenggat waktu", urgent: true, href: "https://drive.google.com/file/d/1oGuSrBEqW99OpXnLydP3jM0ZAhkNJht6/view?usp=drive_link" },
    { num: "284", title: "Pengumuman Pengumpulan LPj Penelitian dan Pengabdian 2025", kind: "pdf", badge: "Tenggat waktu", urgent: true, href: "https://drive.google.com/file/d/1FZ4DSyttf-BaJl2_zmE9iiL7OhWt2YTB/view?usp=drive_link" },
    { num: "155", title: "Pengumuman perpanjangan Penerimaan Proposal Penelitian Unggulan 2025", kind: "pdf", badge: "Tenggat waktu", urgent: true, href: "https://drive.google.com/file/d/160SjyLW61LGtfNUhYZmHvvJT1c4ylh-9/view?usp=drive_link" },
    { num: "002", title: "Pengumuman penerimaan Proposal P3M 2025", kind: "pdf", badge: "Pengumuman", urgent: false, href: "https://drive.google.com/file/d/1fchgiyW3ndMUSpCT69fSwORVPvyyMxhQ/view?usp=drive_link" },
    { num: "001", title: "Pengumuman Edaran Luaran P3M 2025", kind: "pdf", badge: "Edaran", urgent: false, href: "https://drive.google.com/file/d/1fdqe2Fr4YQJsGRwFLoppCKsv-dwA8jP-/view?usp=drive_link" },
    { num: "020", title: "Monev Bantuan Program Inovasi Kreatif Untuk Mitra Vokasi", kind: "pdf", badge: "Monev", urgent: false, href: "https://drive.google.com/file/d/12q_QYJo_ZdNRAbf_521owk95z9jCvxEr/view?usp=drive_link" },
    { num: "021", title: "Pengumuman Pengumpulan LPj", kind: "pdf", badge: "Tenggat waktu", urgent: true, href: "https://drive.google.com/file/d/17gR5mjXICdzsF-EZnsgnIfqFx8jfPMVL/view?usp=drive_link" },
    { num: "028", title: "pengumuman data SCOPUS dan SINTA", kind: "pdf", badge: "Pengumuman", urgent: false, href: "https://drive.google.com/file/d/1RRzs6fdnzwrDSHdTBYtnfRFhjdQ4suk4/view?usp=drive_link" },
    { num: "", title: "Pengumuman lap. keuangan 2024", kind: "pdf", badge: "Pengumuman", urgent: false, tahun: "2024", href: "https://drive.google.com/file/d/1jpNcxnQNab2F5tpWcBhFiRynjg-eOoKC/view" },
    { num: "", title: "Pengumuman Seminar Hasil PPM 2024", kind: "pdf", badge: "Seminar Hasil", urgent: false, tahun: "2024", href: "https://drive.google.com/file/d/1VTQ5jg-51PioxoNzkLvA9cacL_ogBFOM/view" },
    { num: "", title: "Undangan Tim Reviewer Seminar Hasil PPM 2024", kind: "pdf", badge: "Undangan", urgent: false, tahun: "2024", href: "https://drive.google.com/file/d/19gPyq7Uxg01lzoPeYZXZGHx_LOHJPLQc/view" },
    { num: "", title: "Pengumuman Hasil Seleksi Proposal PPM 2024", kind: "pdf", badge: "Hasil Seleksi", urgent: false, tahun: "2024", href: "https://drive.google.com/file/d/1j_cHRwbsoLjoRkOP48aRGb9oqxXLx3u7/view" },
    { num: "", title: "Pengumuman Pembukaan Proposal PPM 2024", kind: "pdf", badge: "Pengumuman", urgent: false, tahun: "2024", href: "https://drive.google.com/file/d/1iMY-uGP-8bUJr8KOnIuSQmKmN6LXRxGx/view" },
    { num: "", title: "Pengumuman Pembukaan Proposal PPM 2024", kind: "pdf", badge: "Pengumuman", urgent: false, tahun: "2024", href: "https://drive.google.com/file/d/16ZYFJdP3Mr8NnhNGQONgo_d6mI-esNmE/view?usp=drive_link" },
    { num: "", title: "Bukti Bayar Pajak 2023", kind: "pdf", badge: "Tenggat waktu", urgent: true, tahun: "2023", href: "https://drive.google.com/file/d/1k2OAZx6cLR8XjfrjL-XnGJEctC-uVDOp/view?usp=drive_link" },
    { num: "", title: "Revisi Jadwal Seminar Hasil 2023", kind: "pdf", badge: "Seminar Hasil", urgent: false, tahun: "2023", href: "https://drive.google.com/file/d/1UsG5PmBK9uciekzzBFIfaCHzF46u-Drz/view?usp=drive_link" },
    { num: "", title: "Pengumuman Undangan Seminar Hasil 2023", kind: "pdf", badge: "Undangan", urgent: false, tahun: "2023", href: "https://drive.google.com/file/d/1rhx8CjZjIJH6q9Mk1hSL7n8OTkFKzvWe/view?usp=drive_link" },
    { num: "", title: "Pengumuman Laporan Progres/ Monev Penelitian & PkM 2023", kind: "docx", badge: "Monev", urgent: false, tahun: "2023", href: "https://docs.google.com/document/d/1ZuVWhe6LyTZvrIoAtz5j3KpqX1tlsyZN/edit?usp=drive_link&ouid=114725230090207021292&rtpof=true&sd=true" },
    { num: "", title: "Pengumuman Perpanjangan Waktu Unggah Proposal Penelitian dan PkM 2023", kind: "pdf", badge: "Tenggat waktu", urgent: true, tahun: "2023", href: "https://drive.google.com/file/d/11Vt8Eqbk2IAiQY384OWs4fgP9IebzY-t/view?usp=drive_link" },
    { num: "", title: "Pengumuman Penelitian Unggulan 2023", kind: "pdf", badge: "Pengumuman", urgent: false, tahun: "2023", href: "https://drive.google.com/file/d/1jE0WtPcDR6GJC2SRxUl8J-0lxyrnXAW4/view?usp=drive_link" },
    { num: "", title: "Pengumuman Hasil Seleksi Penelitian & PkM 2023", kind: "pdf", badge: "Hasil Seleksi", urgent: false, tahun: "2023", href: "https://drive.google.com/file/d/1WXDsaSziT21bAJxXDLdTD5EcUoFFowu_/view?usp=drive_link" },
];
