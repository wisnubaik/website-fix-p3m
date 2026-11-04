<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class PublicLinks
{
    public static function options(): array
    {
        if (! ManagedContent::ready()) {
            return [];
        }

        return DB::table('managed_pages')->whereNull('deleted_at')->whereNotNull('published')
            ->where('path', '!=', '@global')->orderBy('path')->get(['path', 'published'])
            ->map(fn ($page) => ['href' => $page->path, 'label' => ManagedContent::decode($page->published)['title']])->all();
    }

    public static function pageExists(string $url): bool
    {
        return in_array($url, array_column(self::options(), 'href'), true);
    }

    public static function internalExists(string $url, bool $image = false): bool
    {
        $path = rawurldecode(parse_url($url, PHP_URL_PATH) ?: '');
        if ($path === '' || preg_match('~[\\\\\x00-\x20]|\.\.|^//|^/(admin|api)(/|$)~i', $path)) {
            return false;
        }
        if (! $image && self::pageExists($url)) {
            return true;
        }
        $extensions = $image ? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'] : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'pdf', 'docx', 'xlsx', 'pptx'];
        if (! in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), $extensions, true)) {
            return false;
        }
        if (str_starts_with($path, '/uploads/')) {
            return DB::table('UploadAsset')->where('name', substr($path, 9))->exists();
        }
        $file = realpath(public_path(ltrim($path, '/')));

        return $file && str_starts_with($file, realpath(public_path()).DIRECTORY_SEPARATOR) && is_file($file);
    }
}
