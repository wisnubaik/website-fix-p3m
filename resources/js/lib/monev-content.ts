/**
 * Jadwal Monev 2026, disalin dari lampiran PDF tiap jurusan. PDF aslinya tidak ditautkan ke publik karena memuat tautan Zoom, Meeting ID, passcode, dan tautan formulir penilaian reviewer.
 *
 * Tanggal disimpan dalam format ISO (YYYY-MM-DD) dan jam dalam HH:MM,
 * BUKAN teks bebas seperti "18 Agustus 2026" atau "8:00-8:20". Alasannya
 * dua: kolom seperti ini bisa diisi lewat date picker dan time picker di
 * panel admin sehingga tidak mungkin salah ketik, dan bisa diurutkan
 * dengan benar. Pengubahan ke tulisan Indonesia dilakukan saat ditampilkan
 * lewat formatTanggal() di lib/format-tanggal.ts.
 */

export type SlotJadwal = {
    tempat?: string | null;
    reviewer?: string | null;
    catatan?: string | null;
    /** ISO YYYY-MM-DD */
    tanggal: string;
    /** HH:MM */
    mulai: string;
    /** HH:MM */
    selesai: string;
    nama: string;
    prodi: string;
};

export type JadwalJurusan = { id: string; jurusan: string; penelitian: SlotJadwal[]; pkm: SlotJadwal[] };

/** Kode jurusan yang dipakai kolom `jurusan` pada MonevSlot. */
export const NAMA_JURUSAN: Record<string, string> = {
    adbis: "Administrasi Bisnis",
    akuntansi: "Akuntansi",
    teknik: "Teknik",
};

