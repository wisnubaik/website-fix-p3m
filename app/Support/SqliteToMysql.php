<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use SQLite3;

class SqliteToMysql
{
    /** Temporary authentication and cache state must not reactivate on the new database. */
    public const SKIPPED = ['sessions', 'admin_login_sessions', 'password_reset_tokens', 'cache', 'cache_locks', 'AdminSession', 'RateLimit'];

    public function run(string $filename, string $connection = 'mysql', string $mode = 'import'): array
    {
        if (! in_array($mode, ['import', 'dry-run', 'verify'], true)) {
            throw new RuntimeException('Mode pemindahan tidak dikenal.');
        }
        $path = realpath($filename);
        if ($path === false || ! is_file($path)) {
            throw new RuntimeException('Berkas SQLite sumber tidak ditemukan.');
        }
        $target = DB::connection($connection);
        if ($target->getDriverName() !== 'mysql' || str_contains(strtolower($target->getServerVersion()), 'mariadb')) {
            throw new RuntimeException('Tujuan harus MySQL. Periksa DB_CONNECTION dan versi server.');
        }
        if (! $target->getConfig('strict')) {
            throw new RuntimeException('MySQL strict mode wajib aktif agar data tidak terpotong diam-diam.');
        }
        $lock = 'p3m-import-'.substr(hash('sha256', $target->getDatabaseName()), 0, 40);
        if ((int) $target->selectOne('SELECT GET_LOCK(?, 0) AS acquired', [$lock])->acquired !== 1) {
            throw new RuntimeException('Ada proses pemindahan lain pada database tujuan.');
        }
        $source = null;
        try {
            $source = new SQLite3($path, SQLITE3_OPEN_READONLY);
            $source->enableExceptions(true);
            $source->busyTimeout(5000);
            $source->exec('BEGIN');
            if ($source->querySingle('PRAGMA integrity_check') !== 'ok' || $source->query('PRAGMA foreign_key_check')->fetchArray(SQLITE3_ASSOC)) {
                throw new RuntimeException('Pemeriksaan integritas atau relasi SQLite gagal. Sumber tidak diubah.');
            }
            $schema = $this->schema($source, $target);
            $report = [
                'mode' => $mode, 'source' => $path, 'target_database' => $target->getDatabaseName(),
                'mysql_version' => $target->getServerVersion(), 'created_at' => now()->toIso8601String(),
                'backup' => null, 'tables' => [], 'skipped' => [],
            ];
            foreach ($schema as $name => $columns) {
                if ($mode !== 'verify' && $target->table($name)->exists()) {
                    throw new RuntimeException('Tujuan tidak kosong pada tabel '.$name.'. Gunakan database MySQL baru; data lama tidak ditimpa.');
                }
                if (in_array($name, self::SKIPPED, true)) {
                    $report['skipped'][$name] = (int) $source->querySingle('SELECT COUNT(*) FROM '.$this->quote($name));
                }
            }
            if ($mode === 'import') {
                $directory = storage_path('app/private/mysql-migration/'.now()->format('Ymd-His').'-'.bin2hex(random_bytes(4)));
                if (! mkdir($directory, 0700, true) && ! is_dir($directory)) {
                    throw new RuntimeException('Tidak dapat membuat direktori backup.');
                }
                $report['backup'] = $directory.'/source.sqlite';
                $backup = new SQLite3($report['backup']);
                $backup->enableExceptions(true);
                try {
                    if (! $source->backup($backup) || $backup->querySingle('PRAGMA integrity_check') !== 'ok') {
                        throw new RuntimeException('Pembuatan snapshot backup gagal. MySQL belum diisi.');
                    }
                } finally {
                    $backup->close();
                }
                $report['backup_sha256'] = hash_file('sha256', $report['backup']);
            }
            $target->transaction(function () use ($source, $target, $schema, $mode, &$report) {
                foreach ($schema as $name => $columns) {
                    if (in_array($name, self::SKIPPED, true)) {
                        continue;
                    }
                    $expected = [];
                    $batch = [];
                    $rows = $source->query('SELECT * FROM '.$this->quote($name));
                    while ($row = $rows->fetchArray(SQLITE3_ASSOC)) {
                        $normalized = $this->normalize($row, $columns);
                        $expected[] = $this->rowHash($normalized);
                        if ($mode === 'import') {
                            $batch[] = $normalized;
                            if (count($batch) === 30) {
                                $this->insert($target, $name, $batch);
                                $batch = [];
                            }
                        }
                    }
                    if ($batch !== []) {
                        $this->insert($target, $name, $batch);
                    }
                    $sourceHash = $this->tableHash($expected);
                    $actual = [];
                    if ($mode !== 'dry-run') {
                        foreach ($target->table($name)->cursor() as $row) {
                            $actual[] = $this->rowHash($this->normalize((array) $row, $columns));
                        }
                        if (count($actual) !== count($expected) || ! hash_equals($sourceHash, $this->tableHash($actual))) {
                            throw new RuntimeException('Isi tabel '.$name.' berbeda dari sumber. Transaksi pemindahan dibatalkan.');
                        }
                    }
                    $report['tables'][$name] = ['count' => count($expected), 'sha256' => $sourceHash, 'verified' => $mode !== 'dry-run'];
                }
            });
            $report['total_rows'] = array_sum(array_column($report['tables'], 'count'));
            $report['report_path'] = null;
            if ($mode === 'import') {
                $report['report_path'] = dirname($report['backup']).'/report.json';
                $json = json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
                if (file_put_contents($report['report_path'], $json) === false) {
                    $report['report_path'] = null;
                    $report['warning'] = 'Data sudah terverifikasi dan tersimpan, tetapi laporan tidak dapat ditulis. Simpan keluaran terminal; jangan mengulang impor.';
                }
            }

            return $report;
        } finally {
            if ($source !== null) {
                $source->exec('ROLLBACK');
                $source->close();
            }
            $target->selectOne('SELECT RELEASE_LOCK(?) AS released', [$lock]);
        }
    }

