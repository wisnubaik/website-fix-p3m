<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use SQLite3;

class LegacyImport
{
    public const SKIPPED = ['AdminSession', 'RateLimit'];

    public function run(string $filename): array
    {
        $path = realpath($filename);
        if ($path === false || ! is_file($path)) {
            throw new RuntimeException('Database sumber tidak ditemukan.');
        }
        $target = DB::connection()->getDatabaseName();
        if ($target !== ':memory:' && realpath($target) === $path) {
            throw new RuntimeException('Database sumber dan tujuan harus berbeda.');
        }
        $schema = json_decode(file_get_contents(database_path('legacy-schema.json')), true, flags: JSON_THROW_ON_ERROR);
        $source = new SQLite3($path, SQLITE3_OPEN_READONLY);
        $source->enableExceptions(true);
        $source->busyTimeout(5000);
        $source->exec('BEGIN');
        try {
            if ($source->querySingle('PRAGMA integrity_check') !== 'ok') {
                throw new RuntimeException('Integritas database sumber tidak valid.');
            }

            return DB::transaction(function () use ($source, $schema) {
                foreach ($schema as $table) {
                    if (DB::table($table['name'])->exists()) {
                        throw new RuntimeException('Import dibatalkan: tabel '.$table['name'].' sudah terisi. Gunakan database tujuan kosong.');
                    }
                    $actual = [];
                    $columns = $source->query('PRAGMA table_info("'.$table['name'].'")');
                    while ($column = $columns->fetchArray(SQLITE3_ASSOC)) {
                        $actual[] = $column['name'];
                    }
                    $expected = array_column($table['fields'], 'name');
                    sort($actual);
                    sort($expected);
                    if ($actual !== $expected) {
                        throw new RuntimeException('Skema sumber berbeda pada '.$table['name'].'. Gunakan database v85 tanpa 2FA.');
                    }
                }
                $report = [];
                foreach ($schema as $table) {
                    $name = $table['name'];
                    if (in_array($name, self::SKIPPED, true)) {
                        continue;
                    }
                    $key = collect($table['fields'])->firstWhere('primary', true)['name'];
                    $rows = $source->query('SELECT * FROM "'.$name.'" ORDER BY "'.$key.'"');
                    $hash = hash_init('sha256');
                    $count = 0;
                    $batch = [];
                    while ($row = $rows->fetchArray(SQLITE3_ASSOC)) {
                        $normalized = $this->normalize($row, $table['fields']);
                        hash_update($hash, json_encode($normalized, JSON_THROW_ON_ERROR)."\n");
                        $batch[] = $normalized;
                        $count++;
                        if (count($batch) >= 30) {
                            DB::table($name)->insert($batch);
                            $batch = [];
                        }
                    }
                    if ($batch !== []) {
                        DB::table($name)->insert($batch);
                    }
                    $expectedHash = hash_final($hash);
                    $actualHash = hash_init('sha256');
                    foreach (DB::table($name)->orderBy($key)->cursor() as $row) {
                        hash_update($actualHash, json_encode($this->normalize((array) $row, $table['fields']), JSON_THROW_ON_ERROR)."\n");
                    }
                    if (DB::table($name)->count() !== $count || ! hash_equals($expectedHash, hash_final($actualHash))) {
                        throw new RuntimeException('Verifikasi data gagal pada '.$name.'. Seluruh import dibatalkan.');
                    }
                    $report[$name] = ['count' => $count, 'verified' => true];
                }

                return $report;
            });
        } finally {
            $source->exec('ROLLBACK');
            $source->close();
        }
    }

    private function normalize(array $row, array $fields): array
    {
        $result = [];
        foreach ($fields as $field) {
            $value = $row[$field['name']];
            if ($value !== null) {
                $value = match ($field['type']) {
                    'Int', 'BigInt', 'Boolean' => (int) $value,
                    'DateTime' => (is_numeric($value)
                        ? CarbonImmutable::createFromTimestampMs($value, 'UTC')
                        : CarbonImmutable::parse($value, 'UTC'))->utc()->format('Y-m-d H:i:s.v'),
                    default => (string) $value,
                };
            }
            $result[$field['name']] = $value;
        }

        return $result;
    }
}