export const MONEV_JADWAL_2026: JadwalJurusan[] = [
    {
        id: "adbis",
        jurusan: "Administrasi Bisnis",
        penelitian: [
            { tanggal: "2026-08-18", mulai: "08:00", selesai: "08:20", nama: "Aminudin Azis, S.Ag., M.Si.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-18", mulai: "08:20", selesai: "08:40", nama: "Dr. Muhammad Taali, S.E., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-18", mulai: "08:40", selesai: "09:00", nama: "Eva Mirza Syafitri, S.Pd., M.Pd", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-18", mulai: "09:00", selesai: "09:20", nama: "Muhammad Supriyanto, S.E., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-18", mulai: "09:20", selesai: "09:40", nama: "Niza Nurmalasari, S.S., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-18", mulai: "09:40", selesai: "10:00", nama: "Prasetyo Yekti Utomo, S.E., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-18", mulai: "10:00", selesai: "10:20", nama: "Triana Prihatinta, S.Sos., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-18", mulai: "10:20", selesai: "10:40", nama: "Dimas Ari Setyawan, M.Kom.", prodi: "D4 Pemasaran Digital" },
            { tanggal: "2026-08-18", mulai: "10:40", selesai: "11:00", nama: "Ina Syarifah, S.Sos., M.AB.", prodi: "D4 Pemasaran Digital" },
            { tanggal: "2026-08-18", mulai: "11:00", selesai: "11:20", nama: "A'thi Fauzani Wisudawati, M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-18", mulai: "11:20", selesai: "11:40", nama: "Dr. Imam Mudofir, S.Pd., M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-18", mulai: "11:40", selesai: "12:00", nama: "Eda Maaliah, S.S., M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-18", mulai: "13:00", selesai: "13:20", nama: "Ita Permatasari, M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-18", mulai: "13:20", selesai: "13:40", nama: "Moh. Farid Maftuh, S.Pd., M.Pd", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-18", mulai: "13:40", selesai: "14:00", nama: "Muhyiddin Aziz, S.S., M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-18", mulai: "14:00", selesai: "14:20", nama: "Alief Sutantohadi, S.S., M.Hum.", prodi: "D4 Bahasa Inggris Kombispro" },
            { tanggal: "2026-08-18", mulai: "14:20", selesai: "14:40", nama: "Dian Palupi, M.Pd.", prodi: "D4 Bahasa Inggris Kombispro" },
            { tanggal: "2026-08-18", mulai: "14:40", selesai: "15:00", nama: "Jannatul Laily Noviabahari, M.Pd.", prodi: "D4 Bahasa Inggris Kombispro" },
            { tanggal: "2026-08-18", mulai: "15:00", selesai: "15:20", nama: "Netty Lisdiantini, S.Sos., M.AB", prodi: "D4 Bahasa Inggris Kombispro" },
            { tanggal: "2026-08-18", mulai: "15:20", selesai: "15:40", nama: "Fredy Susanto, S.Pd, M.Pd.", prodi: "D4 Pemasaran Digital" },
        ],
        pkm: [
            { tanggal: "2026-08-19", mulai: "08:00", selesai: "08:20", nama: "Aminudin Azis, S.Ag., M.Si.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-19", mulai: "08:20", selesai: "08:40", nama: "Bias Nur Elmira, S.Pi., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-19", mulai: "08:40", selesai: "09:00", nama: "Dinesh Basti Farani, S.Pd., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-19", mulai: "09:00", selesai: "09:20", nama: "Eva Mirza Syafitri, S.Pd., M.Pd", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-19", mulai: "09:20", selesai: "09:40", nama: "Srimiatun, S.E., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-19", mulai: "09:40", selesai: "10:00", nama: "Triana Prihatinta, S.Sos., M.M.", prodi: "D3 Administrasi Bisnis" },
            { tanggal: "2026-08-19", mulai: "10:00", selesai: "10:20", nama: "Dimas Ari Setyawan, M.Kom.", prodi: "D4 Pemasaran Digital" },
            { tanggal: "2026-08-19", mulai: "10:20", selesai: "10:40", nama: "Dr. Muhammad Taali, S.E., M.M.", prodi: "D4 Pemasaran Digital" },
            { tanggal: "2026-08-19", mulai: "10:40", selesai: "11:00", nama: "Fredy Susanto, S.Pd, M.Pd", prodi: "D4 Pemasaran Digital" },
            { tanggal: "2026-08-19", mulai: "11:00", selesai: "11:20", nama: "Galuh Kusuma Wardani, S. Stat.,M.Stat.", prodi: "D4 Pemasaran Digital" },
            { tanggal: "2026-08-19", mulai: "11:20", selesai: "11:40", nama: "Dr. Imam Mudofir, S.Pd., M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-19", mulai: "11:40", selesai: "12:00", nama: "Eda Maaliah, S.S., M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-19", mulai: "13:00", selesai: "13:20", nama: "Moh. Farid Maftuh, S.Pd., M.Pd", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-19", mulai: "13:20", selesai: "13:40", nama: "Rizka Maulina Wulandari, M.Pd.", prodi: "D3 Bahasa Inggris" },
            { tanggal: "2026-08-19", mulai: "13:40", selesai: "14:00", nama: "Alief Sutantohadi, S.S., M.Hum.", prodi: "D4 Bahasa Inggris Kombispro" },
            { tanggal: "2026-08-19", mulai: "14:00", selesai: "14:20", nama: "Dian Palupi, M.Pd.", prodi: "D4 Bahasa Inggris Kombispro" },
        ],
    },
    {
        id: "akuntansi",
        jurusan: "Akuntansi",
        penelitian: [
            { tanggal: "2026-08-18", mulai: "08:00", selesai: "08:20", nama: "Aan Nurrohman, S.Ak., M.Ak.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "08:20", selesai: "08:40", nama: "Amri Amrulloh, S.E., M.Ak.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "08:40", selesai: "09:00", nama: "Halleina Rejeki Putri Hartono, S.E., M.Acc., Ak.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "09:00", selesai: "09:20", nama: "Handika Asep Kurniawan, S.Pd., M.Pd.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "09:20", selesai: "09:40", nama: "Mukti Prasaja, S.E., M.Si.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "09:40", selesai: "10:00", nama: "Nova Maulud Widodo, S.E., M.Si.", prodi: "D4 Akuntansi Sektor Publik" },
            { tanggal: "2026-08-18", mulai: "10:00", selesai: "10:20", nama: "Vaisal Amir, S.E., M.S.A.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "10:20", selesai: "10:40", nama: "Hamim Tohari, S.T., M.Pd.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "10:40", selesai: "11:00", nama: "Hedi Pandowo, S.E., M.Kom.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "11:00", selesai: "11:20", nama: "RB. Iwan Noor Suhasto, S.E., M.M.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "11:20", selesai: "11:40", nama: "Rosida Ibrahim, M.Ak.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "11:40", selesai: "12:00", nama: "Sasmito Widi Nugroho, S.E., MSA.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "13:00", selesai: "13:20", nama: "Sugiharto, S.E., Ak., M.S.A.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "13:20", selesai: "13:40", nama: "Dr. Lely Kumalawati, S.E., MSA", prodi: "D4 Akuntansi Sektor Publik" },
            { tanggal: "2026-08-18", mulai: "13:40", selesai: "14:00", nama: "Permatasari Cahyaningdyah, S.E.,M.Sc.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "14:00", selesai: "14:20", nama: "Qimyatussa'adah, S.E., M.SA., Ph.D.", prodi: "D4 Akuntansi Perpajakan" },
        ],
        pkm: [
            { tanggal: "2026-08-18", mulai: "08:00", selesai: "08:20", nama: "Amri Amrulloh, S.E., M.Ak.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "08:20", selesai: "08:40", nama: "Asri Primasiwi, SE., M.Sc.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "08:40", selesai: "09:00", nama: "Handika Asep Kurniawan, S.Pd., M.Pd.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "09:00", selesai: "09:20", nama: "Mukti Prasaja, S.E., M.Si.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "09:20", selesai: "09:40", nama: "Ulfa Rahmawati, S.E., M.Sc.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "09:40", selesai: "10:00", nama: "Vaisal Amir, S.E., M.S.A.", prodi: "D3 Akuntansi" },
            { tanggal: "2026-08-18", mulai: "10:00", selesai: "10:20", nama: "Halleina Rejeki Putri Hartono, S.E., M.Acc., Ak.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "10:20", selesai: "10:40", nama: "Hedi Pandowo, S.E., M.Kom.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "10:40", selesai: "11:00", nama: "Koerniawan Dwi Wibawa, S.S.T., M.S.A.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "11:00", selesai: "11:20", nama: "Sasmito Widi Nugroho, S.E., MSA.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "11:20", selesai: "11:40", nama: "Sugiharto, S.E., Ak., M.S.A.", prodi: "D4 Akuntansi Perpajakan" },
            { tanggal: "2026-08-18", mulai: "11:40", selesai: "12:00", nama: "Nova Maulud Widodo, S.E., M.Si.", prodi: "D4 Akuntansi Sektor Publik" },
            { tanggal: "2026-08-18", mulai: "13:00", selesai: "13:20", nama: "Qimyatussa'adah, S.E., M.SA., Ph.D.", prodi: "D4 Akuntansi Perpajakan" },
        ],
    },
    {
        id: "teknik",
        jurusan: "Teknik",
        penelitian: [
            { tanggal: "2026-08-18", mulai: "08:00", selesai: "08:20", nama: "Alfi Tranggono Agus Salim, S.Si., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-18", mulai: "08:20", selesai: "08:40", nama: "Deby Ika Hariani, M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-18", mulai: "08:40", selesai: "09:00", nama: "Dr. Eng. Agus Susanto, S.Pd., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-18", mulai: "09:00", selesai: "09:20", nama: "Indarto Yuwono, S.T., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-18", mulai: "09:20", selesai: "09:40", nama: "R.Akbar Nur Apriyanto, S.Tr.T., M.Tr.T", prodi: "D4 Teknologi Rekayasa Otomasi" },
            { tanggal: "2026-08-18", mulai: "09:40", selesai: "10:00", nama: "Rahayu Mekar Bisono, S.ST., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-18", mulai: "10:00", selesai: "10:20", nama: "Wahyu Pribadi, M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-18", mulai: "10:20", selesai: "10:40", nama: "Mohammad Erik Echsony, S.ST., M.T.", prodi: "D4 Teknologi Rekayasa Otomasi" },
            { tanggal: "2026-08-18", mulai: "10:40", selesai: "11:00", nama: "R. Gaguk Pratama Yudha, S.ST, M.T.", prodi: "D4 Teknologi Rekayasa Otomasi" },
            { tanggal: "2026-08-18", mulai: "11:00", selesai: "11:20", nama: "Achmad Aminudin, S.Pd., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-18", mulai: "11:20", selesai: "11:40", nama: "Bi Asngali, S.ST., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-18", mulai: "11:40", selesai: "12:00", nama: "Farid Majedi, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-18", mulai: "13:00", selesai: "13:20", nama: "Imam Basuki, S.Pd., M.Si.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-18", mulai: "13:20", selesai: "13:40", nama: "M. Shafwallah Al. Aziz. R, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-18", mulai: "13:40", selesai: "14:00", nama: "Nanang Romandoni, S.Pd., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-18", mulai: "14:00", selesai: "14:20", nama: "Noorsakti Wahyudi, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-18", mulai: "14:20", selesai: "14:40", nama: "Yoga Ahdiat Fakhrudi, S.Pd., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-18", mulai: "14:40", selesai: "15:00", nama: "Aulia El Hakim, S.ST., M.T.", prodi: "D3 Teknik Komputer Kontrol" },
            { tanggal: "2026-08-18", mulai: "15:00", selesai: "15:20", nama: "Dr. Andhika Putra Widyadharma, SST., M.Pd", prodi: "D3 Teknik Komputer Kontrol" },
            { tanggal: "2026-08-18", mulai: "15:20", selesai: "15:40", nama: "Dyah Anggun Sartika, S.T., M.Eng.", prodi: "D3 Teknik Komputer Kontrol" },
            { tanggal: "2026-08-19", mulai: "08:00", selesai: "08:20", nama: "Imam Junaedi, S.T., M.T.", prodi: "D3 Teknik Komputer Kontrol" },
            { tanggal: "2026-08-19", mulai: "08:20", selesai: "08:40", nama: "Basuki Winarno, S.T., M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-19", mulai: "08:40", selesai: "09:00", nama: "Hanifah Nur Kumala Ningrum, S.T., M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-19", mulai: "09:00", selesai: "09:20", nama: "Ir. Budi Triyono, S.Pd., M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-19", mulai: "09:20", selesai: "09:40", nama: "Kumala Mahda Habsari, S.Pd., M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-19", mulai: "09:40", selesai: "10:00", nama: "Raden Jasa Kusumo Haryo, S.T., M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-19", mulai: "10:00", selesai: "10:20", nama: "Yuli Prasetyo, S.T, M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-19", mulai: "10:20", selesai: "10:40", nama: "Budi Artono, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Elektronika" },
            { tanggal: "2026-08-19", mulai: "10:40", selesai: "11:00", nama: "Dirvi Eko Juliando Sudirman, S.Pd., M.T.", prodi: "D4 Teknologi Rekayasa Elektronika" },
            { tanggal: "2026-08-19", mulai: "11:00", selesai: "11:20", nama: "Rakhmad Gusta Putra, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Elektronika" },
            { tanggal: "2026-08-19", mulai: "11:20", selesai: "11:40", nama: "Rendi Pambudi Wicaksono, M.Tr.T.", prodi: "D4 Teknologi Rekayasa Elektronika" },
            { tanggal: "2026-08-19", mulai: "11:40", selesai: "12:00", nama: "Sulfan Bagus Setyawan, S.ST., M.T.", prodi: "D4 Teknologi Rekayasa Elektronika" },
            { tanggal: "2026-08-19", mulai: "13:00", selesai: "13:20", nama: "Angger Binuko Paksi, M.Kom.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "13:20", selesai: "13:40", nama: "Hendrik Kusbandono, S.Kom., M.Kom", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "13:40", selesai: "14:00", nama: "Lutfiyah Dwi Setia, S.Kom., M.Kom.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "14:00", selesai: "14:20", nama: "MH. Ramdhani Ismar S.ST., M.T.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "14:20", selesai: "14:40", nama: "Mochamat Bayu Aji, M.Kom.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "14:40", selesai: "15:00", nama: "Muhammad Syaeful Fajar, S.Pd., M.Kom.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "15:00", selesai: "15:20", nama: "Rahmania Kumalasari, S.Kom.,M.Kom.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "15:20", selesai: "15:40", nama: "Tri Lestariningsih, S.Kom., M.Kom", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-19", mulai: "15:40", selesai: "16:00", nama: "Ikhwan Baidlowi Sumafta, S.Kom., M.Kom.", prodi: "D4 Teknologi Rekayasa Perangkat Lunak" },
            { tanggal: "2026-08-20", mulai: "08:00", selesai: "08:20", nama: "Nisa'ul Hafidhoh, M.T.", prodi: "D4 Teknologi Rekayasa Perangkat Lunak" },
            { tanggal: "2026-08-20", mulai: "08:20", selesai: "08:40", nama: "Sigit Kariagil Bimonugroho, S.Kom., M.T.", prodi: "D4 Teknologi Rekayasa Perangkat Lunak" },
            { tanggal: "2026-08-20", mulai: "08:40", selesai: "09:00", nama: "Susilo Veri Yulianto, S.Kom., M.T.", prodi: "D4 Teknologi Rekayasa Perangkat Lunak No Waktu Pemakalah Program Studi" },
        ],
        pkm: [
            { tanggal: "2026-08-20", mulai: "09:00", selesai: "09:20", nama: "Alfi Tranggono Agus Salim, S.Si., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-20", mulai: "09:20", selesai: "09:40", nama: "Bi Asngali, S.ST., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-20", mulai: "09:40", selesai: "10:00", nama: "Dr. Eng. Agus Susanto, S.Pd., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-20", mulai: "10:00", selesai: "10:20", nama: "R. Gaguk Pratama Yudha, S.ST, M.T.", prodi: "D4 Teknologi Rekayasa Otomasi" },
            { tanggal: "2026-08-20", mulai: "10:20", selesai: "10:40", nama: "Rahayu Mekar Bisono, S.ST., M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-20", mulai: "10:40", selesai: "11:00", nama: "Wahyu Pribadi, M.T.", prodi: "D4 Perkeretaapian" },
            { tanggal: "2026-08-20", mulai: "11:00", selesai: "11:20", nama: "Mohammad Erik Echsony, S.ST., M.T.", prodi: "D4 Teknologi Rekayasa Otomasi" },
            { tanggal: "2026-08-20", mulai: "11:20", selesai: "11:40", nama: "Deni Nur Fauzi, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-20", mulai: "11:40", selesai: "12:00", nama: "Farid Majedi, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-20", mulai: "13:00", selesai: "13:20", nama: "Kholis Nur Faizin, S.Pd., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-20", mulai: "13:20", selesai: "13:40", nama: "Noorsakti Wahyudi, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif No Waktu Pemakalah Program Studi" },
            { tanggal: "2026-08-20", mulai: "13:40", selesai: "14:00", nama: "Yoga Ahdiat Fakhrudi, S.Pd., M.T.", prodi: "D4 Teknologi Rekayasa Otomotif" },
            { tanggal: "2026-08-20", mulai: "14:00", selesai: "14:20", nama: "Aulia El Hakim, S.ST., M.T.", prodi: "D3 Teknik Komputer Kontrol" },
            { tanggal: "2026-08-20", mulai: "14:20", selesai: "14:40", nama: "Hanum Arrosida, S.ST., M.T.", prodi: "D3 Teknik Komputer Kontrol" },
            { tanggal: "2026-08-20", mulai: "14:40", selesai: "15:00", nama: "Ir. Budi Triyono, S.Pd., M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-20", mulai: "15:00", selesai: "15:20", nama: "R.Oktav Yama Hendra, S.S.T., M.Tr.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-20", mulai: "15:20", selesai: "15:40", nama: "Ryan Wicaksono, S.ST., M.T.", prodi: "D3 Teknik Listrik" },
            { tanggal: "2026-08-20", mulai: "15:40", selesai: "16:00", nama: "Budi Artono, S.T., M.T.", prodi: "D4 Teknologi Rekayasa Elektronika" },
            { tanggal: "2026-08-21", mulai: "08:00", selesai: "08:20", nama: "Rendi Pambudi Wicaksono, M.Tr.T.", prodi: "D4 Teknologi Rekayasa Elektronika" },
            { tanggal: "2026-08-21", mulai: "08:20", selesai: "08:40", nama: "Lutfiyah Dwi Setia, S.Kom., M.Kom.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-21", mulai: "08:40", selesai: "09:00", nama: "MH. Ramdhani Ismar, S.ST., M.T.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-21", mulai: "09:00", selesai: "09:20", nama: "Muhammad Syaeful Fajar, S.Pd., M.Kom.", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-21", mulai: "09:20", selesai: "09:40", nama: "Tri Lestariningsih, S.Kom., M.Kom", prodi: "D3 Teknologi Informasi" },
            { tanggal: "2026-08-21", mulai: "09:40", selesai: "10:00", nama: "Nisa'ul Hafidhoh, M.T.", prodi: "D4 Teknologi Rekayasa Perangkat Lunak" },
            { tanggal: "2026-08-21", mulai: "10:00", selesai: "10:20", nama: "MH. Ramdhani Ismar, S.ST., M.T.", prodi: "D3 Teknologi Informasi" },
        ],
    },
];

/** Label formal tiap jenis berkas. */
export const JENIS_BERKAS: Record<string, string> = {
    pdf: "Dokumen PDF",
    docx: "Dokumen Word",
    xlsx: "Lembar kerja Excel",
    pptx: "Presentasi",
    link: "Link",
};

/**
 * Bagian besar halaman /layanan/monev. Judulnya dipakai apa adanya sebagai
 * pilihan "Judul periode" di Admin -> Dokumen, sehingga penempatan sebuah
 * dokumen ditentukan lewat panel admin, bukan lewat daftar judul kelompok
 * yang dipatok di kode.
 *
 * `grup` hanya cadangan untuk dokumen lama yang kolom penempatannya masih
 * kosong, supaya tidak ada berkas yang hilang dari halaman.
 */
export const MONEV_BAGIAN: { id: string; judul: string; grup: string[] }[] = [
    {
        id: "indikator-penilaian",
        judul: "Indikator Penilaian",
        grup: ["Indikator Penilaian"],
    },
    {
        id: "monev-2026",
        judul: "Monev 2026",
        grup: ["Dokumen dan Data Pendukung Monev 2026"],
    },
    {
        id: "monitoring-dan-evaluasi",
        judul: "Monitoring dan Evaluasi",
        grup: [
            "Dokumen dan Data Pendukung Monev BIMA",
            "Berita Acara Monev BIMA",
            "Berita Acara Monev Penelitian",
            "Berita Acara Monev Penelitian Unggulan",
            "Berita Acara Monev PkM",
            "Berita Acara Monev PkM Unggulan",
            "Surat Keputusan Direktur Penugasan Tim Reviewer Monev",
            "Rekap Penilaian dan Luaran Monev",
            "Dokumentasi Kegiatan Monev",
            "Dokumentasi Laporan Progres",
            "Evaluasi Program Dana Padanan (Matching Fund) Tahun 2024",
        ],
    },
];

/**
 * Bagian halaman /layanan/semhas. Urutannya penting: bagian pertama
 * dirender SETELAH tabel jadwal (berkas pendukung pelaksanaan), bagian
 * kedua jadi seksi tersendiri di bawahnya (arsip dokumen).
 */
export const SEMHAS_BAGIAN: { id: string; judul: string }[] = [
    { id: "jadwal-tim-reviewer", judul: "Jadwal Tim Reviewer Seminar Hasil Penelitian Kompetitif Internal" },
    { id: "dokumen-seminar-hasil", judul: "Dokumen Seminar Hasil" },
];
