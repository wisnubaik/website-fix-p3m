<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\AdminSessions;
use App\Support\CmsContent;
use App\Support\ManagedContent;
use App\Support\StaticSvg;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class UploadController extends Controller
{
    private const TYPES = [
        'svg' => 'image/svg+xml', 'jpg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp',
        'pdf' => 'application/pdf', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    public function store(Request $request): JsonResponse
    {
        $incoming = $request->file('file');
        if ($incoming instanceof UploadedFile && ! $incoming->isValid()) {
            $reason = match ($incoming->getError()) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Ukuran berkas melebihi batas unggahan server. Batas upload_max_filesize PHP saat ini: '.ini_get('upload_max_filesize').'. Kecilkan berkas atau minta pengelola menaikkan batas PHP.',
                UPLOAD_ERR_PARTIAL => 'Berkas hanya terkirim sebagian. Ulangi unggahan setelah koneksi stabil.',
                UPLOAD_ERR_NO_FILE => 'Belum ada berkas yang dipilih.',
                UPLOAD_ERR_NO_TMP_DIR => 'Folder sementara unggahan belum tersedia di server. Hubungi pengelola server.',
                UPLOAD_ERR_CANT_WRITE => 'Server tidak dapat menulis berkas sementara. Minta pengelola memeriksa ruang disk dan izin folder unggahan.',
                UPLOAD_ERR_EXTENSION => 'Unggahan dihentikan oleh ekstensi PHP di server. Hubungi pengelola server.',
                default => 'Berkas gagal diterima server. Coba unggah kembali.',
            };
            throw ValidationException::withMessages(['file' => $reason]);
        }
        $request->validate(['file' => 'required|file|max:10240', 'visibility' => 'sometimes|in:private,public'], [
            'file.required' => 'Pilih berkas yang ingin diunggah.',
            'file.file' => 'Berkas unggahan tidak valid. Pilih kembali berkas dari perangkat.',
            'file.uploaded' => 'Berkas gagal diterima server. Periksa batas unggahan PHP dan penyimpanan sementara server.',
            'file.max' => 'Ukuran berkas maksimal 10 MB. Pilih berkas yang lebih kecil.',
        ]);
        $file = $request->file('file');
        $path = $file->getRealPath();
        $svg = strtolower($file->getClientOriginalExtension()) === 'svg';
        if ($svg) {
            file_put_contents($path, StaticSvg::clean(file_get_contents($path)));
        }
        $head = file_get_contents($path, false, null, 0, 12);
        $ext = match (true) {
            $svg => 'svg',
            str_starts_with($head, "\xff\xd8\xff") => 'jpg',
            str_starts_with($head, "\x89PNG\r\n\x1a\n") => 'png',
            str_starts_with($head, 'GIF8') => 'gif',
            str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP' => 'webp',
            str_starts_with($head, '%PDF-') => 'pdf',
            str_starts_with($head, "PK\x03\x04") => strtolower($file->getClientOriginalExtension()),
            default => '',
        };
        if (! isset(self::TYPES[$ext]) ||
            (in_array($ext, ['jpg', 'png', 'gif', 'webp'], true) && ! @getimagesize($path)) ||
            (in_array($ext, ['docx', 'xlsx', 'pptx'], true) && ! $this->validOffice($path, $ext))) {
            throw ValidationException::withMessages(['file' => 'Struktur atau tipe berkas tidak valid.']);
        }
        $id = (string) Str::uuid();
        $name = $id.'.'.$ext;
        $visibility = $request->input('visibility', 'private');
        $directory = storage_path('app/private/uploads');
        if (! is_dir($directory)) {
            mkdir($directory, 0700, true);
        }
        try {
            DB::transaction(function () use ($request, $path, $id, $name, $visibility, $directory) {
                DB::table('UploadAsset')->insert([
                    'id' => $id, 'name' => $name, 'size' => strlen(file_get_contents($path)), 'sha256' => hash_file('sha256', $path),
                    'visibility' => $visibility, 'actorId' => $request->user()->id, 'createdAt' => now(),
                ]);
                abort_if(DB::table('UploadAsset')->sum('size') > (int) config('uploads.quota_bytes', 1073741824), 409, 'Kuota upload habis.');
                if (! copy($path, $directory.DIRECTORY_SEPARATOR.$name)) {
                    throw new \RuntimeException('Berkas gagal disimpan.');
                }
                Audit::record($request->user(), 'create', 'upload', $name);
            });
        } catch (\Throwable $error) {
            if (is_file($directory.DIRECTORY_SEPARATOR.$name)) {
                unlink($directory.DIRECTORY_SEPARATOR.$name);
            }
            throw $error;
        }

        return response()->json(['url' => '/uploads/'.$name, 'visibility' => $visibility], 201);
    }

    public function show(Request $request, string $name): BinaryFileResponse
    {
        $asset = DB::table('UploadAsset')->where('name', $name)->first();
        abort_unless($asset, 404);
        $public = $asset->visibility === 'public' && $this->published('/uploads/'.$name);
        $admin = $request->user();
        $authenticated = $admin && ! $admin->mustChangePassword && AdminSessions::valid($request);
        abort_unless($public || $authenticated, 404);
        $path = storage_path('app/private/uploads/'.$name);
        abort_unless(is_file($path), 404);
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        abort_unless(isset(self::TYPES[$ext]), 404);

        return response()->file($path, [
            'Content-Type' => self::TYPES[$ext], 'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
            ...($ext === 'svg' ? ['Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; sandbox"] : []),
            'Content-Disposition' => (in_array($ext, ['docx', 'xlsx', 'pptx'], true) ? 'attachment' : 'inline').'; filename="'.$name.'"',
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $request->validate(['page' => 'nullable|integer|min:1']);
        $assets = DB::table('UploadAsset')->orderByDesc('createdAt')->orderBy('id')->paginate(20);
        $used = [];
        $uncertain = false;
        $scan = function (string $text, string $kind) use (&$used, $assets): void {
            $text = str_replace('\\/', '/', $text);
            foreach ($assets->items() as $asset) {
                if (str_contains($text, '/uploads/'.$asset->name)) {
                    $used[$asset->id][$kind] = true;
                }
            }
        };
        foreach (array_unique([...array_values(CmsContent::TABLES), 'ProfileTableContent', 'ArchiveBlock', 'managed_pages', 'managed_page_revisions', 'site_navigation', 'cms_excel_imports']) as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach (DB::table($table)->cursor() as $row) {
                $scan(json_encode($row, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), 'content');
            }
        }
        foreach (['cms_reset_backups' => 'snapshot', 'research_data_backups' => 'payload'] as $table => $column) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach (DB::table($table)->select($column)->cursor() as $row) {
                try {
                    $scan(Crypt::decryptString($row->$column), 'backup');
                } catch (\Throwable $error) {
                    $uncertain = true;
                }
            }
        }
        return response()->json([
            'totalBytes' => (int) DB::table('UploadAsset')->sum('size'),
            'quotaBytes' => (int) config('uploads.quota_bytes', 1073741824),
            'total' => $assets->total(), 'page' => $assets->currentPage(), 'last' => $assets->lastPage(),
            'uncertain' => $uncertain,
            'files' => array_map(fn ($asset) => [
                'id' => $asset->id, 'name' => $asset->name, 'size' => $asset->size,
                'createdAt' => $asset->createdAt, 'visibility' => $asset->visibility,
                'missing' => ! is_file(storage_path('app/private/uploads/'.$asset->name)),
                'status' => isset($used[$asset->id]['content']) ? 'content' : (isset($used[$asset->id]['backup']) ? 'backup' : ($uncertain ? 'unknown' : 'candidate')),
            ], $assets->items()),
        ])->header('Cache-Control', 'private, no-store');
    }

    private function published(string $url): bool
    {
        if (DB::table('SiteSettings')->where('id', 'settings')->where('logoUrl', $url)->exists()) {
            return true;
        }
        foreach ([
            'DocumentItem' => ['href'], 'Announcement' => ['href'], 'RisetGrup' => ['roadmapHref', 'logoUrl'],
            'Staff' => ['photoUrl'], 'Kegiatan' => ['foto'], 'QuickAccessLink' => ['href'],
            'HubCard' => ['href'], 'TautanPengusulan' => ['href'],
        ] as $table => $fields) {
            foreach (DB::table($table)->whereNull('deletedAt')->where('published', true)->get($fields) as $row) {
                foreach ($fields as $field) {
                    if (in_array($url, array_map('trim', explode("\n", $row->$field ?? '')), true)) {
                        return true;
                    }
                }
            }
        }

        return ManagedContent::referencesPublishedAsset($url);
    }

    private function validOffice(string $path, string $ext): bool
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            return false;
        }
        try {
            $main = ['docx' => 'word/document.xml', 'xlsx' => 'xl/workbook.xml', 'pptx' => 'ppt/presentation.xml'][$ext];
            $roots = ['docx' => 'document', 'xlsx' => 'workbook', 'pptx' => 'presentation'];
            $seen = [];
            $total = 0;
            if ($zip->numFiles > 2000) {
                return false;
            }
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                $name = $stat['name'];
                $total += $stat['size'];
                if (isset($seen[$name]) || str_starts_with($name, '/') || str_contains($name, '\\')
                    || in_array('..', explode('/', $name), true) || preg_match('/vbaProject\.bin$/i', $name)
                    || ($stat['encryption_method'] ?? 0) !== 0 || $stat['size'] > 20 * 1024 * 1024 || $total > 50 * 1024 * 1024) {
                    return false;
                }
                $seen[$name] = true;
            }
            $xml = [];
            foreach (['[Content_Types].xml', '_rels/.rels', $main] as $entry) {
                $stat = $zip->statName($entry);
                if (! $stat || $stat['size'] > 2 * 1024 * 1024) {
                    return false;
                }
                $source = $zip->getFromName($entry);
                if (! $source || preg_match('/<!DOCTYPE|<!ENTITY/i', $source)) {
                    return false;
                }
                $doc = new \DOMDocument;
                if (! @$doc->loadXML($source, LIBXML_NONET)) {
                    return false;
                }
                $xml[$entry] = $doc;
            }
            $mime = ['docx' => 'wordprocessingml.document', 'xlsx' => 'spreadsheetml.sheet', 'pptx' => 'presentationml.presentation'][$ext];
            $type = false;
            foreach ($xml['[Content_Types].xml']->getElementsByTagName('Override') as $node) {
                $type = $type || ($node->getAttribute('PartName') === '/'.$main && $node->getAttribute('ContentType') === 'application/vnd.openxmlformats-officedocument.'.$mime.'.main+xml');
            }
            $relation = false;
            foreach ($xml['_rels/.rels']->getElementsByTagName('Relationship') as $node) {
                $relation = $relation || (ltrim($node->getAttribute('Target'), '/') === $main && $node->getAttribute('TargetMode') !== 'External');
            }

            return $type && $relation && $xml[$main]->documentElement->localName === $roots[$ext];
        } finally {
            $zip->close();
        }
    }
}
