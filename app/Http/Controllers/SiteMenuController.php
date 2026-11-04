<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\FieldRules;
use App\Support\ManagedContent;
use App\Support\PageTemplates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SiteMenuController extends Controller
{
    private const MAX_ROOT_ITEMS = 20;

    private const MAX_CHILD_ITEMS = 30;

    public function edit(Request $request): Response
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $menu = DB::table('site_navigation')->where('id', 'main')->first();

        return Inertia::render('Admin/Menu', ['navigation' => ['items' => ManagedContent::decode($menu->draft), 'version' => (int) $menu->version, 'hasChanges' => ManagedContent::decode($menu->draft) != ManagedContent::decode($menu->published)], 'pages' => (new ManagedPageController)->listing(), 'limits' => ['roots' => self::MAX_ROOT_ITEMS, 'children' => self::MAX_CHILD_ITEMS]]);
    }

    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);

        return response()->json(['pages' => (new ManagedPageController)->listing(), 'templates' => PageTemplates::options(), 'menu' => DB::table('site_navigation')->where('id', 'main')->first(['draft', 'version'])])->header('Cache-Control', 'no-store');
    }

    public function attach(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        FieldRules::textTree($request->all());
        $data = $request->validate(['pageId' => 'required|uuid', 'version' => 'required|integer', 'parentId' => 'present|nullable|uuid', 'label' => 'required|string|max:60']);
        DB::transaction(function () use ($request, $data) {
            $menu = DB::table('site_navigation')->where('id', 'main')->lockForUpdate()->first();
            abort_if((int) $menu->version !== $data['version'], 409, 'Susunan menu sudah berubah. Tutup pilihan ini lalu buka lagi.');
            $page = DB::table('managed_pages')->where('id', $data['pageId'])->whereNull('deleted_at')->lockForUpdate()->first();
            abort_unless($page && $page->path !== '@global', 422, 'Halaman tujuan tidak tersedia.');
            $items = ManagedContent::decode($menu->draft);
            $entry = ['id' => (string) Str::uuid(), 'label' => $data['label'], 'pageId' => $page->id, 'href' => '', 'visible' => true, 'children' => []];
            $all = collect($items)->flatMap(fn ($item) => [$item, ...$item['children']]);
            abort_if($all->contains('pageId', $page->id), 422, 'Halaman sudah terhubung ke draf menu. Ubah posisinya melalui Menu & navigasi.');
            if (empty($data['parentId'])) {
                abort_if(count($items) >= self::MAX_ROOT_ITEMS, 422, 'Menu utama penuh. Pilih salah satu menu induk.');
                $items[] = $entry;
            } else {
                $index = array_search($data['parentId'], array_column($items, 'id'), true);
                abort_if($index === false, 422, 'Menu induk tidak tersedia.');
                abort_if(count($items[$index]['children']) >= self::MAX_CHILD_ITEMS, 422, 'Submenu penuh. Pilih induk lain.');
                $items[$index]['children'][] = $entry;
            }
            DB::table('site_navigation')->where('id', 'main')->update(['draft' => json_encode($items, JSON_THROW_ON_ERROR), 'version' => $menu->version + 1, 'updated_at' => now()]);
            Audit::record($request->user(), 'update', 'site-navigation', 'Tambah halaman '.$page->path);
        }, 5);

        return response()->json(['ok' => true]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        abort_if(strlen($request->getContent()) > 500000, 413);
        FieldRules::textTree($request->all());
        $data = $request->validate(['version' => 'required|integer', 'action' => 'required|in:save,publish,discard', 'items' => 'present|array|max:'.self::MAX_ROOT_ITEMS], ['items.max' => 'Maksimal '.self::MAX_ROOT_ITEMS.' menu utama, termasuk menu yang disembunyikan. Hapus menu yang tidak diperlukan atau gunakan submenu.']);
        $ids = [];
        $validate = function (array $items, int $depth = 0, bool $parentVisible = true) use (&$validate, &$ids, $data): array {
            if ($depth > 1 && $items) {
                throw ValidationException::withMessages(['items' => 'Menu hanya mempunyai satu tingkat submenu.']);
            }
            $result = [];
            foreach ($items as $item) {
                $item = validator($item, ['id' => 'required|uuid', 'label' => 'required|string|max:60', 'pageId' => 'present|nullable|uuid', 'href' => 'present|string|max:2000', 'visible' => 'required|boolean', 'children' => 'present|array|max:'.self::MAX_CHILD_ITEMS])->validate();
                if (in_array($item['id'], $ids, true) || ! ManagedContent::safeUrl($item['href']) || ($item['href'] && $item['pageId']) || str_starts_with($item['href'], '/')) {
                    throw ValidationException::withMessages(['items' => 'Menu duplikat atau tautan tidak valid.']);
                }
                $ids[] = $item['id'];
                if ($item['pageId']) {
                    $page = DB::table('managed_pages')->where('id', $item['pageId'])->first();
                    if (! $page || $page->path === '@global') {
                        throw ValidationException::withMessages(['items' => 'Halaman tujuan menu "'.$item['label'].'" tidak tersedia. Pilih halaman lain dari daftar tujuan.']);
                    }
                    if ($data['action'] === 'publish' && $parentVisible && $item['visible'] && $page->deleted_at !== null) {
                        throw ValidationException::withMessages(['items' => 'Halaman tujuan menu "'.$item['label'].'" berada di Sampah. Pulihkan dan terbitkan halaman, pilih tujuan lain, atau sembunyikan menu ini.']);
                    }
                    if ($data['action'] === 'publish' && $parentVisible && $item['visible'] && $page->published === null) {
                        throw ValidationException::withMessages(['items' => 'Menu "'.$item['label'].'" belum bisa diterbitkan karena halaman tujuannya masih draf. Simpan draf menu terlebih dahulu, isi dan terbitkan halaman tujuan, lalu terbitkan menu. Anda juga dapat menyembunyikan menu ini sementara.']);
                    }
                }
                $item['pageId'] ??= '';
                $item['children'] = $validate($item['children'], $depth + 1, $parentVisible && $item['visible']);
                if ($data['action'] === 'publish' && $parentVisible && $item['visible'] && ! $item['pageId'] && ! $item['href'] && ! $item['children']) {
                    throw ValidationException::withMessages(['items' => 'Pilih halaman tujuan atau tambahkan submenu untuk '.$item['label'].'.']);
                }
                $result[] = $item;
            }

            return $result;
        };
        $menu = DB::transaction(function () use ($request, $data, $validate) {
            $menu = DB::table('site_navigation')->where('id', 'main')->lockForUpdate()->first();
            abort_if((int) $menu->version !== (int) $data['version'], 409, 'Menu diubah pengguna lain. Muat ulang sebelum menyimpan.');
            $items = $data['action'] === 'discard' ? [] : $validate($data['items']);
            $json = $data['action'] === 'discard' ? $menu->published : json_encode($items, JSON_THROW_ON_ERROR);
            $changes = ['draft' => $json, 'version' => $menu->version + 1, 'updated_at' => now()];
            if ($data['action'] === 'publish') {
                $changes['published'] = $json;
            }
            DB::table('site_navigation')->where('id', 'main')->update($changes);
            Audit::record($request->user(), $data['action'], 'site-navigation', 'Menu utama');

            return ['items' => ManagedContent::decode($json), 'version' => $changes['version'], 'hasChanges' => ManagedContent::decode($json) != ManagedContent::decode($changes['published'] ?? $menu->published)];
        });

        return response()->json(['navigation' => $menu]);
    }
}
