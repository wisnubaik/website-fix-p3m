<?php

namespace App\Console\Commands;

use App\Support\LegacyImport;
use Illuminate\Console\Command;
use Throwable;

class ImportLegacy extends Command
{
    protected $signature = 'p3m:import-legacy {source : Database SQLite v85 tanpa 2FA}';

    protected $description = 'Import data P3M ke database kosong, memverifikasi seluruh kolom, tanpa mengubah sumber';

    public function handle(LegacyImport $import): int
    {
        try {
            $report = $import->run($this->argument('source'));
            $this->table(['Tabel', 'Jumlah', 'Verifikasi isi'], collect($report)->map(
                fn (array $result, string $name) => [$name, $result['count'], 'OK']
            )->all());
            $this->info('Import selesai. Sesi Next.js dan pembatas login lama tidak diaktifkan. Salin berkas sumber storage/uploads dan storage/archive ke storage/app/private/uploads dan storage/app/private/archive secara terpisah.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
