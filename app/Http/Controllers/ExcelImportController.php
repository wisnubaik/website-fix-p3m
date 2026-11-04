<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\CmsContent;
use App\Support\CmsExcel;
use App\Support\CmsOrder;
use App\Support\ExcelWorkbook;
use App\Support\ResearchBulk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExcelImportController extends Controller
{
    private function definition(Request $request, string $resource): array
    {
        $config = $request->input('config', []);
        if (is_string($config)) {
            abort_if(strlen($config) > 100000, 413);
            $config = json_decode($config, true);
        }
        if (! is_array($config)) {
            ExcelWorkbook::fail('Konfigurasi template tidak valid.');
        }

        abort_if(strlen(json_encode($config)) > 100000, 413);

        return CmsExcel::definition($request->user(), $resource, $config);
    }

    public function template(Request $request, string $resource): BinaryFileResponse
    {
        $definition = $this->definition($request, $resource);
        $records = [];
        if ($request->boolean('includeData')) {
            if ($resource === 'rows') {
                abort_if(strlen($request->getContent()) > 2000000, 413, 'Data unduhan terlalu besar.');
                $request->validate(['currentRows' => 'present|array|max:2000', 'currentRows.*' => 'array|max:80']);
                $records = $request->input('currentRows');
                foreach ($records as $row) {
                    foreach ($row as $key => $value) {
                        abort_unless(isset($definition['columns'][$key]), 422, 'Kolom unduhan tidak sesuai template.');
                        $values = is_array($value) ? $value : [$value];
                        abort_if(count($values) > 2000, 422, 'Isi daftar terlalu panjang.');
                        foreach ($values as $cell) {
                            abort_unless($cell === null || is_scalar($cell), 422, 'Isi sel unduhan tidak valid.');
                            abort_if(is_string($cell) && mb_strlen($cell) > 15000, 422, 'Isi sel terlalu panjang.');
                        }
                    }
                }
            } else {
                $table = CmsContent::TABLES[$resource];
                $query = DB::table($table)->whereNull('deletedAt');
                foreach ($definition['scope'] as $key => $value) {
                    $query->where($key, $value);
                }
                if (CmsOrder::enabled($table)) {
                    $query->orderBy('order');
                }
                $records = $query->orderBy('id')->limit($definition['maxRows'] + 1)->get()->map(fn ($row) => (array) $row)->all();
            }
            abort_if(count($records) > $definition['maxRows'], 422, 'Jumlah data melebihi batas template. Pilih cakupan yang lebih kecil sebelum mengunduh.');
            $records = array_map(function ($row) use ($definition) {
                return array_map(function ($key) use ($row, $definition) {
                    $value = $row[$key] ?? '';
                    if ($definition['columns'][$key]['type'] === 'boolean') {
                        return $value ? 'Ya' : 'Tidak';
                    }
                    if ($definition['columns'][$key]['type'] === 'pairs') {
                        $pairs = json_decode((string) $value, true) ?? [];
                        return implode("\n", array_map(fn ($pair) => ($pair[0] ?? '').': '.($pair[1] ?? ''), $pairs));
                    }
                    return is_array($value) ? implode("\n", $value) : (string) $value;
                }, array_keys($definition['columns']));
            }, $records);
        }
        $path = ExcelWorkbook::template(CmsExcel::signature($definition), $definition['columns'], $definition['title'], ['records' => $records, 'maxRows' => $definition['maxRows'], 'inline' => $resource === 'rows', 'scope' => $definition['scope']]);

        return response()->download($path, 'template-'.$resource.'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control' => 'private, no-store'])->deleteFileAfterSend(true);
    }

    public function preview(Request $request, string $resource): JsonResponse
    {
        $definition = $this->definition($request, $resource);
        $request->validate(['mode' => 'sometimes|in:append,replace']);
        $replace = $request->input('mode') === 'replace';
        if ($replace && $resource !== 'rows') {
            $category = ResearchBulk::category($definition);
            $definition['replacement'] = true;
            $definition['fingerprint'] = ResearchBulk::fingerprint($category);
            $definition['oldCount'] = count(ResearchBulk::rows($category));
        }
        $request->validate(['file' => ['required', 'file', 'max:10240', 'extensions:xlsx']]);
        $source = ExcelWorkbook::read($request->file('file')->getRealPath(), CmsExcel::signature($definition), $definition['columns']);
        if (count($source['rows']) > $definition['maxRows']) {
            ExcelWorkbook::fail('Daftar ini maksimal '.$definition['maxRows'].' baris per unggahan. Kurangi baris pada sheet Data.');
        }
        $result = CmsExcel::prepare($request->user(), $definition, $source['rows'], $source['date1904'], ignoreExisting: $replace);
        $token = null;
        if (! $result['errorCount'] && $resource !== 'rows' && count($result['rows'])) {
            DB::table('cms_excel_imports')->where('expires_at', '<', now())->delete();
            $token = (string) Str::uuid();
            DB::table('cms_excel_imports')->insert(['id' => $token, 'admin_id' => $request->user()->id, 'resource' => $resource, 'definition' => json_encode($definition), 'payload' => json_encode($result), 'created_at' => now(), 'expires_at' => now()->addHour()]);
        }

        return response()->json(['scopeLabel' => isset($category) ? ResearchBulk::label($category) : null, 'oldCount' => $definition['oldCount'] ?? null, ...$result, 'rows' => $resource === 'rows' ? $result['rows'] : array_slice($result['rows'], 0, 20), 'validCount' => count($result['rows']), 'columns' => $definition['columns'], 'token' => $token])->header('Cache-Control', 'private, no-store');
    }

    public function bulkPreview(Request $request, string $resource): JsonResponse
    {
        $definition = $this->definition($request, $resource);
        $category = ResearchBulk::category($definition);
        $request->validate(['action' => 'required|in:clear,defaults,undo,status,delete-backup', 'backupId' => 'nullable|uuid', 'confirmation' => 'nullable|string', 'historyPage' => 'nullable|integer|min:1']);

        return DB::transaction(function () use ($request, $definition, $category, $resource) {
            DB::table('cms_excel_locks')->where('id', 'import')->lockForUpdate()->first();
            CmsOrder::lock(CmsContent::TABLES[$resource]);
            $action = $request->input('action');
            $backups = DB::table('research_data_backups')->where('category', ResearchBulk::key($category));
            $latest = (clone $backups)->orderByDesc('sequence')->value('id');
            if ($action === 'status') {
                $history = (clone $backups)->orderByDesc('sequence')->paginate(10, ['id', 'created_at'], 'historyPage', $request->integer('historyPage', 1));
                return response()->json([
                    'label' => ResearchBulk::label($category), 'hasDefaults' => count(ResearchBulk::defaults($category)) > 0,
                    'hasBackup' => $latest !== null,
                    'backups' => $history->map(fn ($row) => ['id' => $row->id, 'createdAt' => $row->created_at, 'canDelete' => $request->user()->role === 'SUPERADMIN' && $row->id !== $latest && \Illuminate\Support\Carbon::parse($row->created_at)->lt(now()->subDays(30))])->all(),
                    'historyPage' => $history->currentPage(), 'historyLast' => $history->lastPage(),
                ]);
            }
            if ($action === 'delete-backup') {
                abort_unless($request->user()->role === 'SUPERADMIN', 403);
                abort_unless($request->input('confirmation') === 'HAPUS CADANGAN', 422, 'Konfirmasi penghapusan belum sesuai.');
                $backup = (clone $backups)->where('id', $request->input('backupId'))->first();
                abort_unless($backup, 404);
                abort_if($backup->id === $latest || \Illuminate\Support\Carbon::parse($backup->created_at)->gte(now()->subDays(30)), 422, 'Cadangan terakhir dan cadangan 30 hari terakhir tetap disimpan.');
                (clone $backups)->where('id', $backup->id)->delete();
                Audit::record($request->user(), 'delete', $resource, 'Hapus cadangan lama: '.$backup->id);
                return response()->json(['message' => 'Cadangan lama dihapus. Data aktif tidak berubah.']);
            }
            $records = [];
            if ($action === 'defaults') {
                $records = ResearchBulk::defaults($category);
                abort_unless($records, 422, 'Kategori ini tidak mempunyai data bawaan.');
            } elseif ($action === 'undo') {
                $backup = DB::table('research_data_backups')->where('category', ResearchBulk::key($category))->when($request->filled('backupId'), fn ($query) => $query->where('id', $request->input('backupId')))->orderByDesc('sequence')->first();
                abort_unless($backup, 422, 'Belum ada cadangan sebelum tindakan massal pada kategori ini.');
                $records = json_decode(Crypt::decryptString($backup->payload), true);
            }
            $definition = [...$definition, 'replacement' => true, 'bulkAction' => $action, 'fingerprint' => ResearchBulk::fingerprint($category), 'oldCount' => count(ResearchBulk::rows($category))];
            $token = (string) Str::uuid();
            DB::table('cms_excel_imports')->insert(['id' => $token, 'admin_id' => $request->user()->id, 'resource' => $resource, 'definition' => json_encode($definition), 'payload' => json_encode(['records' => $records]), 'created_at' => now(), 'expires_at' => now()->addHour()]);

            return response()->json(['token' => $token, 'oldCount' => $definition['oldCount'], 'newCount' => count($records), 'action' => $action, 'label' => ResearchBulk::label($category)]);
        });
    }

    public function commit(Request $request, string $resource): JsonResponse
    {
        $request->validate(['token' => 'required|uuid']);
        CmsContent::authorize($request->user(), $resource);
        abort_if(in_array($resource, ['hero', 'settings', 'acara-periode'], true), 404);
        $result = DB::transaction(function () use ($request, $resource): array|JsonResponse {
            DB::table('cms_excel_locks')->where('id', 'import')->lockForUpdate()->first();
            $batch = DB::table('cms_excel_imports')->where('id', $request->input('token'))->where('admin_id', $request->user()->id)->where('resource', $resource)->lockForUpdate()->first();
            abort_unless($batch, 404);
            abort_if(now()->greaterThan($batch->expires_at), 410, 'Pratinjau sudah kedaluwarsa. Periksa ulang Excel.');
            $definition = json_decode($batch->definition, true);
            CmsContent::authorize($request->user(), $resource, $definition['scope']['section'] ?? null);
            if ($batch->result) {
                return json_decode($batch->result, true);
            }
            $table = CmsContent::TABLES[$resource];
            CmsOrder::lock($table);
            $payload = json_decode($batch->payload, true);
            $replacement = $definition['replacement'] ?? false;
            if ($replacement) {
                $category = ResearchBulk::category($definition);
                abort_unless(hash_equals($definition['fingerprint'], ResearchBulk::fingerprint($category)), 409, 'Data berubah sejak pemeriksaan. Periksa ulang sebelum melanjutkan.');
            }
            if (isset($definition['bulkAction'])) {
                ResearchBulk::backup($category, $request->user()->id);
                ResearchBulk::clear($category);
                ResearchBulk::restore($category, $payload['records']);
                $summary = ['imported' => count($payload['records']), 'duplicates' => 0];
                Audit::record($request->user(), 'update', $resource, $definition['bulkAction'].': '.$category.'; '.$definition['oldCount'].' menjadi '.$summary['imported'].' baris');
                DB::table('cms_excel_imports')->where('id', $batch->id)->update(['result' => json_encode($summary), 'payload' => '{}']);

                return $summary;
            }
            $result = CmsExcel::prepare($request->user(), $definition, $payload['rows'], converted: true, ignoreExisting: $replacement);
            if ($result['errorCount']) {
                return response()->json([...$result, 'message' => 'Data berubah sejak pratinjau. Tidak ada baris yang disimpan. Periksa ulang berkas.'], 422);
            }
            if ($replacement) {
                abort_unless(count($result['rows']), 422, 'Excel kosong tidak dapat mengganti data.');
                ResearchBulk::backup($category, $request->user()->id);
                ResearchBulk::clear($category);
            }
            $fields = array_column(CmsContent::fields($table), 'name');
            $scopes = [];
            $inserts = [];
            foreach ($result['rows'] as $row) {
                $data = $row['values'];
                $data['id'] = (string) Str::uuid();
                foreach (['createdAt', 'updatedAt'] as $field) {
                    if (in_array($field, $fields, true)) {
                        $data[$field] = now()->format('Y-m-d H:i:s.v');
                    }
                }
                if (CmsOrder::enabled($table)) {
                    $scope = array_intersect_key($data, array_flip(CmsOrder::scopeFields($table)));
                    $key = json_encode($scope);
                    if (! isset($scopes[$key])) {
                        $query = DB::table($table)->whereNull('deletedAt');
                        foreach ($scope as $k => $v) {
                            $query->where($k, $v);
                        }
                        $scopes[$key] = ['scope' => $scope, 'next' => (int) ($query->max('order') ?? -1) + 1];
                    }
                    $data['order'] = $scopes[$key]['next']++;
                }
                $inserts[] = $data;
            }
            foreach (array_chunk($inserts, 50) as $chunk) {
                DB::table($table)->insert($chunk);
            }
            foreach ($scopes as $scope) {
                CmsOrder::normalize($table, $scope['scope']);
            }
            $summary = ['imported' => count($inserts), 'duplicates' => $payload['duplicates'] + $result['duplicates']];
            if ($inserts) {
                Audit::record($request->user(), 'create', $resource, ($replacement ? 'Ganti Excel '.$category.': ' : 'Impor Excel: ').count($inserts).' baris; duplikat dilewati: '.$summary['duplicates']);
            }
            DB::table('cms_excel_imports')->where('id', $batch->id)->update(['result' => json_encode($summary), 'payload' => '{}']);

            return $summary;
        }, 5);

        return $result instanceof JsonResponse ? $result : response()->json($result);
    }
}
