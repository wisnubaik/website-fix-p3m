<?php

namespace App\Support;

use App\Models\Admin;
use App\Models\RisetEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CmsExcel
{
    public static function definition(Admin $admin, string $resource, array $config): array
    {
        $inline = $resource === 'rows';
        if ($inline) {
            abort_unless($admin->role === 'SUPERADMIN', 403);
            $schema = [];
        } else {
            abort_if(in_array($resource, ['hero', 'settings', 'acara-periode'], true), 404);
            CmsContent::authorize($admin, $resource);
            $schemas = json_decode(file_get_contents(database_path('content-schema.json')), true);
            $schema = $schemas[$resource] ?? ['label' => ['type' => 'String', 'required' => true, 'nullable' => false], 'href' => ['type' => 'String', 'required' => true, 'nullable' => false], 'published' => ['type' => 'Boolean', 'required' => false, 'nullable' => false]];
            unset($schema['order']);
        }
        $scope = $config['scope'] ?? [];
        if (! is_array($scope) || count($scope) > 8) {
            ExcelWorkbook::fail('Bagian tujuan tidak valid.');
        }
        foreach ($scope as $key => $value) {
            if (! isset($schema[$key]) || ! in_array($schema[$key]['type'], ['String', 'Int'], true) || ! is_string($value) || strlen($value) > 500 || ($schema[$key]['type'] === 'Int' && ! preg_match('/^[0-9]{4}$/', $value))) {
                ExcelWorkbook::fail('Bagian tujuan tidak valid.');
            }
        }
        if (! $inline) {
            CmsContent::authorize($admin, $resource, $scope['section'] ?? null);
        }
        if ($resource === 'content-list' && ($scope['section'] ?? '') === 'home-agenda') {
            $schema['label'] = ['type' => 'String', 'nullable' => true, 'required' => false];
        }
        if ($resource === 'monev-slot' || ($resource === 'documents' && (! empty($scope['skemaId']) || ($scope['section'] ?? '') === 'semhas'))) {
            if (empty($scope['periodeId']) || empty($scope['skemaId'])) {
                ExcelWorkbook::fail('Pilih periode dan skema sebelum mengunduh atau mengunggah Excel.');
            }
        }
        $requested = $config['columns'] ?? [];
        if (! is_array($requested) || count($requested) > 80) {
            ExcelWorkbook::fail('Kolom template tidak valid.');
        }
        foreach ($requested as $column) {
            if (! is_array($column) || ! isset($column['key']) || ! is_string($column['key']) || ! preg_match('/^[a-zA-Z0-9_.]{1,100}$/', $column['key'])) {
                ExcelWorkbook::fail('Kolom template tidak valid.');
            }
        }
        $requested = collect($requested)->keyBy('key')->all();
        $labels = ['title' => 'Judul', 'name' => 'Nama', 'label' => 'Label', 'text' => 'Isi teks', 'desc' => 'Deskripsi', 'year' => 'Tahun', 'leader' => 'Ketua', 'member1' => 'Anggota 1', 'member2' => 'Anggota 2', 'funding' => 'Dana (rupiah)', 'published' => 'Tampil', 'href' => 'Tautan', 'section' => 'Bagian', 'group' => 'Kelompok', 'groupTitle' => 'Judul kelompok', 'kind' => 'Jenis berkas', 'category' => 'Kategori', 'details' => 'Rincian profil', 'photoUrl' => 'Alamat foto', 'initial' => 'Inisial', 'role' => 'Jabatan', 'value' => 'Nilai', 'metric' => 'Jenis statistik'];
        $choices = ['acara' => ['monev', 'semhas'], 'jurusan' => ['adbis', 'akuntansi', 'teknik'], 'sesi' => ['penelitian', 'pkm'], 'hub' => ['penelitian', 'pkm'], 'kind' => ['pdf', 'docx', 'xlsx', 'pptx', 'link'], 'peranNama' => ['semua', 'ketua']];
        if ($resource === 'announcements') {
            $choices['kind'] = ['pdf', 'docx'];
        }
        if ($resource === 'riset-entries') {
            $choices['category'] = array_keys(RisetEntry::CATEGORIES);
        }
        if ($resource === 'documents') {
            $choices['section'] = ['profil-media', 'home-media', 'home-links', 'home-prodi', 'repository', 'monev', 'semhas', 'ki', 'panduan', 'asesmen', 'luaran', 'laporan-keuangan', 'mitra', 'kegiatan', 'sinta', 'tkt'];
        }
        $columns = [];
        $defaults = $inline ? [] : self::defaults(CmsContent::TABLES[$resource]);
        foreach ($inline ? array_keys($requested) : array_keys($schema) as $key) {
            if (isset($scope[$key])) {
                continue;
            }
            $field = $schema[$key] ?? ['type' => 'String', 'nullable' => (bool) ($requested[$key]['nullable'] ?? false), 'required' => false];
            if (! $inline && $requested && ! isset($requested[$key]) && ! $field['required'] && $key !== 'published') {
                continue;
            }
            $given = $requested[$key] ?? [];
            $type = $inline ? ($given['type'] ?? 'text') : match ($field['type']) {
                'Int' => 'integer','Boolean' => 'boolean',default => 'text'
            };
            if (! $inline && $field['type'] === 'String') {
                $type = str_starts_with($key, 'tanggal') ? 'date' : (in_array($key, ['mulai', 'selesai'], true) ? 'time' : ($key === 'details' ? 'pairs' : 'text'));
            }
            if (! in_array($type, ['text', 'integer', 'number', 'boolean', 'date', 'time', 'pairs', 'lines'], true)) {
                ExcelWorkbook::fail('Jenis kolom tidak dikenal.');
            }
            $options = $inline ? ($given['options'] ?? []) : ($choices[$key] ?? ($given['options'] ?? []));
            if (! is_array($options) || count($options) > 300 || collect($options)->contains(fn ($v) => ! is_string($v) || mb_strlen($v) > 500)) {
                ExcelWorkbook::fail('Pilihan kolom tidak valid.');
            }
            $columns[$key] = ['label' => mb_substr((string) ($given['label'] ?? $labels[$key] ?? ucfirst($key)), 0, 120), 'type' => $type, 'nullable' => $field['nullable'], 'required' => $field['required'] || (bool) ($given['required'] ?? false), 'options' => $options,
                'help' => match ($type) {
                    'integer' => 'Bilangan bulat tanpa Rp, titik, atau pemisah ribuan.','number' => 'Angka dengan titik sebagai pemisah desimal.','boolean' => 'Ya atau Tidak. Kosong berarti Tidak.','date' => 'YYYY-MM-DD, contoh 2026-10-18.','time' => 'HH:MM, contoh 09:30.','pairs' => 'Satu rincian per baris sel: label: isi. Contoh Email: nama@kampus.ac.id. Gunakan Alt+Enter untuk rincian berikutnya.','lines' => 'Satu butir per baris dalam sel (Alt+Enter).',default => preg_match('/href|url|src/i', $key) ? 'Alamat https:// atau alamat internal yang sudah tersedia.' : 'Teks. Pertahankan angka nol di awal nomor.'
                }];
        }
        if (! $columns) {
            ExcelWorkbook::fail('Tidak ada kolom data untuk diimpor.');
        }
        foreach ($columns as $key => &$column) {
            $column = [...$column, ...ExcelColumnGuide::describe($resource, $key, $column, $defaults[$key] ?? null)];
            $policy = $inline ? FieldRules::labelPolicy($column['label']) : FieldRules::policy($resource, $key, $schema[$key]['type'] ?? null);
            if ($policy !== 'text') {
                $column['help'] = FieldRules::catalog()['rules'][$policy]['help'];
            }
        }
        unset($column);
        $limit = $config['maxRows'] ?? 2000;
        if (! is_int($limit) || $limit < 1 || $limit > 2000) {
            ExcelWorkbook::fail('Batas baris template harus antara 1 dan 2.000.');
        }
        ksort($scope);

        return ['maxRows' => $limit, 'resource' => $resource, 'scope' => $scope, 'columns' => $columns, 'title' => mb_substr((string) ($config['title'] ?? 'Impor data'), 0, 120), 'context' => mb_substr((string) ($config['context'] ?? ''), 0, 200)];
    }

    public static function signature(array $definition): string
    {
        $columns = array_map(fn ($c) => array_diff_key($c, array_flip(['label', 'help', 'example', 'blank', 'rule'])), $definition['columns']);
        ksort($columns);

        return 'P3M-EXCEL-1:'.hash('sha256', json_encode([$definition['resource'], $definition['scope'], $definition['context'], $columns]));
    }

    public static function convert(string $value, array $column, bool $date1904): mixed
    {
        if ($value === '') {
            if ($column['required']) {
                throw ValidationException::withMessages(['nilai' => 'Wajib diisi.']);
            }

            return $column['nullable'] ? null : match ($column['type']) {
                'boolean' => false,'integer','number' => 0,'lines' => [],default => ''
            };
        }
        $type = $column['type'];
        if ($type === 'boolean') {
            return match (mb_strtolower($value)) {
                'ya','true','1' => true,'tidak','false','0' => false,default => throw ValidationException::withMessages(['nilai' => 'Isi Ya atau Tidak.'])
            };
        }
        if (in_array($type, ['integer', 'number'], true)) {
            if (! preg_match($type === 'integer' ? '/^\d+$/' : '/^-?\d+(\.\d+)?$/', $value) || ! is_finite((float) $value) || abs((float) $value) > 2147483647) {
                throw ValidationException::withMessages(['nilai' => 'Format angka tidak valid. Jangan gunakan pemisah ribuan.']);
            }

            return $type === 'integer' ? (int) $value : (float) $value;
        }
        if ($type === 'date' && is_numeric($value) && (float) $value >= 1 && (float) $value < 100000) {
            $value = (new \DateTimeImmutable($date1904 ? '1904-01-01' : '1899-12-30'))->modify('+'.(int) $value.' days')->format('Y-m-d');
        }
        if ($type === 'time' && is_numeric($value) && (float) $value >= 0 && (float) $value < 1) {
            $minutes = (int) round((float) $value * 1440);
            $value = sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
        }
        if ($type === 'date' && (! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) || ! checkdate((int) $m[2], (int) $m[3], (int) $m[1]))) {
            throw ValidationException::withMessages(['nilai' => 'Tanggal harus YYYY-MM-DD dan valid.']);
        }
        if ($type === 'time' && ! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value)) {
            throw ValidationException::withMessages(['nilai' => 'Jam harus HH:MM.']);
        }
        if ($column['options'] && ! in_array($value, $column['options'], true)) {
            throw ValidationException::withMessages(['nilai' => 'Pilih: '.implode(', ', $column['options'])]);
        }
        if (mb_strlen($value) > 20000) {
            throw ValidationException::withMessages(['nilai' => 'Isi sel terlalu panjang.']);
        }
        if ($type === 'lines') {
            return array_values(array_filter(array_map('trim', preg_split('/\R/', $value)), fn ($v) => $v !== ''));
        }
        if ($type === 'pairs') {
            $pairs = [];
            foreach (preg_split('/\R/', $value) as $line) {
                if (trim($line) === '') {
                    continue;
                }
                $pair = array_map('trim', explode(':', $line, 2));
                if (count($pair) !== 2 || $pair[0] === '' || $pair[1] === '') {
                    throw ValidationException::withMessages(['nilai' => 'Rincian memakai format label: isi, satu rincian per baris sel.']);
                }
                $pairs[] = $pair;
            }

            return json_encode($pairs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        return $value;
    }

    public static function defaults(string $table): array
    {
        $data = [];
        foreach (CmsContent::fields($table) as $field) {
            $key = $field['name'];
            if (in_array($key, ['id', 'createdAt', 'updatedAt', 'deletedAt', 'order'], true)) {
                continue;
            }
            $data[$key] = $key === 'published' ? false : ($field['default'] ?? ($field['nullable'] ? null : match ($field['type']) {
                'Int' => 0,'Boolean' => false,default => ''
            }));
        }

        return $data;
    }

    private static function fingerprint(array $data): string
    {
        ksort($data);

        return hash('sha256', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    public static function prepare(Admin $admin, array $definition, array $source, bool $date1904 = false, bool $converted = false, bool $ignoreExisting = false): array
    {
        $resource = $definition['resource'];
        $columns = $definition['columns'];
        $inline = $resource === 'rows';
        $table = $inline ? null : CmsContent::authorize($admin, $resource, $definition['scope']['section'] ?? null);
        $defaults = $inline ? [] : self::defaults($table);
        $known = [];
        $unique = [];
        if (! $inline && ! $ignoreExisting) {
            $query = DB::table($table);
            foreach ($definition['scope'] as $key => $value) {
                $query->where($key, $value);
            }
            if (in_array('deletedAt', array_column(CmsContent::fields($table), 'name'), true)) {
                $query->whereNull('deletedAt');
            }
            foreach ($query->get() as $record) {
                $row = CmsContent::row($table, $record);
                $data = array_intersect_key($row, $defaults);
                $known[self::fingerprint($data)] = true;
                if ($resource === 'trend-stats') {
                    $unique[$row['metric'].'|'.$row['year']] = true;
                }
            }
        }
        $valid = [];
        $errors = [];
        $duplicates = 0;
        foreach ($source as $row) {
            $data = $definition['scope'];
            $rowErrors = [];
            foreach ($columns as $key => $column) {
                if (! $inline && ! $column['required'] && $key !== 'published' && in_array($row['values'][$key] ?? null, ['', null], true)) {
                    continue;
                }
                try {
                    $data[$key] = $converted ? ($row['values'][$key] ?? null) : self::convert($row['values'][$key] ?? '', $column, $date1904);
                } catch (ValidationException $e) {
                    $rowErrors[] = ['row' => $row['number'], 'field' => $column['label'], 'message' => implode(' ', array_merge(...array_values($e->errors())))];
                }
            }
            if (! $rowErrors) {
                try {
                    if ($inline) {
                        foreach ($data as $key => $value) {
                            FieldRules::textTree($value, $key);
                            $policy = FieldRules::labelPolicy($columns[$key]['label']);
                            if ($policy !== 'text') {
                                FieldRules::check($policy, $value, $key);
                            }
                            if (is_string($value) && $value !== '' && preg_match('/href|url|src/i', $key) && ! CmsContent::safeUrl($value)) {
                                throw ValidationException::withMessages([$key => 'Alamat tujuan tidak tersedia atau tidak valid.']);
                            }
                        }
                    } else {
                        CmsContent::authorize($admin, $resource, $data['section'] ?? null);
                        $data = [...$defaults, ...CmsContent::validate($resource, $data, true)];
                    }
                    $fingerprint = self::fingerprint($data);
                    if (isset($known[$fingerprint])) {
                        $duplicates++;

                        continue;
                    }
                    if ($resource === 'trend-stats') {
                        $key = $data['metric'].'|'.$data['year'];
                        if (isset($unique[$key])) {
                            throw ValidationException::withMessages(['year' => 'Statistik jenis dan tahun ini sudah ada dengan nilai berbeda. Edit data lama melalui CMS.']);
                        }
                        $unique[$key] = true;
                    }
                    $known[$fingerprint] = true;
                    $valid[] = ['number' => $row['number'], 'values' => $data];
                } catch (ValidationException $e) {
                    foreach ($e->errors() as $key => $messages) {
                        $rowErrors[] = ['row' => $row['number'], 'field' => $columns[$key]['label'] ?? $key, 'message' => implode(' ', $messages)];
                    }
                }
            }
            foreach ($rowErrors as &$error) {
                foreach ($columns as $column) {
                    if ($column['label'] === $error['field']) {
                        $error['hint'] = ($column['help'] ?? '').' '.($column['required'] ? 'Kolom ini wajib diisi.' : ($column['blank'] ?? ''));
                        break;
                    }
                }
            }
            unset($error);
            $errors = [...$errors, ...$rowErrors];
        }

        return ['rows' => $valid, 'errors' => array_slice($errors, 0, 100), 'errorCount' => count($errors), 'duplicates' => $duplicates, 'total' => count($source)];
    }
}
