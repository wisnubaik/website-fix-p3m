<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\CmsOrder;
use App\Support\DisplayText;
use App\Support\ManagedContent;
use App\Support\ProfileContent;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileTableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $rows = DB::table('DocumentItem as document')
            ->join('ProfileTableContent as content', 'content.documentId', '=', 'document.id')
            ->where('document.section', 'profil-media')->whereNull('document.deletedAt')
            ->orderBy('document.order')->orderBy('document.id')
            ->get(['document.id', 'document.name', 'document.groupTitle', 'document.published', 'document.order',
                'document.updatedAt as documentUpdatedAt', 'content.version', 'content.content']);

        $fields = ManagedContent::decode(ManagedContent::page('/profil')?->published)['fields'] ?? [];

        return response()->json($rows->map(function ($row) use ($fields) {
            $row->published = (bool) $row->published;
            $row->content = json_decode($row->content, true, flags: JSON_THROW_ON_ERROR);
            foreach ($row->content['tables'] as &$table) {
                if (DisplayText::clean($table['note']) === 'Tanda “-” mengikuti dokumen sumber dan tidak berarti nol.') {
                    $key = $row->id === 'revision-profil-image-5' ? 'x_48fdd34826c25e' : 'x_8d123fa2cc559d';
                    $table['note'] = $fields[$key] ?? 'Tanda “-” berarti target belum dicantumkan, bukan nol.';
                }
            }
            unset($table);
            $row->documentUpdatedAt = CarbonImmutable::parse($row->documentUpdatedAt, 'UTC')->format('Y-m-d\TH:i:s.v\Z');

            return $row;
        }));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        abort_if(strlen($request->getContent()) > 512000, 413);
        $data = ProfileContent::validate($request->json()->all(), in_array($id, ['revision-profil-image-6', 'revision-profil-image-7'], true));

        return $this->saveRecord($request, $id, $data);
    }

    public function updateRoadmap(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        abort_if(strlen($request->getContent()) > 1024000, 413);
        $payload = $request->validate(['records' => 'required|array|size:2', 'records.*' => 'required|array']);
        $ids = ['revision-profil-image-7', 'revision-profil-image-6'];
        $records = [];
        foreach ($ids as $i => $id) {
            abort_unless(($payload['records'][$i]['id'] ?? null) === $id, 422, 'Dokumen peta jalan tidak sesuai. Muat ulang editor.');
            $records[] = ProfileContent::validate($payload['records'][$i], true);
        }
        $headings = [];
        foreach ($records as $record) {
            $tables = $record['content']['tables'];
            abort_unless(count($tables) === 1 && ! $tables[0]['numeric'] && count($tables[0]['headers']) === 2, 422, 'Format peta jalan harus satu tabel dengan dua kolom per dokumen.');
            $years = [];
            $titles = [];
            foreach ($tables[0]['rows'] as $row) {
                $heading = $row[0]['text'];
                abort_unless(preg_match('/^(19|20)\d{2}\s+\S/u', $heading), 422, 'Isi tahun 1900-2099 dan judul arah pengembangan.');
                $year = substr($heading, 0, 4);
                abort_if(in_array($year, $years, true), 422, 'Tahun tidak boleh berulang.');
                $years[] = $year;
                $titles[] = $heading;
            }
            $headings[] = $titles;
        }
        abort_unless($headings[0] === $headings[1], 422, 'Tahun, judul, dan urutan agenda serta indikator harus sama.');

        return DB::transaction(function () use ($request, $ids, $records) {
            $saved = [];
            foreach ($ids as $i => $id) {
                $saved[] = $this->saveRecord($request, $id, $records[$i], false)->getData(true);
            }

            return response()->json(['records' => $saved]);
        }, 5);
    }

    private function saveRecord(Request $request, string $id, array $data, bool $reorder = true): JsonResponse
    {
        return DB::transaction(function () use ($request, $id, $data, $reorder) {
            CmsOrder::lock('DocumentItem');
            $document = DB::table('DocumentItem')->where('id', $id)->where('section', 'profil-media')->whereNull('deletedAt')->lockForUpdate()->first();
            $content = DB::table('ProfileTableContent')->where('documentId', $id)->lockForUpdate()->first();
            abort_unless($document && $content, 404);
            abort_if($content->version !== $data['version'] ||
                ! CarbonImmutable::parse($document->updatedAt, 'UTC')->equalTo(CarbonImmutable::parse($data['documentUpdatedAt'])),
                409, 'Data sudah berubah. Muat versi terbaru sebelum menyimpan kembali.');
            $position = null;
            if ($reorder) {
                $groups = [['1', '2'], ['3', '4'], ['5'], ['6', '7'], ['8', '9']];
                $group = collect($groups)->first(fn ($numbers) => in_array($id, array_map(fn ($number) => 'revision-profil-image-'.$number, $numbers), true));
                $peers = DB::table('DocumentItem')->where('section', 'profil-media')->whereNull('deletedAt')
                    ->whereIn('id', DB::table('ProfileTableContent')->select('documentId'));
                if ($group) {
                    $peers->whereIn('id', array_map(fn ($number) => 'revision-profil-image-'.$number, $group));
                } else {
                    $peers->whereNotIn('id', array_map(fn ($number) => 'revision-profil-image-'.$number, range(1, 9)));
                }
                if (isset($data['groupPosition'])) {
                    $peerIds = (clone $peers)->orderBy('order')->orderBy('id')->pluck('id')->all();
                    $target = (int) $data['groupPosition'] - 1;
                    if ($target < 0 || $target >= count($peerIds)) {
                        throw \Illuminate\Validation\ValidationException::withMessages(['order' => 'Isi urutan bagian antara 1 dan '.count($peerIds).'.']);
                    }
                    $old = array_search($id, $peerIds, true);
                    if ($old !== $target) {
                        array_splice($peerIds, $old, 1);
                        array_splice($peerIds, $target, 0, [$id]);
                        $all = DB::table('DocumentItem')->where('section', 'profil-media')->whereNull('deletedAt')->orderBy('order')->orderBy('id')->get(['id', 'order']);
                        $cursor = 0;
                        foreach ($all as $index => $item) {
                            $nextId = in_array($item->id, $peerIds, true) ? $peerIds[$cursor++] : $item->id;
                            DB::table('DocumentItem')->where('id', $nextId)->update(['order' => $index, 'updatedAt' => now()]);
                        }
                    }
                    $data['order'] = DB::table('DocumentItem')->where('id', $id)->value('order');
                } else {
                    $orders = $peers->pluck('order')->map(fn ($order) => (int) $order)->all();
                    if (! in_array((int) $data['order'], $orders, true)) {
                        throw \Illuminate\Validation\ValidationException::withMessages(['order' => 'Urutan bagian harus antara 1 dan '.count($orders).' sesuai jumlah bagian dalam kelompok ini.']);
                    }
                    $position = CmsOrder::position('DocumentItem', $data, $document);
                }
            }
            if (! $reorder) {
                $data['order'] = $document->order;
            }
            $stamp = now()->format('Y-m-d H:i:s.v');
            DB::table('DocumentItem')->where('id', $id)->update([
                'name' => $data['name'], 'groupTitle' => $data['groupTitle'], 'published' => $data['published'],
                'order' => $data['order'], 'updatedAt' => $stamp,
            ]);
            DB::table('ProfileTableContent')->where('documentId', $id)->update([
                'content' => json_encode($data['content'], JSON_THROW_ON_ERROR), 'version' => $data['version'] + 1, 'updatedAt' => $stamp,
            ]);
            if ($reorder && ! isset($data['groupPosition'])) {
                CmsOrder::place('DocumentItem', (array) $document, $position);
            }
            $data['order'] = DB::table('DocumentItem')->where('id', $id)->value('order');
            $stamp = DB::table('DocumentItem')->where('id', $id)->value('updatedAt');
            Audit::record($request->user(), 'update', 'profile-tables', $id);

            unset($data['groupPosition']);

            return response()->json([...$data, 'id' => $id, 'version' => $data['version'] + 1,
                'documentUpdatedAt' => CarbonImmutable::parse($stamp, 'UTC')->format('Y-m-d\TH:i:s.v\Z')]);
        }, 5);
    }
}
