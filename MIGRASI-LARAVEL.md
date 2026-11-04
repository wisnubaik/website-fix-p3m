# Migrasi P3M ke Laravel + Inertia + React

Dimulai 6 Oktober 2026. Aplikasi mandiri berada di D:\Project\p3m-laravel. Next.js asli tetap berada di D:\Project\p3m-v85-tanpa-2fa.

## Keputusan

- Laravel menangani routes, validasi, otorisasi, sesi, dan database; React dirender melalui Inertia/Vite.
- Pembaruan 9 Oktober 2026: konfigurasi aplikasi diarahkan ke MySQL lokal. Data SQLite dipertahankan sebagai sumber/cadangan. Ikuti PANDUAN-MYSQL.md dan HASIL-PEMINDAHAN-MYSQL.md untuk hasil terbaru; deployment produksi belum dilakukan.
- Database sumber terpisah dari operasional Laravel. Import membaca sumber tanpa menulis dan menolak menimpa database tujuan yang sudah berisi data.
- Login email/password tanpa 2FA. Hash password dipertahankan; sesi Next.js tidak diimpor.
- Query publik menyaring status publikasi dan sampah. Upload serta arsip privat disimpan di luar direktori publik.

## Hasil tahap awal Laravel

1. Skema database dan import dengan verifikasi isi data.
2. Login/logout, pembatasan percobaan login, role, pemeriksaan sesi, dan kewajiban mengganti password sementara.
3. Seluruh 25 halaman publik dipindahkan menggunakan komponen, CSS, font lokal, serta aset visual asli.
4. Seluruh editor CMS dipindahkan, termasuk pengaturan, beranda, profil/tabel profil, dokumen, penelitian/PkM, akun, dan arsip.
5. Draft/publish, sampah/pulihkan, pengurutan atomik, audit, dan perlindungan superadmin terakhir.
6. Validasi isi upload/Office, kuota, akses berdasarkan referensi publikasi, serta arsip privat dan alias aset.
7. Metadata halaman, canonical URL, preview media sosial, sitemap, robots, dan SSR.
8. Seluruh 25 halaman publik diperiksa melalui browser: konten cocok dengan Next.js dan tidak ditemukan gambar rusak. Tampilan desktop serta beranda ponsel dibandingkan, termasuk posisi/ukuran judul. Navigasi ponsel diuji.
9. Login, dashboard, dan penyimpanan/pencarian draft diuji melalui browser pada salinan database terpisah.
10. PHPUnit: 39 pengujian / 683 assertion lulus; typecheck, build frontend/SSR, dan Pint lulus.

## Sebelum perpindahan produksi

- Tentukan hosting, domain melalui APP_URL, layanan SSR, dan prosedur backup/restore. Pemeriksaan kesehatan Laravel tersedia di /up.
- Lengkapi tautan dokumen yang memang kosong pada data sumber; dashboard menandainya.
- Lakukan uji penerimaan bersama klien. Pembandingan visual ini tidak mencakup seluruh kombinasi perangkat/browser.

Cara menjalankan aplikasi tersedia di README.md. Website lokal dapat dibuka di http://127.0.0.1:8000.

