// =====================================================================
// ⚠️ DATA PRATINJAU (DUMMY). belum diisi data resmi Riset Grup P3M PNM.
// Halaman sumber (p3m.pens.ac.id/research-group) di-render pakai
// JavaScript sehingga tidak bisa di-scrape otomatis. Ganti array di
// bawah ini dengan data asli begitu klien mengirimkannya. field yang
// dibutuhkan per kelompok riset:
//   - nama        : nama riset grup
//   - ketua       : nama ketua kelompok
//   - fokus       : 1 baris ringkas bidang/topik riset
//   - deskripsi   : 1-2 kalimat tentang kelompok ini
//   - roadmapHref : link dokumen roadmap (Drive/PDF), boleh kosong
//   - anggota     : jumlah anggota (opsional, boleh dihapus kalau tak ada)
// =====================================================================

export type RisetGrup = {
    slug: string;
    nama: string;
    ketua: string;
    fokus: string;
    deskripsi: string;
    roadmapHref?: string;
    anggota?: number;
};

export const RISET_GRUP_DUMMY: RisetGrup[] = [
    {
        slug: "elektronika-terapan",
        nama: "Riset Grup Elektronika Terapan",
        ketua: "Ardila Prihadyatama, S.E., M.E.",
        fokus: "Sistem embedded & IoT untuk otomasi industri",
        deskripsi: "Deskripsi kelompok riset belum dikonfirmasi oleh P3M.",
        anggota: 6,
    },
];
