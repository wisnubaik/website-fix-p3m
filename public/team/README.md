# Foto default Tim P3M

Taruh foto asli anggota tim di folder ini dengan nama file PERSIS seperti ini
(sesuai yang dirujuk di `prisma/seed.ts`):

- `ardila-prihadyatama.jpg` — Kepala P3M
- `ridwan-muhammad.jpg` — Operator P3M

Format JPG/PNG/WebP, disarankan rasio 1:1 (persegi) karena ditampilkan
sebagai kotak 64x64px di halaman Hubungi Kami.

Kalau file belum ada, halaman otomatis fallback ke kotak berisi inisial
(AP / RM) — nggak akan nampilin ikon patah.

## Tetap bisa diedit lewat admin

Foto ini cuma DEFAULT. Kamu tetap bisa ganti kapan aja lewat panel admin
(`/admin/tim` → Edit → Upload) tanpa perlu utak-atik folder ini — upload
lewat admin akan menimpa/mengganti path fotonya di database.

## Kalau db-mu udah pernah di-seed sebelumnya

`prisma db seed` cuma nambah data baru (nggak menimpa data lama), jadi
kalau tabel Staff kamu udah keburu keisi (dari sesi testing sebelumnya),
menjalankan seed lagi bakal bikin data DUPLIKAT, bukan memperbaiki data
lama. Cara paling cepat: edit langsung 2 entri yang ada lewat
`/admin/tim` → Edit → upload foto (atau tempel `/team/ardila-prihadyatama.jpg`
manual di field foto), bukan re-seed.
