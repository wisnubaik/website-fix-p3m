# Hasil pemindahan P3M ke MySQL

Tanggal pemeriksaan: 9 Oktober 2026.

Proyek sudah disiapkan untuk memakai MySQL di localhost. Data dari ZIP awal berhasil disalin ke MySQL pengujian: **2.639 baris pada 34 tabel**. Jumlah baris dan hash isi seluruh kolom setiap tabel cocok dengan sumber setelah penyesuaian representasi tipe data dan waktu. Database sumber tidak diubah.

Di laptopmu, database MySQL tetap perlu dibuat dan diisi mengikuti `PANDUAN-MYSQL.md`. Paket ZIP tidak memasang atau menjalankan layanan MySQL secara otomatis.

## Yang disertakan

- Proyek Laravel lengkap, dependensi PHP, build frontend dan SSR, serta PHP portabel Windows dari paket awal.
- Database sumber `database/database.sqlite` yang sama persis dengan berkas awal.
- Salinan MySQL `database/mysql/p3m-local.sql`, sudah diuji pemulihannya ke database kosong lain.
- Perintah `p3m:to-mysql` untuk backup, pemeriksaan awal, pemindahan, dan pencocokan hasil.
- Panduan pemasangan dan penggunaan phpMyAdmin.

Folder `node_modules` dipasang ulang dengan `npm ci`. Log, cache hasil pengujian, dan backup sementara dari pengujian tidak dimasukkan ke paket.

## Data dan berkas

Akun admin beserta hash password, konten, ID, status publikasi, dan data yang ditandai terhapus tetap dipertahankan. Sebanyak 61 sesi lama tidak diaktifkan kembali; pengguna perlu login ulang. Tabel token sementara dan cache juga dikosongkan. Riwayat migrasi dibuat oleh Laravel pada database tujuan, termasuk satu migrasi penyesuaian MySQL.

Sebanyak 64 aset publik, 3 berkas unggahan, dan 19 berkas arsip dibandingkan dengan ZIP awal. Semuanya identik. Build frontend diperbarui dan diperiksa terpisah.

| Tabel yang disalin | Jumlah baris |
| --- | ---: |
| `users` | 0 |
| `jobs` | 0 |
| `job_batches` | 0 |
| `failed_jobs` | 0 |
| `HeroContent` | 1 |
| `ContentListItem` | 66 |
| `RoadmapItem` | 5 |
| `FocusCluster` | 4 |
| `SiteSettings` | 1 |
| `QuickAccessLink` | 4 |
| `ActivityLog` | 24 |
| `HubCard` | 6 |
| `Admin` | 2 |
| `DocumentItem` | 174 |
| `ProfileTableContent` | 9 |
| `Announcement` | 25 |
| `TautanPengusulan` | 2 |
| `RisetGrup` | 1 |
| `TrendStat` | 24 |
| `StatEntry` | 20 |
| `Winner` | 15 |
| `ArchiveBlock` | 704 |
| `Staff` | 2 |
| `RisetEntry` | 1.133 |
| `MonevSlot` | 243 |
| `AcaraPeriode` | 2 |
| `KiKarya` | 126 |
| `AsesmenLapangan` | 1 |
| `PblProyek` | 40 |
| `Kegiatan` | 2 |
| `UploadAsset` | 3 |
| `Researcher` | 0 |
| `ResearcherAlias` | 0 |
| `ResearchContribution` | 0 |
| **Total** | **2.639** |

## Penyesuaian kode

1. Koneksi lokal diarahkan ke MySQL, memakai InnoDB dan karakter `utf8mb4`.
2. Kolom `sessions.user_id` menerima ID admin berupa teks. Kolom konten profil diperluas menjadi `LONGTEXT` agar konten panjang tidak terpotong.
3. Perintah pemindahan menolak database tujuan yang sudah terisi, membuat snapshot sumber, serta memakai transaksi dan verifikasi isi. Foreign key tetap aktif.
4. Seeder tidak membuat akun contoh. Akun website berasal dari data sumber.
5. Direktori halaman Inertia disesuaikan dengan nama sebenarnya, `resources/js/Pages`, agar konsisten pada sistem yang membedakan huruf besar dan kecil.
6. Pengujian MySQL memakai database terpisah berakhiran `_testing`, dengan pengaman agar tidak menyentuh database operasional.

## Pemeriksaan yang sudah dilakukan

| Pemeriksaan | Hasil |
| --- | --- |
| Integritas SQLite dan relasinya | Lulus; sumber sama persis dengan ZIP awal |
| Pemindahan data nyata ke MySQL 8.4.11 | 2.639 baris pada 34 tabel cocok |
| Pemulihan file SQL ke database kosong lain | Isi cocok dengan sumber |
| Alur pemasangan dengan akun aplikasi sendiri | Lulus; tidak memakai root untuk perintah Laravel |
| MySQL dengan `lower_case_table_names=1` | Pemindahan dan verifikasi lulus; pengaturan penamaan ini lazim pada Windows |
| Tes PHP pada MySQL | 47 tes lulus, 715 assertions |
| Pemeriksaan TypeScript dan build frontend/SSR | Lulus |
| Respons halaman publik | 25 halaman HTTP 200 dan judul halaman ter-render melalui SSR |
| Login CMS, sitemap, robots, dan health check | HTTP 200 |
| Akses aset hasil build dan font | 28 alamat aset diperiksa, berhasil |

Tes pemindahan juga mencakup penolakan database berisi data, rollback ketika ada benturan data, perubahan isi sesudah impor, teks panjang, emoji, nilai kosong, nilai null, angka tidak valid, serta sesi login dengan ID admin teks.

Pengujian dilakukan pada Linux dengan PHP 8.4.26, MySQL 8.4.11, dan Node.js 24.19.0. Pengaturan nama tabel yang lazim pada Windows diuji pada server MySQL tersebut; pemasangan Laragon langsung di laptop Windows belum dilakukan. Panduan menyediakan langkah pemeriksaan versi dan pesan error untuk tahap itu. Server kampus belum dikonfigurasi maupun digunakan.

## Sidik berkas cadangan

SHA-256 berguna untuk membandingkan berkas jika suatu saat dibutuhkan; tidak perlu diketik saat pemasangan.

Database sumber:

```text
d899454770208a13bb7da1c5b7cb4834d73570b3e4858391930ed0b1dabfeffb
```

SQL MySQL:

```text
431300638b94c3f57659662af0eeb346f4c4c6c15cd7eaec225f8546752dcd6e
```
