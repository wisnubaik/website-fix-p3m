<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\CmsContent;
use App\Support\CmsOrder;
use App\Support\EventStructure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CmsController extends Controller
{
    public function page(Request $request, string $page): Response
    {
        abort_unless(in_array($page, [...CmsContent::PAGES, 'kelola-akun'], true), 404);
        if (in_array($page, ['pengaturan', 'hero', 'beranda', 'quick-access', 'hub-cards', 'profil', 'kelola-akun'], true)) {
            abort_unless($request->user()->role === 'SUPERADMIN', 403);
        }

        return Inertia::render('Admin/Content', ['page' => $page]);
    }

    public function index(Request $request, string $resource): JsonResponse
    {
        $table = CmsContent::authorize($request->user(), $resource);
        $query = DB::table($table);
        $fields = array_column(CmsContent::fields($table), 'name');
        if (in_array('deletedAt', $fields, true)) {
            $request->boolean('trash') ? $query->whereNotNull('deletedAt') : $query->whereNull('deletedAt');
        }
        foreach (['section', 'hub', 'category', 'acara', 'group', 'jurusan', 'sesi', 'periodeId', 'skemaId'] as $filter) {
            if ($request->filled($filter) && in_array($filter, $fields, true)) {
                $query->where($filter, $request->string($filter)->toString());
            }
        }
        if ($resource === 'documents' && $request->filled('sections')) {
            $query->whereIn('section', explode(',', $request->string('sections')));
        }
        if (in_array($resource, ['hero', 'settings'], true)) {
            $row = $query->where('id', $resource)->first();

            return response()->json($row ? CmsContent::row($table, $row) : (object) []);
        }
        if ($resource === 'documents' && $request->boolean('unscoped')) {
            $query->whereNull('skemaId');
        }
        $query->orderBy(in_array('order', $fields, true) ? 'order' : ($resource === 'acara-periode' ? 'acara' : 'id'));

        return response()->json($query->orderBy('id')->get()->map(fn ($row) => CmsContent::row($table, $row)))
            ->header('X-CMS-Order-Scope', implode(',', CmsOrder::scopeFields($table)));
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        return $this->save($request, $resource, null);
    }

    public function update(Request $request, string $resource, ?string $id = null): JsonResponse
    {
        return $this->save($request, $resource, $id ?? $resource);
    }

    private function save(Request $request, string $resource, ?string $id): JsonResponse
    {
        $table = CmsContent::authorize($request->user(), $resource);
        abort_if(strlen($request->getContent()) > 256000, 413);

        return DB::transaction(function () use ($request, $resource, $table, $id) {
            CmsOrder::lock($table);
            $existing = $id ? DB::table($table)->where('id', $id)->lockForUpdate()->first() : null;
            abort_if($id && (! $existing || ! empty($existing->deletedAt)) && ! in_array($resource, ['hero', 'settings'], true), 404);
            CmsContent::authorize($request->user(), $resource, $existing->section ?? null);
            $data = CmsContent::validate($resource, $request->json()->all(), ! $existing, (array) $existing);
            CmsContent::authorize($request->user(), $resource, $data['section'] ?? null);
            $ordered = CmsOrder::enabled($table);
            $position = $ordered ? CmsOrder::position($table, $data, $existing) : null;
            $id ??= (string) Str::uuid();
            $fields = array_column(CmsContent::fields($table), 'name');
            if (in_array('updatedAt', $fields, true)) {
                $data['updatedAt'] = now();
            }
            if ($existing) {
                DB::table($table)->where('id', $id)->update($data);
            } else {
                foreach (CmsContent::fields($table) as $field) {
                    if (array_key_exists('default', $field) && ! array_key_exists($field['name'], $data) && $field['name'] !== 'id') {
                        $data[$field['name']] = $field['default'];
                    }
                }
                if (in_array('createdAt', $fields, true)) {
                    $data['createdAt'] = now();
                }
                DB::table($table)->insert(['id' => $id, ...$data]);
            }
            if ($ordered) {
                $saved = (array) DB::table($table)->where('id', $id)->first();
                if ($existing && ! CmsOrder::sameScope($table, (array) $existing, $saved)) {
                    CmsOrder::normalize($table, (array) $existing);
                }
                CmsOrder::place($table, $saved, $position);
            }
            Audit::record($request->user(), $existing ? 'update' : 'create', $resource, $id);

            return response()->json(CmsContent::row($table, DB::table($table)->where('id', $id)->first()), $existing ? 200 : 201);
        }, 5);
    }

    public function destroy(Request $request, string $resource, string $id): JsonResponse
    {
        $table = CmsContent::authorize($request->user(), $resource);

        return DB::transaction(function () use ($request, $resource, $id, $table) {
            CmsOrder::lock($table);
            $row = DB::table($table)->where('id', $id)->lockForUpdate()->first();
            abort_unless($row, 404);
            CmsContent::authorize($request->user(), $resource, $row->section ?? null);
            EventStructure::guardDelete($resource, $id);
            $permanent = $request->boolean('permanent');
            abort_if($permanent && $request->user()->role !== 'SUPERADMIN', 403);
            abort_unless(property_exists($row, 'deletedAt'), 405);
            if ($permanent) {
                abort_if(! $row->deletedAt, 409, 'Pindahkan ke sampah terlebih dahulu.');
                if ($resource === 'documents') {
                    DB::table('ProfileTableContent')->where('documentId', $id)->delete();
                }
                DB::table($table)->where('id', $id)->delete();
            } else {
                DB::table($table)->where('id', $id)->update(['deletedAt' => now(), ...(property_exists($row, 'updatedAt') ? ['updatedAt' => now()] : [])]);
            }
            if (CmsOrder::enabled($table)) {
                CmsOrder::normalize($table, (array) $row);
            }
            Audit::record($request->user(), 'delete', $resource, $id);

            return response()->json(['ok' => true]);
        }, 5);
    }

    public function restore(Request $request, string $resource, string $id): JsonResponse
    {
        $table = CmsContent::authorize($request->user(), $resource);

        return DB::transaction(function () use ($request, $resource, $id, $table) {
            CmsOrder::lock($table);
            $row = DB::table($table)->where('id', $id)->lockForUpdate()->first();
            abort_unless($row && property_exists($row, 'deletedAt') && $row->deletedAt, 404);
            CmsContent::authorize($request->user(), $resource, $row->section ?? null);
            EventStructure::validate($resource, (array) $row, (array) $row);
            DB::table($table)->where('id', $id)->update(['deletedAt' => null, ...(property_exists($row, 'updatedAt') ? ['updatedAt' => now()] : [])]);
            if (CmsOrder::enabled($table)) {
                CmsOrder::place($table, (array) $row, (int) $row->order);
            }
            Audit::record($request->user(), 'restore', $resource, $id);

            return response()->json(['ok' => true]);
        }, 5);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate(['resource' => 'required|string', 'items' => 'required|array|size:2', 'items.*.id' => 'required|string|distinct', 'items.*.order' => 'required|integer|min:0|max:2147483646']);
        $table = CmsContent::authorize($request->user(), $data['resource']);
        abort_unless(in_array('order', array_column(CmsContent::fields($table), 'name'), true), 422);
        DB::transaction(function () use ($request, $data, $table) {
            CmsOrder::lock($table);
            $rows = DB::table($table)->whereIn('id', array_column($data['items'], 'id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach ($data['items'] as $item) {
                $row = $rows->get($item['id']);
                abort_unless($row && empty($row->deletedAt), 404);
                CmsContent::authorize($request->user(), $data['resource'], $row->section ?? null);
            }
            [$a, $b] = $data['items'];
            abort_unless(CmsOrder::sameScope($table, (array) $rows[$a['id']], (array) $rows[$b['id']]), 422, 'Urutkan item dalam kelompok yang sama.');
            foreach ([$a, $b] as $item) {
                abort_unless((int) $rows[$item['id']]->order === (int) $item['order'], 409, 'Urutan berubah. Muat ulang data.');
            }
            CmsOrder::swap($table, (array) $rows[$a['id']], (array) $rows[$b['id']]);
            Audit::record($request->user(), 'update', $data['resource'], 'reorder');
        }, 5);

        return response()->json(['ok' => true]);
    }

    public function archive(Request $request): JsonResponse
    {
        $data = $request->validate(['page' => 'required|string|max:100']);

        return response()->json(DB::table('ArchiveBlock')->where('page', $data['page'])->orderBy('order')->get());
    }

    public function log(Request $request): Response
    {
        $query = \App\Support\ActivityLogs::query($request);
        $logs = $query->orderByDesc('createdAt')->orderByDesc('id')->paginate(50)->withQueryString();
        return Inertia::render('Admin/Log', [
            'logs' => $logs->items(),
            'filters' => $request->only('from', 'to', 'account', 'action'),
            'retentionMonths' => \App\Support\ActivityLogs::months(),
            'pagination' => ['current' => $logs->currentPage(), 'last' => $logs->lastPage(), 'total' => $logs->total(), 'previous' => $logs->previousPageUrl(), 'next' => $logs->nextPageUrl()],
        ]);
    }

    public function exportLog(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = \App\Support\ActivityLogs::query($request);
        // Cap one download so a large history cannot hold a worker indefinitely.
        $ids = (clone $query)->orderByDesc('createdAt')->orderByDesc('id')->limit(10001)->pluck('id');
        abort_if($ids->count() > 10000, 422, 'Maksimal 10.000 catatan per unduhan. Persempit rentang tanggal atau filter.');
        $query->whereIn('id', $ids);
        Audit::record($request->user(), 'export', 'activity_log', 'Mengunduh riwayat aktivitas');
        return response()->streamDownload(function () use ($query): void {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Waktu', 'Akun', 'Aksi', 'Bagian', 'Detail'], ';', '"', '');
            foreach ($query->orderByDesc('createdAt')->orderByDesc('id')->lazy(500)->take(10000) as $row) {
                fputcsv($out, array_map([\App\Support\ActivityLogs::class, 'csvCell'], [$row->createdAt, $row->username, $row->action, $row->resource, $row->detail]), ';', '"', '');
            }
            fclose($out);
        }, 'riwayat-aktivitas-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }
}
