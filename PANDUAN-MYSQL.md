# Menjalankan P3M dengan MySQL di Windows

Panduan ini memakai Laragon untuk menjalankan MySQL dan membuka phpMyAdmin. Website tetap dijalankan dari folder proyek melalui terminal. Kita belum mengatur server kampus.

**MySQL** adalah tempat menyimpan data. **phpMyAdmin** adalah halaman untuk melihat, mengekspor, atau mengelola data MySQL melalui browser. Website tidak membutuhkan phpMyAdmin untuk bekerja, tetapi phpMyAdmin memudahkan pemeriksaan data.

## 1. Simpan proyek lama dan ekstrak versi ini

Simpan ZIP dan folder proyek lamamu. Ekstrak versi ini ke folder baru, misalnya:

```text
D:\Project\p3m-laravel-mysql
```

Di dalam folder tersebut harus terlihat `artisan`, `composer.json`, `package.json`, dan `.env`. Jika masih ada satu folder pembungkus, masuk ke folder yang berisi berkas-berkas tersebut.

Paket ini berisi kode lengkap, dependensi PHP `vendor`, PHP portabel Windows yang sudah ada di proyek, aset publik, unggahan, arsip, database sumber, dan salinan database MySQL. Folder `node_modules` dipasang ulang menggunakan `npm ci` agar sesuai dengan komputermu.

## 2. Siapkan dan periksa perangkat lunak

Gunakan:

| Perangkat | Yang dipakai untuk proyek ini |
| --- | --- |
| PHP | Minimal **8.4.1**; seri 8.4 dengan patch terbaru sesuai. Dependency yang terkunci membutuhkan versi ini. |
| MySQL | **8.4 LTS**, dengan InnoDB. Paket ini diuji pada MySQL 8.4.11. |
| Node.js | **24 LTS**, untuk pemasangan frontend, build, dan SSR. |
| npm | Tersedia bersama Node.js. |
| Composer | Berguna untuk pemeriksaan/pemasangan dependensi PHP; `vendor` sudah disertakan. |
| phpMyAdmin | Untuk melihat dan mencadangkan database melalui browser. |

Buka Laragon, lalu jalankan **Start All**. Pastikan MySQL dan web server untuk phpMyAdmin aktif. Bila Laragon menyediakan beberapa versi, pilih PHP dan MySQL yang sesuai melalui menunya.

Buka **Terminal dari Laragon**, lalu ketik `powershell` jika terminalnya belum PowerShell. Perintah di panduan ini menggunakan PowerShell Windows.

```powershell
cd "D:\Project\p3m-laravel-mysql"
php -v
node -v
npm -v
```

`php -v` harus menunjukkan minimal 8.4.1. Jika berbeda, pilih PHP yang sesuai di Laragon dan buka terminal baru. Proyek juga menyertakan PHP portabel di `.tools\php`; itu tidak menggantikan MySQL atau phpMyAdmin. Gunakan satu lingkungan PHP yang jelas agar tidak tercampur dengan instalasi lain.

Periksa ekstensi yang dipakai Laravel dan proses pemindahan:

```powershell
php -m
```

Pastikan tersedia `PDO`, `pdo_mysql`, `pdo_sqlite`, `sqlite3`, `mbstring`, `dom`, `xml`, `fileinfo`, `curl`, dan `zip`. Ekstensi SQLite hanya diperlukan untuk membaca sumber saat pemindahan/verifikasi. Aplikasi sesudahnya memakai MySQL.

## 3. Buka phpMyAdmin dan pastikan servernya MySQL

Jika phpMyAdmin belum tersedia, dokumentasi Laragon menyediakan menu **Tools > Quick add > phpmyadmin**. Nama menu dapat sedikit berbeda antarversi. Setelah dipasang, buka dari menu Laragon atau:

```text
http://localhost/phpmyadmin
```

Login memakai akun administrator database lokal yang dikonfigurasi di Laragon. Pada sebagian instalasi lokal, akun awalnya `root` tanpa password; jika kamu pernah mengatur password, gunakan password tersebut. Akun ini berbeda dari akun admin website P3M.

