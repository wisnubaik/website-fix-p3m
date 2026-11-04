# P3M Laravel dengan MySQL

Versi ini menyiapkan proyek untuk MySQL lokal dan mempertahankan data serta berkas P3M. Mulai dari **[PANDUAN-MYSQL.md](PANDUAN-MYSQL.md)** untuk urutan lengkap Laragon, phpMyAdmin, akun MySQL, `.env`, pemindahan data, dan cara menjalankan website.

Kebutuhan: PHP **8.4.1 atau lebih baru yang kompatibel dengan lockfile** (disarankan seri 8.4), MySQL **8.4**, dan Node.js **24 LTS**. `vendor`, build frontend, serta PHP portabel Windows dari proyek asli disertakan. Jalankan `npm ci` untuk memasang `node_modules` sesuai platform.

Setelah membuat database kosong dan mengisi `.env`, jalankan satu per satu:

```shell
php artisan config:clear
php artisan migrate
php artisan p3m:to-mysql --dry-run
php artisan p3m:to-mysql --yes
php artisan p3m:to-mysql --verify-only
npm ci
npm run build
```

Di dua terminal terpisah:

```shell
php artisan serve --host=127.0.0.1 --port=8000
```

```shell
node bootstrap/ssr/app.js
```

Website: http://127.0.0.1:8000. CMS: http://127.0.0.1:8000/admin/login. Akun admin tetap memakai kredensial yang sama dengan sumber.

## Pemindahan data

- Sumber: `database/database.sqlite`, dipertahankan persis seperti berkas awal.
- Tujuan aplikasi: MySQL sesuai `.env`.
- Impor menolak tujuan terisi, membuat snapshot sumber, memakai transaksi InnoDB, dan membandingkan jumlah serta hash isi seluruh kolom.
- Akun, hash password, konten, ID, status publikasi, dan data sampah dipertahankan.
- Sesi/token sementara dan cache tidak diaktifkan kembali; login ulang setelah pemindahan.
- Cadangan MySQL awal: `database/mysql/p3m-local.sql`. Cara memakainya sebagai alternatif dijelaskan dalam panduan; tidak perlu mengimpor SQL ini jika sudah menjalankan perintah pemindahan.
- Upload dan arsip tetap di `storage/app/private`. Aset publik tetap di `public`.
- Laporan pengujian dan jumlah data: `HASIL-PEMINDAHAN-MYSQL.md`.

## Pengujian pengembang

Tes biasa menggunakan SQLite dalam memori, tanpa menyentuh database operasional:

```shell
php artisan test
npm run typecheck
```

Untuk menguji MySQL, sediakan database terpisah bernama `p3m_testing` dan akun yang memiliki akses ke database tersebut. Atur kredensial pengujian lewat lingkungan terminal atau `.env.testing`, lalu jalankan:

```shell
php artisan test --configuration=phpunit.mysql.xml
```

Pengujian MySQL membuat ulang tabel pada database pengujian. Pengaman menolak database non-SQLite yang namanya tidak berakhiran `_testing`. Jangan memberikan kredensial database produksi untuk pengujian.

Perintah `p3m:import-legacy` adalah importer Next.js lama; untuk versi Laravel ini gunakan `p3m:to-mysql`. Deployment kampus belum dilakukan.
