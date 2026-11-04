/** Isi bawaan halaman Informasi SINTA. */
export const SINTA_TAUTAN = [
    {
        label: "SINTA Score Politeknik Negeri Madiun",
        keterangan: "Peringkat dan capaian publikasi institusi",
        href: "https://sinta.kemdiktisaintek.go.id/affiliations?q=POLITEKNIK+NEGERI+MADIUN",
    },
    {
        label: "SINTA Score Author",
        keterangan: "Daftar dosen PNM beserta skor masing-masing",
        href: "https://sinta.kemdiktisaintek.go.id/affiliations/authors/571.",
    },
];

/** Video tutorial resmi pengelolaan akun SINTA. */
export const SINTA_TUTORIAL = [
    { label: "Login dan memperbarui data profil", href: "https://youtu.be/UhGOQuBiMKY" },
    { label: "Menambah atau memperbarui data buku", href: "https://youtu.be/LOMda6Ffn9Q" },
    { label: "Sinkronisasi data penelitian dan pengabdian", href: "https://youtu.be/FW7BjMayUv8" },
    { label: "Menambah atau memperbarui data IPR dan HKI", href: "https://youtu.be/S_CZRLjKsH8" },
    { label: "Menambah atau memperbarui produk dan prototipe", href: "https://youtu.be/pD_aPfR1pnU" },
];

/** Langkah memeriksa SINTA Score, disalin dari halaman situs lama. */
export const SINTA_CARA_CEK = [
    "Buka laman SINTA di sinta.kemdiktisaintek.go.id.",
    "Pilih menu Author, lalu ketik nama lengkap dosen yang ingin diperiksa.",
    "Tekan Enter, kemudian pilih nama author yang sesuai.",
    "Tunggu profil author terbuka. Angka capaian tampil di samping foto.",
    "SINTA Score Overall adalah skor keseluruhan, sedangkan SINTA Score 3Y dihitung untuk tiga tahun terakhir.",
];

export type AmbangSkor = { skema: string; lingkup: string; jabatan: string; saintek: string; soshum: string };

/**
 * Ambang SINTA Score Overall untuk pengajuan hibah DRTM. Angka ini
 * ketentuan program, bukan hasil hitungan, sehingga perlu diperbarui tiap
 * kali panduan hibah berubah.
 */
export const SINTA_AMBANG: AmbangSkor[] = [
    {
        "skema": "Penelitian Dasar",
        "lingkup": "Fundamental dan Kerja Sama",
        "jabatan": "-",
        "saintek": "150",
        "soshum": "50"
    },
    {
        "skema": "Penelitian Terapan",
        "lingkup": "Jalur Hilirisasi",
        "jabatan": "-",
        "saintek": "150",
        "soshum": "50"
    },
    {
        "skema": "Penelitian Terapan",
        "lingkup": "Jalur Kepakaran",
        "jabatan": "-",
        "saintek": "1.500",
        "soshum": "500"
    },
    {
        "skema": "Penelitian Pengembangan",
        "lingkup": "-",
        "jabatan": "-",
        "saintek": "150",
        "soshum": "50"
    },
    {
        "skema": "Pemberdayaan Berbasis Masyarakat",
        "lingkup": "Pemberdayaan Masyarakat Pemula",
        "jabatan": "Asisten Ahli",
        "saintek": "20",
        "soshum": "20"
    },
    {
        "skema": "Pemberdayaan Berbasis Masyarakat",
        "lingkup": "Pemberdayaan Kemitraan Masyarakat",
        "jabatan": "Asisten Ahli",
        "saintek": "50",
        "soshum": "25"
    },
    {
        "skema": "Pemberdayaan Berbasis Masyarakat",
        "lingkup": "Pemberdayaan Masyarakat oleh Mahasiswa",
        "jabatan": "Asisten Ahli",
        "saintek": "50",
        "soshum": "25"
    },
    {
        "skema": "Pemberdayaan Berbasis Kewirausahaan",
        "lingkup": "Pemberdayaan Kewirausahaan Pemula",
        "jabatan": "Lektor",
        "saintek": "50",
        "soshum": "25"
    },
    {
        "skema": "Pemberdayaan Berbasis Kewirausahaan",
        "lingkup": "Pemberdayaan Kemitraan Kewirausahaan",
        "jabatan": "Lektor",
        "saintek": "50",
        "soshum": "25"
    },
    {
        "skema": "Pemberdayaan Berbasis Kewirausahaan",
        "lingkup": "Pemberdayaan Kewirausahaan oleh Mahasiswa",
        "jabatan": "Lektor",
        "saintek": "50",
        "soshum": "25"
    },
    {
        "skema": "Pemberdayaan Berbasis Wilayah",
        "lingkup": "Pemberdayaan Wilayah",
        "jabatan": "Lektor",
        "saintek": "50",
        "soshum": "25"
    },
    {
        "skema": "Pemberdayaan Berbasis Wilayah",
        "lingkup": "Pemberdayaan Desa Binaan",
        "jabatan": "Lektor",
        "saintek": "50",
        "soshum": "25"
    }
];

/** Gambar panduan unggah data, disalin ke /public/sinta agar dapat dibuka umum. */
export const SINTA_GAMBAR = [
    { src: "/sinta/tutorial.png", judul: "Alur unggah data SINTA" },
    { src: "/sinta/keterangan.png", judul: "Keterangan pengisian templat" },
];

export const SINTA_PERHITUNGAN = [
    {
        "judul": "Tentang SINTA Score",
        "isi": "Skor merangkum kinerja publikasi dan sitasi peneliti. Overall mencakup keseluruhan rekam capaian; 3Y mencakup tiga tahun. Berikut ringkasan formula yang dijelaskan pada situs P3M lama, bukan kalkulator atau pengganti ketentuan SINTA terbaru."
    },
    {
        "judul": "Perhitungan versi 1",
        "isi": "A = artikel Scopus (bobot 40)\nB = dokumen non-artikel Scopus (15)\nC = sitasi Google Scholar (1)\nD = sitasi Scopus (4)\n\nSkor = (40A + 15B + C + 4D) / pembagi.\nPembagi merupakan normalisasi statistik berdasarkan skor personal tertinggi."
    },
    {
        "judul": "Perhitungan versi 2",
        "isi": "Artikel jurnal Scopus: Q1 40; Q2 40; Q3 35; Q4 30; tanpa kuartil 30.\nDokumen non-jurnal Scopus: 15.\nSitasi Scopus: 4; Google Scholar: 0,5.\nArtikel jurnal SINTA: S1 non-Scopus 25; S2 25; S3 20; S4 20; S5 15; S6 15.\n\nJumlahkan setiap komponen dikalikan bobotnya. Batas sitasi dan ketentuan penghitungan perlu mengikuti panduan resmi yang berlaku."
    },
    {
        "judul": "Contoh sederhana",
        "isi": "Satu artikel S3, satu artikel S4, dan enam sitasi Google Scholar: (1 × 20) + (1 × 20) + (6 × 0,5) = 43. Contoh ini hanya menjumlahkan komponen tersebut."
    }
];