Pada tab **SQL** di phpMyAdmin, jalankan:

```sql
SELECT VERSION() AS versi_server, @@port AS port_mysql;
```

Pastikan hasilnya MySQL 8.4.x. Jika tertulis MariaDB, itu produk database yang berbeda; pilih layanan MySQL terlebih dahulu. Catat port-nya, biasanya `3306`.

## 4. Buat database kosong dan akun khusus aplikasi

Masih pada tab **SQL** di phpMyAdmin, gunakan perintah berikut. **Ganti `GANTI_DENGAN_PASSWORD_PILIHANMU` dengan password pilihanmu sebelum menjalankannya.** Simpan password tersebut karena akan dipakai di `.env`.

```sql
CREATE DATABASE p3m_local
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER 'p3m_app'@'127.0.0.1'
    IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_PILIHANMU';

GRANT ALL PRIVILEGES ON p3m_local.*
    TO 'p3m_app'@'127.0.0.1';
```

Jika nama database atau akun sudah digunakan, jangan menghapusnya. Gunakan nama baru, lalu sesuaikan nama tersebut pada perintah SQL dan `.env`. Aplikasi hanya diberi akses ke database miliknya.

Saat ini database `p3m_local` memang masih kosong. Tabel dan data akan diisi pada langkah 6.

## 5. Atur koneksi proyek

