<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\FieldRules;
use App\Support\ManagedContent;
use App\Support\PageNavigation;
use App\Support\PageTemplates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ManagedPageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Pages/Index', ['pages' => $this->listing()]);
    }

    public function listing(): array
    {
        $catalog = ManagedContent::catalog();

        return DB::table('managed_pages')->orderBy('created_at')->get()->map(function ($page) use ($catalog) {
            $draft = ManagedContent::decode($page->draft);

            return ['id' => $page->id, 'path' => $page->path, 'title' => $draft['title'], 'builtin' => (bool) $page->builtin, 'template' => $page->template,
                'group' => $catalog['pages'][$page->path]['group'] ?? 'Halaman tambahan', 'published' => $page->published !== null,
                'archived' => $page->deleted_at !== null, 'hasChanges' => ManagedContent::decode($page->draft) != ManagedContent::decode($page->published), 'version' => $page->version, 'updatedAt' => $page->updated_at];
        })->all();
    }

    public function edit(string $id): Response
    {
        $page = DB::table('managed_pages')->where('id', $id)->whereNull('deleted_at')->first();
        abort_unless($page, 404);
        $catalog = ManagedContent::catalog();
        $definition = ManagedContent::definition($page->path);
        $draft = ManagedContent::decode($page->draft);
        if (preg_match('~^/(penelitian|pkm)/(internal|eksternal|unggulan)$~', $page->path)) {
            $definition['editorFieldLabels']['f_ce83cc4749d012']['hidden'] = true;
        }
        if ($page->path === '/profil') {
            $catalog['fields']['f_926563f356c80e']['hidden'] = true;
            $banner = ['f_f9e1416e79539f' => 'Gambar latar banner', 'f_8ca2f071d9f1c4' => 'Tujuan tautan beranda', 'f_8d31281b775ef7' => 'Teks tautan ke beranda'];
            foreach ($banner as $key => $label) {
                $catalog['fields'][$key]['group'] = 'Banner profil';
                $catalog['fields'][$key]['label'] = $label;
            }
            $hasAdditional = DB::table('DocumentItem as d')->join('ProfileTableContent as c', 'c.documentId', '=', 'd.id')
                ->where('d.section', 'profil-media')->whereNull('d.deletedAt')->get(['d.id', 'd.href', 'c.content'])
                ->contains(fn ($item) => ! preg_match('/^revision-profil-image-[1-9]$/', $item->id)
                    && ! preg_match('~/profil/profil-[1-9]\.png(?:[?#]|$)~', $item->href ?? '')
                    && count(json_decode($item->content, true)['tables'] ?? []) > 0);
            foreach (['x_a1f2e410fd7fcb', 'x_2387ae04a9e977'] as $key) {
                $catalog['fields'][$key]['hidden'] = ! $hasAdditional;
            }
        }
        $fields = collect($definition['fields'] ?? [])->map(fn ($key) => $catalog['fields'][$key])
            ->map(function ($field) use ($draft, $definition) {
                $field = array_replace($field, $definition['editorFieldLabels'][$field['key']] ?? []);
                if (isset($field['legacyField'], $draft['fields'][$field['legacyField']])) {
                    $field['default'] = ($field['legacyPrefix'] ?? '').$draft['fields'][$field['legacyField']];
                }

                return $field;
            })->reject(fn ($field) => $field['hidden'] ?? false)->values()->all();

        return Inertia::render('Admin/Pages/Edit', ['managedPage' => $this->payload($page),
            'fields' => $fields,
            'homeStatus' => $page->path === '/' ? ['submissionLinks' => DB::table('TautanPengusulan')->whereNull('deletedAt')->where('published', true)->count()] : null,
            'collections' => array_values(array_intersect_key($catalog['collections'] ?? [], array_flip($definition['collections'] ?? []))),
            'editors' => $definition['editors'] ?? [],
            'editorSections' => $definition['editorSections'] ?? [],
            'revisions' => DB::table('managed_page_revisions')->where('page_id', $id)->orderByDesc('id')->limit(20)->get(['id', 'created_at']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeEdit($request);
        abort_if(strlen($request->getContent()) > 2000000, 413, 'Isi terlalu panjang. Kurangi jumlah bagian atau baris.');
        FieldRules::textTree($request->all());
        $data = $request->validate(['title' => 'required|string|max:180', 'path' => 'required|string|max:190', 'template' => 'required|in:information,documents,news,service', 'sourceId' => 'sometimes|uuid', 'sourceVersion' => 'required_with:sourceId|integer|min:1']);
        $path = '/'.trim(strtolower($data['path']), '/');
        if (str_starts_with($data['path'], '//') || ! preg_match('~^/[a-z0-9]+(?:[/-][a-z0-9]+)*$~', $path)
            || preg_match('~^/(admin|api|uploads|storage|build|up|login|logout|register|password|sanctum|profil|logo)(/|$)~', $path)
            || DB::table('managed_pages')->where('path', $path)->exists()
            || is_dir(public_path(ltrim($path, '/'))) || is_file(public_path(ltrim($path, '/')))) {
            throw ValidationException::withMessages(['path' => 'Alamat sudah dipakai atau tidak tersedia. Gunakan huruf kecil, angka, dan tanda hubung.']);
        }
        $id = (string) Str::uuid();
        DB::transaction(function () use ($request, $id, $path, $data) {
            $template = $data['template'];
            $document = PageTemplates::document($template, $data['title']);
            if (! empty($data['sourceId'])) {
                $source = DB::table('managed_pages')->where('id', $data['sourceId'])->whereNull('deleted_at')->lockForUpdate()->first();
                abort_unless($source, 404);
                abort_if($source->builtin, 422, 'Duplikasi tersedia untuk halaman tambahan. Halaman bawaan memiliki data khusus yang dikelola terpisah.');
                abort_if((int) $source->version !== (int) $data['sourceVersion'], 409, 'Halaman sumber berubah. Muat ulang sebelum menduplikasi.');
                $document = ManagedContent::decode($source->draft);
                $document['title'] = $data['title'];
                foreach ($document['blocks'] as &$block) {
                    $block['id'] = (string) Str::uuid();
                }
                unset($block);
                $template = $source->template;
            }
            DB::table('managed_pages')->insert(['id' => $id, 'path' => $path, 'builtin' => false, 'template' => $template, 'draft' => json_encode($document, JSON_THROW_ON_ERROR), 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
            Audit::record($request->user(), empty($data['sourceId']) ? 'create' : 'duplicate', 'managed-pages', $path);
        }, 5);

        return response()->json(['id' => $id, 'page' => $this->payload(DB::table('managed_pages')->find($id))], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->authorizeEdit($request);
        abort_if(strlen($request->getContent()) > 2000000, 413, 'Isi terlalu panjang. Kurangi jumlah bagian atau baris.');
        $request->validate(['version' => 'required|integer|min:1', 'action' => 'required|in:save,publish,unpublish,discard,restore,delete,recover,purge', 'document' => 'sometimes|array', 'revisionId' => 'sometimes|integer', 'confirmPath' => 'required_if:action,purge|string|max:190']);
        $page = DB::transaction(function () use ($request, $id) {
            $menu = DB::table('site_navigation')->where('id', 'main')->lockForUpdate()->first();
            $query = DB::table('managed_pages')->where('id', $id);
            if (! in_array($request->input('action'), ['recover', 'purge'], true)) {
                $query->whereNull('deleted_at');
            }
            $page = $query->lockForUpdate()->first();
            abort_unless($page, 404);
            abort_if((int) $page->version !== $request->integer('version'), 409, 'Halaman diubah pengguna lain. Muat ulang sebelum menyimpan agar perubahan tidak tertimpa.');
            $action = $request->string('action')->toString();
            if ($action === 'purge') {
                abort_if($page->builtin || $page->deleted_at === null, 422, 'Hanya halaman tambahan di Sampah yang dapat dihapus permanen.');
                abort_unless($request->input('confirmPath') === $page->path, 422, 'Ketik alamat halaman dengan tepat untuk mengonfirmasi.');
                PageNavigation::remove($menu, $id);
                DB::table('managed_page_revisions')->where('page_id', $id)->delete();
                DB::table('managed_pages')->where('id', $id)->delete();
                Audit::record($request->user(), 'delete-permanent', 'managed-pages', $page->path);

                return null;
            }
            $changes = ['version' => $page->version + 1, 'updated_at' => now()];
            if (in_array($action, ['save', 'publish'], true)) {
                $document = ManagedContent::document($request->input('document', []), $page);
                $changes['draft'] = json_encode($document, JSON_THROW_ON_ERROR);
                if ($action === 'publish') {
                    $changes['published'] = $changes['draft'];
                    $changes['published_at'] = now();
                }
            } elseif ($action === 'recover') {
                abort_if($page->builtin || $page->deleted_at === null, 422);
                $changes['deleted_at'] = null;
            } elseif ($action === 'discard') {
                abort_if($page->published === null, 422, 'Belum ada versi terbit yang bisa dipulihkan.');
                $changes['draft'] = $page->published;
            } elseif ($action === 'restore') {
                $revision = DB::table('managed_page_revisions')->where('page_id', $id)->where('id', $request->integer('revisionId'))->first();
                abort_unless($revision, 404);
                $changes['draft'] = $revision->document;
            } elseif ($action === 'unpublish') {
                abort_if(in_array($page->path, ['/', '@global'], true), 422, 'Beranda dan identitas situs harus tetap diterbitkan.');
                $changes['published'] = null;
                $changes['published_at'] = null;
            } else {
                abort_if($page->builtin, 422, 'Halaman bawaan tidak dihapus. Gunakan Tarik dari publik jika tidak ingin ditampilkan.');
                $changes['deleted_at'] = now();
                $changes['published'] = null;
                $changes['published_at'] = null;
            }
            if (isset($changes['draft']) && ManagedContent::decode($changes['draft']) != ManagedContent::decode($page->draft)) {
                DB::table('managed_page_revisions')->insert(['page_id' => $id, 'document' => $page->draft, 'created_at' => now()]);
            }
            $keep = DB::table('managed_page_revisions')->where('page_id', $id)->orderByDesc('id')->limit(20)->pluck('id');
            DB::table('managed_page_revisions')->where('page_id', $id)->whereNotIn('id', $keep)->delete();
            DB::table('managed_pages')->where('id', $id)->update($changes);
            Audit::record($request->user(), $action, 'managed-pages', $page->path);

            return DB::table('managed_pages')->find($id);
        }, 5);

        if ($page === null) {
            return response()->json(['deleted' => true]);
        }

        return response()->json(['page' => $this->payload($page), 'revisions' => DB::table('managed_page_revisions')->where('page_id', $id)->orderByDesc('id')->limit(20)->get(['id', 'created_at'])]);
    }

    public function show(Request $request): Response
    {
        $page = ManagedContent::page($request->getPathInfo());
        abort_unless($page && ! $page->builtin, 404);
        $document = ManagedContent::decode($request->boolean('cms_preview') && ManagedContent::canPreview($request) ? $page->draft : $page->published);
        abort_unless($document, 404);

        return Inertia::render('Public/ManagedPage', ['pageDocument' => $document]);
    }

    private function authorizeEdit(Request $request): void
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403, 'Pengaturan halaman dan menu hanya dapat diubah superadmin.');
    }

    private function payload(object $page): array
    {
        return ['id' => $page->id, 'path' => $page->path, 'builtin' => (bool) $page->builtin, 'template' => $page->template,
            'document' => ManagedContent::decode($page->draft), 'published' => $page->published !== null, 'hasChanges' => ManagedContent::decode($page->draft) != ManagedContent::decode($page->published),
            'version' => (int) $page->version, 'updatedAt' => $page->updated_at];
    }
}
