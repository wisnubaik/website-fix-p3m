/**
 * Acuan warna sampul proposal dan laporan, disalin apa adanya dari halaman
 * Panduan situs lama.
 *
 * Aslinya satu paragraf teks mentah yang sulit dipindai. Di sini dipecah
 * jadi data terstruktur supaya bisa dirender sebagai kartu berwarna:
 * dosen yang akan menjilid cukup melihat sekilas tanpa membaca kalimat
 * per kalimat. `hex` diambil dari foto papan contoh warna milik percetakan, jadi
 * cukup dekat dengan aslinya - tapi yang mengikat tetap KODE warnanya,
 * karena itu yang disebut saat memesan.
 */
export type AcuanWarna = {
    skema: string;
    warna: string;
    kode: string;
    font: string;
    hex: string;
};

export const ACUAN_PROPOSAL: AcuanWarna[] = [
    { skema: "Penelitian", warna: "Oranye", kode: "Orange", font: "Hitam", hex: "#E58A1F" },
    { skema: "PkM", warna: "Hijau", kode: "HD", font: "Hitam", hex: "#3F8F4A" },
    { skema: "Penelitian Unggulan", warna: "Kuning Gelap", kode: "KK", font: "Hitam", hex: "#F0A32A" },
];

export const ACUAN_LAPORAN: AcuanWarna[] = [
    { skema: "Penelitian", warna: "Kuning Gading", kode: "KM", font: "Hitam", hex: "#F2DFA0" },
    { skema: "PkM", warna: "Biru Donker", kode: "007", font: "Emas", hex: "#1E3A8C" },
    { skema: "Penelitian Unggulan", warna: "Kuning", kode: "033", font: "Hitam", hex: "#EFC02B" },
    { skema: "DRPM Penelitian", warna: "Biru Telur Asin", kode: "HM", font: "-", hex: "#A2BFA6" },
    { skema: "DRPM PkM", warna: "Putih", kode: "-", font: "-", hex: "#FFFFFF" },
];

/** Keterangan asli dari situs lama, ditampilkan sebagai catatan kaki. */
export const ACUAN_CATATAN =
    "Kode acuan papan warna Foto Copy Prima, Jalan Serayu. Contoh warna di layar bisa sedikit berbeda dari cetakan; sebutkan kodenya saat memesan.";
