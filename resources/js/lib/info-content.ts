import type { DocSection, FilterChip } from "./doc-types";

// =================== LAYANAN ===================

/**
 * Cadangan daftar dokumen Monev. dipakai hanya kalau tabel DocumentItem
 * section "monev" kosong. Sumber utamanya database (/admin/dokumen).
 *
 * Judul kelompok memakai heading asli situs lama. Yang TIDAK diterbitkan
 * beserta alasannya ada di CATATAN-MONEV.md.
 */
export const MONEV_SECTIONS: DocSection[] = [
    {
        title: "Indikator Penilaian",
        items: [
            { name: "Indikator Penilaian Monev PkM dan BIMA", kind: "pdf", href: "https://drive.google.com/file/d/1bneglk__WT1ushvyX7dgiN5I-iyt-52Y/view" },
        ],
    },
    {
        title: "Dokumen dan Data Pendukung Monev 2026",
        items: [
            { name: "Keputusan Direktur Penetapan Tim Reviewer Monev 2026", kind: "pdf", year: "2026", href: "https://drive.google.com/file/d/1uEY7aJ_UUu8iA8d75QPosnm_Ua0K_MAy/view?usp=drive_link" },
            { name: "Berita Acara Monev Penelitian 2026", kind: "link", year: "2026", href: "https://drive.google.com/drive/folders/1JdYMpycePxia7CwNvhXk_Ycj4KlaUdyS?usp=sharing" },
            { name: "Berita Acara Monev PkM 2026", kind: "link", year: "2026", href: "https://drive.google.com/drive/folders/1ypQpTpWfy5tii8O80j_Hmi7rrG1TtF8c?usp=sharing" },
            { name: "Data Tim Pelaksana Penelitian 2026", kind: "xlsx", year: "2026", href: "https://docs.google.com/spreadsheets/d/1BFbWB9kRJcycyMkJ99rxUdPcOZjaaHrx/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Data Tim Pelaksana PkM 2026", kind: "xlsx", year: "2026", href: "https://docs.google.com/spreadsheets/d/1ib1Uq1So-On3gVuBNUlFnTIc538A5gI2/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
        ],
    },
    {
        title: "Dokumen dan Data Pendukung Monev BIMA",
        items: [
            { name: "SK Direktur Tim Reviewer Monev PkM BIMA", kind: "pdf", year: "2026", href: "https://drive.google.com/file/d/18ckvLHPx-FVgUJ8xsL1RosdV2kk1YHJD/view?usp=sharing" },
            { name: "Dokumentasi Pelaksanaan Monev BIMA", kind: "link", href: "https://drive.google.com/drive/folders/1Z_pnHKgMAdIaV1nZIOg2OunM1DfS_QrC?usp=sharing" },
        ],
    },
    {
        title: "Berita Acara Monev BIMA",
        items: [
            { name: "Berita Acara Monev Penelitian Fundamental Reguler 2025", kind: "docx", year: "2025", href: "https://docs.google.com/document/d/1Sx9DGi9uGOUo3XdCwsdibYsfD_ltq91V/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Berita Acara Monev Pemberdayaan Kemitraan Masyarakat 2025", kind: "docx", year: "2025", href: "https://docs.google.com/document/d/1lYLlY4hBzylpLeZZPxUxTsLsqezPENmQ/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
        ],
    },
    {
        title: "Berita Acara Monev Penelitian",
        items: [
            { name: "Berita Acara Monev Penelitian 2023", kind: "pdf", year: "2023", href: "https://drive.google.com/file/d/1PK6jvYDk5VDWsZjBKcDWzobeHbz-nyaj/view?usp=drive_link" },
            { name: "Berita Acara Monev Penelitian 2022", kind: "pdf", year: "2022", href: "https://drive.google.com/file/d/13BJLF0PS2UCuLhe2-X3uaT2IEZ4GiXJE/view?usp=drive_link" },
            { name: "Berita Acara Monev Penelitian 2021", kind: "pdf", year: "2021", href: "https://drive.google.com/file/d/1b0A2qP3rXARZas0gMsUE9vFnhiBhmisl/view?usp=drive_link" },
            { name: "Berita Acara Monev Penelitian 2020", kind: "pdf", year: "2020", href: "https://drive.google.com/file/d/1xzPf-q70TVJm5JobhOU_fPUQpUBfcMZX/view?usp=sharing" },
        ],
    },
    {
        title: "Berita Acara Monev Penelitian Unggulan",
        items: [
            { name: "Berita Acara Monev Penelitian Unggulan 2023", kind: "pdf", year: "2023", href: "https://drive.google.com/file/d/1QbvPE9fgBkO66ngQakKmB6hcklOJUQgx/view?usp=drive_link" },
            { name: "Berita Acara Monev Penelitian Unggulan 2021", kind: "pdf", year: "2021", href: "https://drive.google.com/file/d/13PciJecjb2DKbC4DrxScHbJxCPSsboD3/view?usp=drive_link" },
        ],
    },
    {
        title: "Berita Acara Monev PkM",
        items: [
            { name: "Berita Acara Monev PkM 2025", kind: "docx", year: "2025", href: "https://docs.google.com/document/d/1pwrd_vUM3tHRUD4YkMCDubW0mQPmwu8U/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Berita Acara Monev PkM 2023", kind: "pdf", year: "2023", href: "https://drive.google.com/file/d/1qL_kFlkPpSevFfnS2v2-b7BDzhkUJtKj/view?usp=drive_link" },
            { name: "Berita Acara Monev PkM 2022", kind: "pdf", year: "2022", href: "https://drive.google.com/file/d/1Mli-8jo8cwLB6iv0yMv1Pm8hevmDwn4J/view?usp=sharing" },
            { name: "Berita Acara Monev PkM 2021", kind: "pdf", year: "2021", href: "https://drive.google.com/file/d/1IxBs3kWSsQ2G-fWp7iGW6cIgIjyNtYbf/view?usp=drive_link" },
            { name: "Berita Acara Monev PkM 2020", kind: "pdf", year: "2020", href: "https://drive.google.com/file/d/1jBOuvxLeXXuCMK_3XeolvYW7vUgbpXe4/view?usp=drive_link" },
        ],
    },
    {
        title: "Berita Acara Monev PkM Unggulan",
        items: [
            { name: "Berita Acara Monev PkM Unggulan 2021", kind: "pdf", year: "2021", href: "https://drive.google.com/file/d/1khq-fTME6ag9eAX7gD1T9zoN1tibWNMw/view?usp=drive_link" },
        ],
    },
    {
        title: "Surat Keputusan Direktur Penugasan Tim Reviewer Monev",
        items: [
            { name: "SK Penugasan Tim Reviewer Monev Penelitian 2023", kind: "pdf", year: "2023", href: "https://drive.google.com/file/d/1VZTI1b5xlplXgQ7xXPF7H7bpXVx_E5iy/view" },
            { name: "SK Penugasan Tim Reviewer Monev Penelitian Unggulan 2023", kind: "pdf", year: "2023", href: "https://drive.google.com/file/d/1h8NwR4QjeYAte28niTgOV0WjAjwRJqy1/view" },
            { name: "SK Penugasan Tim Reviewer Monev Pengabdian 2023", kind: "pdf", year: "2023", href: "https://drive.google.com/file/d/1yfHeHolxcyW7817hPA82dNbP35cvwFL2/view" },
            { name: "Berita Acara Monev Terhimpun 2023", kind: "link", year: "2023", href: "https://drive.google.com/drive/folders/1ycQqJ_jq2AmyMJzkdZHR56qZCFAHxPWB" },
            { name: "Berita Acara Monev Internal Terhimpun 2025", kind: "link", year: "2025", href: "https://drive.google.com/drive/folders/1lRL_oHYkOOt57F-F8bA714d9dSoQPOqy?usp=sharing" },
        ],
    },
    {
        title: "Rekap Penilaian dan Luaran Monev",
        items: [
            { name: "Rekapitulasi Luaran Penelitian", kind: "xlsx", href: "https://docs.google.com/spreadsheets/d/1ZzysoVTqE7MizY395pOYeT2PE4Fc2exZ0nUdM5YtKx0/edit?usp=sharing" },
            { name: "Rekapitulasi Luaran Pengabdian kepada Masyarakat", kind: "xlsx", href: "https://docs.google.com/spreadsheets/d/1o9Nuzw8DX8yyZxwRcqRzwwsorTM1aplYu5qpYZmSHrk/edit?usp=sharing" },
        ],
    },
    {
        title: "Dokumentasi Kegiatan Monev",
        items: [
            { name: "Dokumentasi Kegiatan Monev 2025", kind: "link", year: "2025", href: "https://drive.google.com/drive/folders/1SdsLVg6Kclkb6IkLNxAnUUORTawkFtvc" },
        ],
    },
    {
        title: "Dokumentasi Laporan Progres",
        items: [
            { name: "Dokumentasi Laporan Progres. Senin, 7 Agustus 2023", kind: "link", year: "2023", href: "https://drive.google.com/drive/folders/1yLx1y75hsrll2ZzkIeqY71Oq2Imrima5" },
            { name: "Dokumentasi Laporan Progres. Selasa, 8 Agustus 2023", kind: "link", year: "2023", href: "https://drive.google.com/drive/folders/1ljuGE9bNIOHmOohOoIFI4nor0-D3IGay" },
            { name: "Dokumentasi Laporan Progres. Rabu, 9 Agustus 2023", kind: "link", year: "2023", href: "https://drive.google.com/drive/folders/1hOYOpujg-zIMAKOHFbrt1BTEvgUtSAot" },
            { name: "Dokumentasi Laporan Progres. Kamis, 10 Agustus 2023", kind: "link", year: "2023", href: "https://drive.google.com/drive/folders/1GgpvrQW9NNOnzAmQoJiB3bl5xqwaF_Of" },
        ],
    },
    {
        title: "Evaluasi Program Dana Padanan (Matching Fund) Tahun 2024",
        items: [
            { name: "Data Penerimaan Pendanaan Riset. PPM Eksternal", kind: "pdf", year: "2024", href: "https://drive.google.com/file/d/1dPb4Ah-2-LTLnaxFn3jetba7KFyB_dBo/view?usp=drive_link" },
            { name: "Data Penerimaan Pendanaan Riset. PPM Internal", kind: "pdf", year: "2024", href: "https://drive.google.com/file/d/1TKm64K9Mal29JnpyxEs7e1mFqhu0LVQF/view?usp=drive_link" },
        ],
    },
];


export const SEMHAS_SECTIONS: DocSection[] = [
    {
        title: "Dokumen Inti",
        items: [
            { name: "SK Reviewer Seminar Hasil", kind: "pdf", href: "https://drive.google.com/file/d/1IoGfEVvbS_e3qgy8jg0KBaJqMI0SaahF/view?usp=drive_link" },
            { name: "Formulir Penilaian Seminar Hasil", kind: "docx", href: "https://forms.gle/V2ri3FZ8nvQvR6PB7" },
            { name: "Berita Acara Seminar Hasil", kind: "docx", href: "https://drive.google.com/file/d/1GlhiUNITSDr20hcuk2FiA55Es3dTi_Og/view?usp=drive_link" },
        ],
    },
    {
        title: "Seminar Hasil Tahun 2025",
        items: [
            { name: "Berita Acara Penelitian 2025", kind: "link", year: "2025", cat: "penelitian", href: "https://docs.google.com/document/d/1UjbND3mZz1i-Jmp9UKIvHH2jH57oE_V_/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Berita Acara PkM 2025", kind: "link", year: "2025", cat: "pkm", href: "https://docs.google.com/document/d/1eGE4Ev4KKf3TnLRRcTkY9BtI8bvMlA4y/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Jadwal Susunan Presentasi 2025", kind: "link", year: "2025", href: "https://docs.google.com/spreadsheets/d/1pQQLkZaDt0bDokU0Ju0JTHzY1vZfyYk6/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Undangan kepada Reviewer 2025", kind: "link", year: "2025", href: "https://drive.google.com/drive/folders/1_u92hRgqHT46uHEkydG1xMTzsIJHMH_o" },
        ],
    },
    {
        title: "Formulir Penilaian Penelitian per Jurusan",
        items: [
            { name: "Jurusan Administrasi Bisnis", kind: "link", year: "2025", cat: "penilaian", href: "https://forms.gle/eCpAMYJibajJF9v16" },
            { name: "Jurusan Akuntansi", kind: "link", year: "2025", cat: "penilaian", href: "https://forms.gle/YjWJQHHJfRanvXJ38" },
            { name: "Jurusan Teknik", kind: "link", year: "2025", cat: "penilaian", href: "https://forms.gle/7s86zJaeJ4UJ65zf6" },
        ],
    },
    {
        title: "Formulir Penilaian Pengabdian per Jurusan",
        items: [
            { name: "Jurusan Administrasi Bisnis", kind: "link", year: "2025", cat: "penilaian", href: "https://forms.gle/GJ23TcEFAiiZZyy18" },
            { name: "Jurusan Teknik", kind: "link", year: "2025", cat: "penilaian", href: "https://forms.gle/7s86zJaeJ4UJ65zf6" },
        ],
    },
    {
        title: "Berita Acara Seminar Hasil Penelitian",
        items: [
            { name: "Berita Acara Seminar Hasil Penelitian 2023", kind: "link", year: "2023", cat: "penelitian" },
            { name: "Berita Acara Seminar Hasil Penelitian 2024", kind: "link", year: "2024", cat: "penelitian", href: "https://drive.google.com/file/d/1aEhHEVfzbi9_POZxorIBhAx7FMQXyiNu/view?usp=drive_link" },
            { name: "Berita Acara Seminar Hasil Penelitian 2022", kind: "link", year: "2022", cat: "penelitian", href: "https://drive.google.com/file/d/1rlB-kBN99-B4YfESPWdFUpdZx2WxZPqn/view?usp=drive_link" },
            { name: "Berita Acara Seminar Hasil Penelitian 2021", kind: "link", year: "2021", cat: "penelitian", href: "https://drive.google.com/file/d/1Sd_8V_lAAjXA6KPHZpk4ZG4n-DbqV1ia/view?usp=drive_link" },
            { name: "Berita Acara Seminar Hasil Penelitian 2020", kind: "link", year: "2020", cat: "penelitian", href: "https://drive.google.com/file/d/1gPBI0Z9j7bwPgL2qeTE6IBl6G5oRnY36/view?usp=drive_link" },
        ],
    },
    {
        title: "Berita Acara Seminar Hasil PkM",
        items: [
            { name: "Berita Acara Seminar Hasil PkM 2023", kind: "link", year: "2023", cat: "pkm" },
            { name: "Berita Acara Seminar Hasil PkM 2024", kind: "link", year: "2024", cat: "pkm", href: "https://drive.google.com/file/d/1hZCTZuaY5G2JNFoOr_OuebCZLqAkOiA6/view?usp=drive_link" },
            { name: "Berita Acara Seminar Hasil PkM 2022", kind: "link", year: "2022", cat: "pkm", href: "https://drive.google.com/file/d/1eK-HaK3I_a3ZsSCmhpqq8Dim6qheEFY6/view?usp=drive_link" },
            { name: "Berita Acara Seminar Hasil PkM 2021", kind: "link", year: "2021", cat: "pkm", href: "https://drive.google.com/file/d/1NGmdn9xqGssiGZ-vvhF6Y1bpioFvsIYV/view?usp=drive_link" },
            { name: "Berita Acara Seminar Hasil PkM 2020", kind: "link", year: "2020", cat: "pkm", href: "https://drive.google.com/file/d/1pqzX1J74Y5uYriLEih1UMHvGoL6C9NMJ/view?usp=drive_link" },
        ],
    },
    {
        title: "Berita Acara Serah Terima",
        items: [
            { name: "Berita Acara Serah Terima Penelitian 2024", kind: "link", year: "2024", href: "https://docs.google.com/folderview?authuser=0&id=1DFF3LpobxLMXC1e-fGlYrza8Rh6do1hO" },
        ],
    },
    {
        title: "SK Seminar Hasil",
        items: [
            { name: "SK Seminar Hasil 2024", kind: "pdf", year: "2024", cat: "sk", href: "https://drive.google.com/drive/folders/1Vs-JMEr9VYwOdCB8VgNk6QrBJuHcDca6?usp=drive_link" },
            { name: "SK Seminar Hasil 2023", kind: "pdf", year: "2023", cat: "sk", href: "https://drive.google.com/drive/folders/10jbvQT-_8_rRChiOFzzdJGWrU2wsKru3?usp=sharing" },
            { name: "SK Seminar Hasil 2022", kind: "pdf", year: "2022", cat: "sk", href: "https://drive.google.com/drive/folders/1oZwwZqiAI5tNJYTit1Zc_9f0LzBf3BEJ?usp=drive_link" },
        ],
    },
    {
        title: "Dokumentasi Kegiatan",
        items: [
            { name: "Dokumentasi Seminar Hasil 2025", kind: "link", year: "2025", cat: "dokumentasi", href: "https://docs.google.com/folderview?authuser=0&id=1k7ECsC3f8TiuJBqaaadDJ4pqF8YW_EZY" },
            { name: "Dokumentasi Seminar Hasil 2024", kind: "link", year: "2024", cat: "dokumentasi", href: "https://docs.google.com/folderview?id=1p356CoZGy6Gvjvjk0DCeOImCqvA-sKif" },
            { name: "Dokumentasi Seminar Hasil 2023", kind: "link", year: "2023", cat: "dokumentasi", href: "https://drive.google.com/drive/folders/10jyCoe3-GH1fv1iycegOY0vfKmCqNF5w?usp=sharing" },
        ],
    },
];

export const KI_CHIPS: FilterChip[] = [
    { id: "all", label: "Semua" },
    { id: "paten", label: "Paten" },
    { id: "hakcipta", label: "Hak Cipta" },
];

export const KI_SECTIONS: DocSection[] = [
    {
        title: "Formulir Pengajuan Insentif",
        items: [
            {
                name: "Lembar Pengesahan Pengajuan Insentif Kekayaan Intelektual",
                kind: "docx",
                href: "https://drive.google.com/file/d/1Yr6vG4wMOMKQSKZRMxwbJqJfDnZfpdwB/view",
            },
        ],
    },
    {
        title: "Data Pendukung",
        items: [
            {
                name: "Jumlah Produk Jasa yang Diadopsi oleh Industri dan Masyarakat",
                kind: "xlsx",
                href: "https://drive.google.com/file/d/1lQlkJoe7swAd5u3v49IzMz06xvrdhUgz/view",
            },
        ],
    },
];

export const PANDUAN_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

export const PANDUAN_SECTIONS: DocSection[] = [
    {
        title: "Rencana Strategis",
        items: [
            { name: "Renstra Penelitian-P3M PNM 2025-2029", kind: "pdf", href: "https://drive.google.com/file/d/1zbi9U7kEy7MwONlK_371OSF5TzuXckl8/view" },
            { name: "Renstra Pengabdian kepada Masyarakat-P3M PNM 2025-2029", kind: "pdf", href: "https://drive.google.com/file/d/1Z5JuaZhQng4_3WEpHdOSAygeoNgsQPAJ/view" },
            { name: "Renstra Penelitian dan Pengabdian PNM 2015-2019", kind: "pdf", href: "https://drive.google.com/file/d/1aHnvPvYSi718smWumfwHcz5_djIv4RqE/view" },
        ],
    },
    {
        title: "Buku Panduan",
        items: [
            { name: "Buku Panduan Penelitian/ Unggulan, PkM Kompetitif Internal P3M 2023", kind: "link", href: "https://drive.google.com/file/d/1XDbkDEoOrnJdL1AE5nn5rJwxf6mAc3H-/view" },
            { name: "Buku Panduan PPM Kompetitif Internal P3M 2026", kind: "link", href: "https://drive.google.com/file/u/0/d/1_nBnXau4l3BXOgFoyiNDs5UwNXqCBND9/view" },
            { name: "Buku Panduan PPM Kompetitif Internal P3M 2024", kind: "link", href: "https://drive.google.com/file/d/1kMYcXjoaQuiopJEnYz6ppyDTocvJLFtp/view" },
        ],
    },
    {
        title: "Panduan Pelaporan dan Monev",
        items: [
            { name: "Pelaporan Keuangan 2022", kind: "pptx", href: "https://drive.google.com/file/d/1QhjQzFKWrwbkiepbXoNOVJ1yJWCg-O7S/view" },
            { name: "Panduan Pelaporan, Monitoring dan Evaluasi INOVOKASI", kind: "pdf", href: "https://drive.google.com/file/d/1HMUYKd5iphE9q2lnuZCBzIkQXmxy3zz2/view" },
        ],
    },
    {
        title: "Acuan Teknis",
        items: [
            { name: "Memahami Tingkat Kesiapterapan Teknologi", kind: "pdf", href: "https://drive.google.com/file/d/15VhdhR349O9v1n8z1f4X3mHAT3gCiy0L/view" },
        ],
    },
    {
        title: "Template dan Data Pendukung",
        items: [
            { name: "Template Laporan Kegiatan", kind: "link", href: "https://docs.google.com/document/d/1RS_BdctlBtEXAgjfvOiNckvYKU8y0NuU/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Data NIDN Dosen", kind: "link", href: "https://docs.google.com/spreadsheets/d/1qotnc4UTtXXxFr5FsczFqgnqhAiIZbyv/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
        ],
    },
];

export const ASESMEN_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

export const ASESMEN_SECTIONS: DocSection[] = [
    {
        title: "Laporan Penilaian Review Proposal",
        items: [
            { name: "Form Penelitian 2023", kind: "link", href: "https://drive.google.com/drive/folders/1rsqBUg4CSagsHdBuZLmmhg7WRSKRi6bc" },
            { name: "Form Penelitian 2024", kind: "link", href: "https://drive.google.com/drive/folders/15PH6VWavtlB3io6_Lqfu1PRg_sPziNNq" },
            { name: "Form Penelitian 2025", kind: "link", href: "https://drive.google.com/drive/folders/1lMuFlOAlkFyLkGPGWbdu81PXzE-OVduO?usp=sharing" },
            { name: "Form PkM 2023", kind: "link", href: "https://drive.google.com/drive/folders/1VqmhGQukD2h62yt-Muzi7WMAgzmrffGj" },
            { name: "Form PkM 2024", kind: "link", href: "https://drive.google.com/drive/folders/1700-68zUVbtg0iVAAYHttyUPS3-FDQNU" },
            { name: "Form PkM 2025", kind: "link", href: "https://drive.google.com/drive/folders/1avoz-0FzF_3p-8GITYBaaJ-PHAG4unQg?usp=sharing" },
        ],
    },
    {
        title: "Laporan Penggunaan Dana PPM",
        items: [
            { name: "Penelitian 2023", kind: "link", href: "https://drive.google.com/drive/folders/1euyVpFbI-arCpusAlSRQpKJulx7R0TSH" },
            { name: "Penelitian 2024", kind: "link", href: "https://drive.google.com/drive/folders/1TrqXLwe7FAmTzkvKNOkCsqbCXU1XFcHj" },
            { name: "PkM 2023", kind: "link", href: "https://drive.google.com/drive/folders/1JOA6Ul-mud0K3xkbSkKRUC-juG8omPkr" },
            { name: "PkM 2024", kind: "link", href: "https://drive.google.com/drive/folders/1fDlMDaHYZ8xyXW2aMY7McNXPbg_JLwd4" },
        ],
    },
    {
        title: "Laporan Seminar Hasil",
        items: [
            { name: "Laporan Semhas", kind: "link", href: "https://sites.google.com/pnm.ac.id/p3m/penelitian/internal?authuser=0" },
            { name: "Penelitian 2023, 2024", kind: "link", href: "https://sites.google.com/pnm.ac.id/p3m/penelitian/internal?authuser=0" },
            { name: "PkM 2023, 2024", kind: "link", href: "https://sites.google.com/pnm.ac.id/p3m/pkm/internal" },
        ],
    },
    {
        title: "Profil dan Rekap Data",
        items: [
            { name: "Selayang Pandang", kind: "pptx", href: "https://drive.google.com/file/d/1-wPp05yvSkzJEJfm-dgMyxpFdS5M5Hoq/view" },
        ],
    },
];

// =================== INFORMASI ===================

export const LUARAN_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

export const LUARAN_SECTIONS: DocSection[] = [
    {
        title: "Pendataan Luaran 2026",
        items: [
            { name: "Luaran Penelitian 2026", kind: "link", href: "https://forms.gle/Wn7bJFDNjazqTW7N9" },
            { name: "Luaran PkM 2026", kind: "link", href: "https://forms.gle/Wm5WvAXcocGXQMpq7" },
        ],
    },
    {
        title: "Pendataan Luaran 2025",
        items: [
            { name: "Luaran Penelitian 2025", kind: "link", href: "https://forms.gle/mYhM8mFAHqPrXNfL6" },
            { name: "Luaran PkM 2025", kind: "link", href: "https://forms.gle/GsFm1Goro1eQGZQV7" },
        ],
    },
    {
        title: "Pendataan Luaran 2024",
        items: [
            { name: "Luaran Penelitian 2024", kind: "link", href: "https://docs.google.com/forms/d/e/1FAIpQLSenWVmJVMpyb263HSor5-V2kY3hyMwfC88sl8A3Ad0l-kRlrA/viewform" },
            { name: "Luaran PkM 2024", kind: "link", href: "https://docs.google.com/forms/d/e/1FAIpQLSc8BWcgnbivQoMrB4u669lqLxZ_O_plj7YBZmJzv_PVa8rQww/viewform" },
        ],
    },
    {
        title: "Pendataan Luaran 2023",
        items: [
            { name: "Luaran Penelitian 2023", kind: "link", href: "https://docs.google.com/forms/d/e/1FAIpQLSeDcMmcPqbt2CU45YQU5NaDGbeCXaBeNpmVLwYJgiRGchxB-A/viewform" },
            { name: "Luaran PkM 2023", kind: "link", href: "https://docs.google.com/forms/d/e/1FAIpQLSdCB5LJJXF1XAlKyy43OsQVL2XajGIRZNbmHryBbaMJ3hkFHA/viewform" },
        ],
    },
];

export const LAPKEU_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

/**
 * Berkas panduan pelaporan keuangan yang DIPUBLIKASIKAN di
 * /informasi/laporan-keuangan.
 *
 * Isinya hanya format, template, dan petunjuk. Empat tautan lain di halaman
 * situs lama sengaja tidak diterbitkan:
 *   1. Folder unggahan LPj Penelitian dan LPj PkM 2026. Folder itu berisi
 *      laporan pertanggungjawaban keuangan milik tiap dosen; membukanya ke
 *      publik berarti memperlihatkan rincian belanja orang lain, sekaligus
 *      memberi siapa pun akses menaruh berkas ke folder P3M.
 *   2. Rekapitulasi Pajak PPM 2023 dan 2024, yang memuat data perpajakan
 *      per orang.
 *   3. Tagihan pajak dan kode billing, yang bersifat transaksi internal.
 *   4. Buku kas, yang butuh izin akses dan memang bukan dokumen publik.
 *
 * Tautan pengunggahan LPj tetap disampaikan lewat surat edaran kepada
 * pelaksana yang bersangkutan, bukan dipajang di halaman terbuka.
 */
export const LAPKEU_SECTIONS: DocSection[] = [
    {
        title: "Format dan Template",
        items: [
            { name: "Contoh Format Laporan Realisasi Belanja Penelitian", kind: "xlsx", href: "https://drive.google.com/file/d/1s0G9oW4n7LB4JtmJr7rN2hq_YNQ4vYDv/view" },
            { name: "Contoh Format Laporan Realisasi Belanja PkM", kind: "xlsx", href: "https://drive.google.com/file/d/1HMnDFOdwgO1-HQnL7_wdbVKGP5FraAiR/view" },
            { name: "SPTB PENELITIAN", kind: "docx", href: "https://drive.google.com/file/d/1J6pbVBWrAJTDyCqt9qoR6hGr8Eq80YsX/view" },
            { name: "SPTB PkM", kind: "docx", href: "https://drive.google.com/file/d/1diD2i4cnXtrVJ76X_M45y-k-TJ3DNAAS/view" },
        ],
    },
    {
        title: "Petunjuk Pelaporan",
        items: [
            { name: "Petunjuk Pelaporan Keuangan", kind: "pptx", href: "https://drive.google.com/file/d/1gAWKymVtPn3MLCEzQGZbBcY6LiSmM9Ox/view" },
            { name: "Petunjuk LPj Peneliti / PkM", kind: "pdf", href: "https://drive.google.com/file/d/1-oMiljgkvTbU2Az7V0OnUnojeDb4TDd-/view" },
        ],
    },
    {
        title: "Perpajakan",
        items: [
            { name: "Rumus Perhitungan Pajak 2026", kind: "pdf", href: "https://drive.google.com/file/d/1tzF4oDuLC1SryaWMKjO1RF_CK675GHtm/view" },
        ],
    },
];

export const MITRA_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

/**
 * Halaman Mitra Kerja Sama situs lama hanya memuat tiga hal: kuesioner
 * kepuasan mitra, dokumen kerja sama, dan format berita acara serah terima
 * alat. Daftar nama mitra yang sebelumnya tertulis di berkas ini adalah
 * data contoh, bukan data P3M, sehingga dihapus.
 *
 * Rekapitulasi jawaban kuesioner TIDAK diterbitkan: isinya alamat surel
 * responden beserta penilaian atas nama instansi masing-masing.
 */
export const MITRA_SECTIONS: DocSection[] = [
    {
        title: "Kuesioner Kepuasan Mitra",
        items: [
            {
                name: "Kuesioner Kepuasan Mitra Kerja Sama dengan Politeknik Negeri Madiun",
                kind: "link",
                href: "https://docs.google.com/forms/d/e/1FAIpQLScQBswuNFDFRvHnexsoRJNKXeQrvUqipsNoAqW9fq1rvEJUeg/viewform?usp=sharing",
            },
        ],
    },
    {
        title: "Dokumen Kerja Sama",
        items: [
            { name: "Dokumen Kerja Sama Mitra", kind: "link" },
            { name: "Format Berita Acara Serah Terima Alat", kind: "docx" },
        ],
    },
];

export const KEGIATAN_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

/**
 * Berkas pendukung kegiatan P3M. Dokumentasi foto kegiatan disimpan
 * terpisah di tabel Kegiatan, bukan di sini, karena foto perlu tampil
 * sebagai galeri dan bukan sebagai daftar unduhan.
 */
export const KEGIATAN_SECTIONS: DocSection[] = [
    {
        title: "Dokumentasi Sosialisasi Penelitian dan Pengabdian",
        items: [
            { name: "Dokumentasi Sosialisasi 2023", kind: "link", year: "2023", href: "https://drive.google.com/drive/folders/10dW3XAdV1tl0LvKnvCGM2DtV-fZY5MCu" },
            { name: "Dokumentasi Sosialisasi 2022", kind: "link", year: "2022", href: "https://drive.google.com/drive/folders/10WRz55XC_aBcNldAwdlCbqanYqwmVwch" },
        ],
    },
    {
        title: "Serah Terima Produk dan Jasa",
        items: [
            { name: "Berita Acara Serah Terima Hilirisasi Produk dan Jasa", kind: "link", href: "https://drive.google.com/drive/folders/1fH0F-f58Rr7J5jD4CR_fqysLdXgy5Vi5" },
            { name: "Dokumentasi Serah Terima Produk dan Jasa", kind: "link", href: "https://drive.google.com/drive/folders/15FL2Sdm3GzbTOAmUR4IzOzGhkFX_pHZ7" },
        ],
    },
    {
        title: "Workshop dan Laporan Kegiatan",
        items: [
            { name: "Foto Workshop Rencana Strategis", kind: "link", href: "https://drive.google.com/drive/folders/1UGVkC22MDpn05vpF0ApbsxPKSFro8cdm?usp=drive_link" },
            { name: "Foto Workshop Penulisan Jurnal", kind: "link", href: "https://drive.google.com/drive/folders/1Jf7XmnUsFREgaLaTHQwIgxaVQfBmzvlw?usp=drive_link" },
            { name: "Draft Laporan Hasil Kegiatan", kind: "docx", href: "https://docs.google.com/document/d/1oMkGutl8V2QovPkQz5SQpN16A2q74tNv/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
        ],
    },
];

export const SINTA_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

export const SINTA_SECTIONS: DocSection[] = [
    {
        title: "Templat Pendataan",
        items: [
            { name: "Templat Data SINTA Penelitian", kind: "xlsx", href: "https://docs.google.com/spreadsheets/d/1Lwy1NT6N2LFw6PkeFjIWXuzwIbYOu03X/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
            { name: "Templat Data SINTA Pengabdian kepada Masyarakat", kind: "xlsx", href: "https://docs.google.com/spreadsheets/d/1hyPb8EmGo11eawmtQIpc4SBK7FUt5bX9/edit?usp=drive_link&ouid=117918363110716554399&rtpof=true&sd=true" },
        ],
    },
];

export const TKT_CHIPS: FilterChip[] = [{ id: "all", label: "Semua" }];

export const TKT_SECTIONS: DocSection[] = [
    {
        title: "Buku Panduan",
        items: [
            { name: "Memahami Tingkat Kesiapterapan Teknologi", kind: "pdf", href: "https://drive.google.com/file/d/15VhdhR349O9v1n8z1f4X3mHAT3gCiy0L/view" },
        ],
    },
];