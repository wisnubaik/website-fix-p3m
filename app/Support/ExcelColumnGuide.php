<?php

namespace App\Support;

class ExcelColumnGuide
{
    public static function describe(string $resource, string $key, array $column, mixed $default = null): array
    {
        $type = $column['type'];
        $rule = $type;
        $help = match ($type) {
            'integer' => 'Bilangan bulat 0 sampai 2147483647. Tulis angka saja, tanpa Rp atau pemisah ribuan.',
            'number' => 'Angka antara -2147483647 dan 2147483647. Gunakan titik untuk desimal, tanpa pemisah ribuan.',
            'boolean' => 'Pilih Ya atau Tidak dari dropdown.',
            'date' => 'Tanggal lengkap dengan format YYYY-MM-DD. Gunakan tanggal yang benar, misalnya 2026-10-24.',
            'time' => 'Jam 24 jam, format HH:MM. Contoh 08:30, bukan 8.30.',
            'pairs' => 'Satu rincian per baris sel, format label: isi. Gunakan Alt+Enter untuk rincian berikutnya. Maksimal 30 rincian.',
            'lines' => 'Satu butir per baris di dalam sel. Tekan Alt+Enter untuk butir berikutnya.',
            default => 'Isi teks biasa, bukan rumus. Maksimal 20.000 karakter. Nomor atau kode dengan nol di depan tetap ditulis lengkap.',
        };
        $example = match ($type) {
            'integer' => in_array($key, ['funding', 'jumlahPendanaan'], true) ? '15000000' : '10',
            'number' => '12.5', 'boolean' => 'Tidak', 'date' => '2026-10-24', 'time' => '08:30',
            'pairs' => "Email: nama@kampus.ac.id\nBidang: Informatika", 'lines' => "Butir pertama\nButir kedua", default => 'Isi sesuai data Anda',
        };
        if ($resource !== 'rows' && in_array($key, ['year', 'tahun'], true)) {
            $rule = 'year';
            $help = 'Tahun 4 digit, antara 1900 dan 2099. Contoh 2026. Jangan menulis tanggal lengkap atau kata seperti test.';
            $example = '2026';
        } elseif (preg_match('/href|url|src/i', $key)) {
            $help = 'Isi alamat https:// atau alamat internal yang benar-benar tersedia. Unggah PDF/gambar melalui CMS terlebih dahulu, lalu salin alamatnya. Bukan lokasi berkas seperti C:\\Dokumen.';
            $example = 'https://example.org/dokumen.pdf';
        } elseif ($key === 'email') {
            $help = 'Alamat email lengkap dengan nama dan domain.';
            $example = 'nama@kampus.ac.id';
        } elseif ($key === 'published') {
            $help = 'Ya: tampil di situs setelah impor dikonfirmasi. Tidak atau kosong: draf, belum tampil di situs.';
            if ($resource === 'documents') {
                $help .= ' Dokumen yang tampil wajib memiliki tautan.';
            }
        } elseif ($type === 'boolean') {
            $help .= ' Ya mengaktifkan pilihan ini. Tidak menonaktifkannya.';
        }
        if ($column['options']) {
            $help .= ' Gunakan pilihan pada dropdown. Tulisan harus sesuai pilihan, termasuk huruf besar/kecil.';
            $example = $column['options'][0];
        } elseif ($type === 'text' && $rule === 'text') {
            $example = match ($key) {
                'title', 'judul' => 'Pengembangan sistem monitoring lingkungan',
                'leader', 'ketua', 'name', 'nama', 'member1', 'member2' => 'Nama dosen',
                'num' => '001/P3M/2026', 'initial' => 'AB', 'prodi' => 'Teknologi Informasi',
                'text', 'desc', 'deskripsi', 'ringkasan' => 'Keterangan sesuai kegiatan atau data yang dicatat.',
                default => $example,
            };
        }
        if ($column['required']) {
            $blank = 'Tidak boleh kosong pada baris yang diisi.';
        } elseif ($type === 'boolean') {
            $blank = $key === 'published' ? 'Draf, belum tampil di situs.' : ($column['nullable'] && $resource === 'rows' ? 'Tidak diisi.' : 'Tidak.');
        } elseif ($resource === 'rows') {
            $blank = $column['nullable'] ? 'Tidak diisi, bukan angka nol.' : (in_array($type, ['integer', 'number'], true) ? 'Menjadi 0.' : 'Dibiarkan kosong.');
        } else {
            $blank = $default === null || $default === '' ? 'Dibiarkan kosong.' : 'Menggunakan nilai bawaan: '.(is_bool($default) ? ($default ? 'Ya' : 'Tidak') : $default).'.';
        }

        return ['help' => $help, 'example' => $example, 'blank' => $blank, 'rule' => $rule];
    }

    /** Relative to the first input cell. These hints supplement server validation. */
    public static function formula(string $cell, array $column): string
    {
        $rule = $column['rule'] ?? $column['type'];
        $condition = match ($rule) {
            'year' => 'AND(LEN('.$cell.')=4,IFERROR(--'.$cell.',0)>=1900,IFERROR(--'.$cell.',0)<=2099,IFERROR(TEXT(--'.$cell.',"0000")='.$cell.'&"",FALSE))',
            'integer' => 'AND(IFERROR(--'.$cell.',-1)>=0,IFERROR(--'.$cell.',0)<=2147483647,IFERROR(MOD(--'.$cell.',1),1)=0,ISERROR(SEARCH(".",'.$cell.')),ISERROR(SEARCH(",",'.$cell.')),ISERROR(SEARCH("e",'.$cell.')))',
            'number' => 'AND(ISNUMBER(IFERROR(--'.$cell.',"")),IFERROR(ABS(--'.$cell.'),2147483648)<=2147483647,ISERROR(SEARCH(",",'.$cell.')),ISERROR(SEARCH("e",'.$cell.')))',
            'date' => 'OR(AND(ISNUMBER('.$cell.'),'.$cell.'>=1,'.$cell.'<100000),IFERROR(TEXT(DATE(LEFT('.$cell.',4),MID('.$cell.',6,2),RIGHT('.$cell.',2)),"yyyy-mm-dd")='.$cell.',FALSE))',
            'time' => 'OR(AND(ISNUMBER('.$cell.'),'.$cell.'>=0,'.$cell.'<1),IFERROR(AND(LEN('.$cell.')=5,TEXT(TIMEVALUE('.$cell.'),"hh:mm")='.$cell.'),FALSE))',
            default => 'LEN('.$cell.')<=20000',
        };

        return ($column['required'] ? 'AND(LEN(TRIM('.$cell.'&""))>0,' : 'OR('.$cell.'="",').$condition.')';
    }
}
