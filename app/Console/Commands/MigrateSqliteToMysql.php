<?php

namespace App\Console\Commands;

use App\Support\SqliteToMysql;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Throwable;

class MigrateSqliteToMysql extends Command
{
    protected $signature = 'p3m:to-mysql {source? : Berkas SQLite Laravel; default database/database.sqlite}
                            {--dry-run : Periksa skema dan jumlah data tanpa menulis}
                            {--verify-only : Bandingkan MySQL terisi dengan SQLite sumber tanpa mengubahnya}
                            {--yes : Setujui pemindahan setelah membaca sumber dan tujuan}';

    protected $description = 'Salin data Laravel SQLite ke MySQL kosong dengan backup, transaksi, dan verifikasi seluruh kolom';

    public function handle(SqliteToMysql $import): int
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->error('Perintah ini untuk persiapan lokal. Gunakan APP_ENV=local pada salinan proyek lokal.');

            return self::FAILURE;
        }
        if (config('database.default') !== 'mysql') {
            $this->error('Atur DB_CONNECTION=mysql di .env, lalu jalankan php artisan config:clear.');

            return self::FAILURE;
        }
        if ($this->option('dry-run') && $this->option('verify-only')) {
            $this->error('Pilih --dry-run atau --verify-only, jangan keduanya.');

            return self::FAILURE;
        }
        $mode = $this->option('dry-run') ? 'dry-run' : ($this->option('verify-only') ? 'verify' : 'import');
        $source = $this->argument('source') ?: database_path('database.sqlite');
        $this->line('Sumber SQLite: '.$source);
        $this->line('Tujuan MySQL: '.config('database.connections.mysql.host').':'.config('database.connections.mysql.port').'/'.config('database.connections.mysql.database'));
        if ($mode === 'import' && ! $this->option('yes') && ($this->input->isInteractive() === false || ! $this->confirm('Aplikasi sumber dan tujuan sudah dihentikan, tujuan kosong, dan data akan disalin?', false))) {
            $this->warn('Belum ada data yang dipindahkan. Gunakan --dry-run dahulu, lalu --yes saat siap.');

            return self::FAILURE;
        }
        try {
            $report = $import->run($source, 'mysql', $mode);
            $this->table(['Tabel', 'Baris', 'Hasil'], collect($report['tables'])->map(
                fn (array $row, string $name) => [$name, $row['count'], $row['verified'] ? 'Isi cocok' : 'Siap diperiksa saat impor']
            )->all());
            $this->line('Total: '.$report['total_rows'].' baris pada '.count($report['tables']).' tabel.');
            $this->line('Sesi/token sementara dan cache tidak diaktifkan kembali: '.json_encode($report['skipped']));
            if ($report['backup']) {
                $this->line('Backup lengkap: '.$report['backup']);
                $this->line('Laporan: '.($report['report_path'] ?? 'tidak tersimpan'));
            }
            if (isset($report['warning'])) {
                $this->warn($report['warning']);
            }
            $this->info(match ($mode) {
                'import' => 'Pemindahan berhasil. Seluruh isi tabel yang disalin cocok. SQLite asli tidak diubah. Login kembali memakai akun admin yang sama.',
                'verify' => 'Verifikasi berhasil. Isi MySQL cocok dengan sumber.',
                default => 'Pemeriksaan awal selesai. Belum ada data yang ditulis; kecocokan isi diuji saat impor.',
            });

            return self::SUCCESS;
        } catch (Throwable $error) {
            $message = $error instanceof QueryException
                ? 'Koneksi atau skema MySQL bermasalah. Periksa database, pengguna, port, dan jalankan migrate. Detail SQL tidak dicetak agar data akun tetap privat.'
                : $error->getMessage();
            $this->error($message);

            return self::FAILURE;
        }
    }
}