Buka `.env` menggunakan editor, lalu sesuaikan bagian berikut. Isi password yang sama dengan langkah 4; sesuaikan port jika hasil pemeriksaan berbeda.

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=p3m_local
DB_USERNAME=p3m_app
DB_PASSWORD="GANTI_DENGAN_PASSWORD_PILIHANMU"
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci
```

`APP_KEY` yang sudah ada di paket tetap dipertahankan. Tidak perlu membuat ulang kunci aplikasi maupun akun admin. Jika hanya memakai `.env.example` pada instalasi terpisah, salin menjadi `.env` dan jalankan `php artisan key:generate` satu kali saat `APP_KEY` masih kosong.

Di **terminal**, dari folder proyek, jalankan:

```powershell
php artisan config:clear
```

Jika `vendor` belum ada karena kamu hanya menyalin sebagian berkas, jalankan `composer install` terlebih dahulu. Gunakan `install` agar versi mengikuti `composer.lock`.

## 6. Pindahkan data dengan pemeriksaan otomatis

Hentikan website lama yang masih menulis ke database sumber. Jangan jalankan website versi baru selama pemindahan. MySQL dan phpMyAdmin boleh tetap berjalan.

Di **terminal**, jalankan perintah berikut satu per satu. Lanjutkan ke perintah berikutnya hanya jika langkah sebelumnya berhasil.

```powershell
php artisan migrate
```

Perintah ini membuat struktur tabel pada database MySQL yang dipilih di `.env`.

```powershell
php artisan p3m:to-mysql --dry-run
```

Ini memeriksa sumber, skema, dan jumlah data. Belum ada data yang ditulis ke MySQL. Jika ada pesan bahwa tujuan tidak kosong atau skemanya berbeda, berhenti dan periksa database yang dipilih.

```powershell
php artisan p3m:to-mysql --yes
```

Ini menjalankan pemindahan. Sumber defaultnya `database/database.sqlite` yang disertakan dalam paket. Perintah akan:

- Membaca sumber tanpa mengubahnya dan membuat snapshot backup lengkap.
- Menolak tabel tujuan yang sudah terisi.
- Menyalin data dalam satu transaksi MySQL dengan foreign key tetap aktif.
- Mencocokkan jumlah baris dan hash isi seluruh kolom setiap tabel sebelum menyelesaikan transaksi.
- Membatalkan seluruh penulisan dalam transaksi jika ada penolakan atau perbedaan data.

Pesan berhasil akan menyebut **2.639 baris pada 34 tabel** untuk data dari ZIP ini. Termasuk 1.133 entri penelitian/PKM, 174 dokumen, 704 blok arsip, 40 data PBL, dan dua akun admin.

Lalu, sebelum mengedit konten website, jalankan:

```powershell
php artisan p3m:to-mysql --verify-only
```

Semua tabel yang disalin harus menunjukkan **Isi cocok**. Pemeriksaan ini bersifat baca saja. Setelah kamu mengubah konten di MySQL, hasilnya wajar berbeda dari sumber lama; perintah ini bukan pemeriksaan kesehatan untuk pemakaian sehari-hari.

Sesi login, token sementara, dan cache lama tidak diaktifkan kembali. Data akun dan hash password dipertahankan, sehingga kamu cukup login ulang dengan akun yang sama. Backup lengkap dan laporan berada di:

```text
storage/app/private/mysql-migration/<waktu-proses>/source.sqlite
storage/app/private/mysql-migration/<waktu-proses>/report.json
```

Perintah impor hanya dijalankan sekali per database kosong. `migrate:fresh` dan `migrate:refresh` menghapus tabel; jangan gunakan keduanya pada database berisi data. Seeder tidak diperlukan untuk menampilkan konten P3M.

Jika yang ingin dipindahkan adalah database Laravel yang lebih baru dari isi ZIP, masukkan jalurnya secara eksplisit pada ketiga perintah. Contoh pemeriksaan awal:

```powershell
php artisan p3m:to-mysql "D:\Project\proyek-lama\database\database.sqlite" --dry-run
```

Gunakan jalur yang sama saat `--yes` dan `--verify-only`. Berkas sumber harus database Laravel P3M, bukan database Next.js lama.

## 7. Periksa data melalui phpMyAdmin

Refresh phpMyAdmin, pilih `p3m_local`, lalu buka tab **Browse/Jelajahi** pada tabel seperti `RisetEntry`, `DocumentItem`, `PblProyek`, atau `SiteSettings`.

Di tab **SQL** pada database tersebut, kamu dapat memeriksa:

```sql
SELECT COUNT(*) AS jumlah_riset FROM RisetEntry;
SELECT COUNT(*) AS jumlah_dokumen FROM DocumentItem;
SELECT COUNT(*) AS jumlah_pbl FROM PblProyek;
SELECT COUNT(*) AS jumlah_admin FROM Admin;
```

Hasil awal: **1133**, **174**, **40**, dan **2**. Pada Windows, phpMyAdmin mungkin menampilkan nama tabel dalam huruf kecil; itu mengikuti pengaturan MySQL di Windows.

Untuk pengubahan konten sehari-hari, gunakan CMS website agar validasi dan pencatatan aktivitas tetap berjalan. phpMyAdmin digunakan terutama untuk pemeriksaan dan backup.

## 8. Pasang frontend dan jalankan website

Di **terminal** dari folder proyek:

```powershell
npm ci
npm run build
```

Buka dua terminal pada folder proyek yang sama.

**Terminal pertama, untuk Laravel:**

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

**Terminal kedua, untuk SSR:**

```powershell
node bootstrap/ssr/app.js
```

Keduanya dibiarkan berjalan. Buka:

```text
Website:     http://127.0.0.1:8000
Login CMS:   http://127.0.0.1:8000/admin/login
phpMyAdmin:  http://localhost/phpmyadmin
```

Login CMS menggunakan akun website lama, bukan akun `root` atau `p3m_app` milik MySQL.

Saat mengembangkan frontend dengan pembaruan otomatis, gunakan `npm run dev` pada terminal kedua sebagai pengganti proses SSR hasil build. Plugin Inertia menangani SSR saat mode pengembangan. Terminal Laravel tetap berjalan.

## 9. Cara membuka dan menutup proyek berikutnya

Untuk membuka kembali: jalankan layanan Laragon, lalu jalankan terminal Laravel dan SSR seperti langkah 8. Tidak perlu mengulangi migrasi data, membuat database, atau memasang ulang paket setiap hari.

Setelah selesai: hentikan kedua terminal dengan **Ctrl+C**, lalu pilih **Stop All** di Laragon dan tunggu sampai layanan berhenti sebelum mematikan laptop. Backup tetap diperlukan; langkah penutupan yang rapi tidak menggantikan backup.

Untuk mencadangkan perubahan terbaru, pilih database di phpMyAdmin, buka **Export/Ekspor**, pilih format **SQL**, lalu simpan hasilnya. Cadangkan juga `storage/app/private/uploads`, `storage/app/private/archive`, dan aset publik milik proyek.

## 10. Cadangan MySQL yang disertakan

`database/mysql/p3m-local.sql` adalah salinan MySQL dari data dalam ZIP, sudah diuji dengan cara diimpor ke database kosong lain dan dibandingkan lagi dengan sumber. Ini cadangan awal, bukan salinan otomatis dari perubahan yang kamu buat nanti.

Jalur utama pemasangan tetap langkah 1–8. Jika memakai file SQL sebagai alternatif, pilih **database baru yang benar-benar kosong** di phpMyAdmin, buka **Import**, dan pilih file tersebut. File sudah mencakup tabel dan data, sehingga jangan menjalankan langkah 6 untuk mengisinya lagi. Sesudah impor, atur `.env` ke database yang dipakai, jalankan `php artisan config:clear`, `php artisan migrate`, lalu `php artisan p3m:to-mysql --verify-only` sebelum mengedit data. Berikan akun aplikasi akses ke database alternatif tersebut jika namanya berbeda.

SQL cadangan tidak memuat perintah menghapus tabel yang sudah ada. Meski begitu, gunakan database kosong agar tidak terjadi konflik. Simpan backup dan ZIP secara privat karena mengandung data dan hash password akun.

## Jika muncul masalah

| Pesan atau gejala | Yang diperiksa |
| --- | --- |
| `php` tidak dikenali | Buka terminal dari Laragon yang sudah memilih PHP, lalu cek `php -v`. |
| Composer meminta PHP `>= 8.4.1` | Versi PHP terminal belum sesuai dengan dependensi proyek. |
| `could not find driver` | Aktifkan `pdo_mysql`; proses impor juga perlu `sqlite3`. Periksa `php --ini` dan `php -m`. |
| `Connection refused` / kode 2002 | Pastikan MySQL aktif dan port `.env` sama dengan hasil `SELECT @@port`. |
| `Access denied` / kode 1045 | Cocokkan username, password, dan host akun MySQL. Jalankan `php artisan config:clear`. |
| `Unknown database` / kode 1049 | Buat database pada langkah 4, lalu cocokkan `DB_DATABASE`. |
| `Tujuan tidak kosong` | Jangan menghapus data untuk memaksa impor. Jika impor sebelumnya selesai, gunakan `--verify-only`; jika database lain terpilih, perbaiki `.env`. |
| `Isi tabel ... berbeda` | Sebelum pemakaian, periksa sumber dan laporan. Setelah konten diedit, perbedaan terhadap sumber lama memang mungkin terjadi. |
| `Vite manifest not found` | Jalankan `npm ci` lalu `npm run build` dari folder proyek. |
| Node melaporkan port SSR sudah dipakai | Hentikan proses SSR/dev lama sebelum memulai yang baru. |
| phpMyAdmin tidak terbuka | Pastikan phpMyAdmin sudah dipasang dan web server Laragon aktif. URL mengikuti konfigurasi Laragon. |

Simpan pesan error lengkap jika ada langkah yang gagal. Hindari mengulang impor atau menghapus database sebelum penyebabnya diketahui.

## Referensi

- [Laragon Operations](https://laragon.org/docs/operations)
- [Laragon Quick Add](https://laragon.org/docs/quick-add)
- [Laravel 13 Database](https://laravel.com/docs/13.x/database)
- [Laravel 13 Migrations](https://laravel.com/docs/13.x/migrations)
- [Inertia 3 SSR](https://inertiajs.com/docs/v3/advanced/server-side-rendering)

Versi perangkat lunak server kampus masih akan disesuaikan setelah ada informasi dari pengelolanya.