    private function schema(SQLite3 $source, Connection $target): array
    {
        $schema = [];
        $tables = $source->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
        while ($row = $tables->fetchArray(SQLITE3_ASSOC)) {
            $name = $row['name'];
            if ($name === 'migrations') {
                continue;
            }
            if (! preg_match('/^[A-Za-z][A-Za-z0-9_]*$/D', $name)) {
                throw new RuntimeException('Nama tabel sumber tidak didukung.');
            }
            $columns = [];
            $fields = $source->query('PRAGMA table_info('.$this->quote($name).')');
            while ($field = $fields->fetchArray(SQLITE3_ASSOC)) {
                $columns[$field['name']] = strtolower($field['type']);
            }
            $schema[$name] = $columns;
        }
        if (! isset($schema['Admin'], $schema['RisetEntry'], $schema['ProfileTableContent']) || ! $source->querySingle("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='migrations'")) {
            throw new RuntimeException('Sumber harus database Laravel P3M, bukan database proyek Next.js lama.');
        }
        $builder = $target->getSchemaBuilder();
        $targetTables = $builder->getTableListing($target->getDatabaseName(), schemaQualified: false);
        $expected = array_map('strtolower', [...array_keys($schema), 'migrations']);
        $actual = array_map('strtolower', $targetTables);
        sort($expected);
        sort($actual);
        if ($expected !== $actual) {
            throw new RuntimeException('Daftar tabel berbeda. Jalankan php artisan migrate pada database tujuan kosong, lalu periksa sumber.');
        }
        $migrations = $source->query('SELECT migration FROM migrations');
        while ($row = $migrations->fetchArray(SQLITE3_ASSOC)) {
            if (! $target->table('migrations')->where('migration', $row['migration'])->exists()) {
                throw new RuntimeException('Riwayat migrasi tujuan belum cocok dengan sumber.');
            }
        }
        foreach ($schema as $name => $columns) {
            $actualColumns = $builder->getColumnListing($name);
            $expectedColumns = array_keys($columns);
            sort($actualColumns);
            sort($expectedColumns);
            if ($actualColumns !== $expectedColumns) {
                throw new RuntimeException('Kolom tabel '.$name.' berbeda. Pemindahan dibatalkan.');
            }
        }
        $engines = $target->select('SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [$target->getDatabaseName()]);
        foreach ($engines as $table) {
            if (strtoupper((string) $table->engine) !== 'INNODB') {
                throw new RuntimeException('Semua tabel tujuan wajib InnoDB agar rollback dapat dilakukan.');
            }
        }
        $pending = $schema;
        $ordered = [];
        while ($pending !== []) {
            $before = count($pending);
            foreach ($pending as $name => $columns) {
                $parents = array_map(fn (array $key) => strtolower($key['foreign_table']), $builder->getForeignKeys($name));
                if (array_intersect($parents, array_map('strtolower', array_keys($pending))) === []) {
                    $ordered[$name] = $columns;
                    unset($pending[$name]);
                }
            }
            if (count($pending) === $before) {
                throw new RuntimeException('Relasi tabel melingkar; perlu penanganan khusus sebelum impor.');
            }
        }

        return $ordered;
    }

    private function normalize(array $row, array $columns): array
    {
        $result = [];
        foreach ($columns as $name => $type) {
            $value = $row[$name];
            if ($value !== null) {
                if ((str_contains($type, 'int') || $type === 'boolean') && ! is_int($value) && ! is_bool($value) && ! (is_string($value) && preg_match('/^-?[0-9]+$/D', $value) && (string) (int) $value === $value)) {
                    throw new RuntimeException('Nilai kolom '.$name.' bukan bilangan bulat yang valid. Data sumber tidak diubah.');
                }
                $value = match (true) {
                    str_contains($type, 'int'), $type === 'boolean' => (int) $value,
                    str_contains($type, 'datetime'), str_contains($type, 'timestamp') => CarbonImmutable::parse($value, 'UTC')->format('Y-m-d H:i:s.v'),
                    default => (string) $value,
                };
            }
            $result[$name] = $value;
        }

        return $result;
    }

    private function insert(Connection $target, string $table, array $batch): void
    {
        try {
            $target->table($table)->insert($batch);
        } catch (QueryException $error) {
            throw new RuntimeException('MySQL menolak data tabel '.$table.' (SQLSTATE '.($error->errorInfo[0] ?? 'tidak diketahui').'). Seluruh transaksi dibatalkan. Periksa tipe data, batas kolom, dan indeks unik.');
        }
    }

    private function quote(string $identifier): string
    {
        return '"'.str_replace('"', '""', $identifier).'"';
    }

    private function rowHash(array $row): string
    {
        return hash('sha256', json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    private function tableHash(array $hashes): string
    {
        sort($hashes, SORT_STRING);

        return hash('sha256', implode("\n", $hashes));
    }
}
