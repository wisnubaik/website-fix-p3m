<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ManagedContent
{
    public static function catalog(): array
    {
        return json_decode(file_get_contents(database_path('managed-site-catalog.json')), true, 512, JSON_THROW_ON_ERROR);
    }

    public static function definition(string $path): array
    {
        $catalog = self::catalog();

        return $catalog['pages'][$path] ?? ['fields' => array_keys(array_filter($catalog['fields'], fn ($field) => $field['source'] === 'components/ui/PageHero.tsx')), 'collections' => [], 'editors' => []];
    }

    public static function ready(): bool
    {
        return Schema::hasTable('managed_pages');
    }

    public static function canPreview(Request $request): bool
    {
        $user = $request->user();

        return $user && $user->role === 'SUPERADMIN' && ! $user->mustChangePassword
            && AdminSessions::valid($request);
    }

    public static function decode(?string $json): ?array
    {
        return $json === null ? null : json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }

    public static function page(string $path): ?object
    {
        return self::ready() ? DB::table('managed_pages')->where('path', $path)->whereNull('deleted_at')->first() : null;
    }

    public static function shared(Request $request): ?array
    {
        if ($request->is('admin', 'admin/*', 'api/*') || ! self::ready()) {
            return null;
        }
        $preview = $request->boolean('cms_preview') && self::canPreview($request);
        $column = $preview ? 'draft' : 'published';
        $page = self::page($request->getPathInfo());
        $document = self::decode($page?->{$column});
        $global = self::decode(self::page('@global')?->{$column}) ?? [];
        $menu = DB::table('site_navigation')->where('id', 'main')->value($column);

        return ['fields' => (object) array_merge($global['fields'] ?? [], $document['fields'] ?? []),
            'collections' => (object) array_merge($global['collections'] ?? [], $document['collections'] ?? []),
            'document' => $document, 'pageId' => $page?->id, 'preview' => $preview,
            'menu' => self::publicMenu(self::decode($menu) ?? [], $preview)];
    }

    public static function publicMenu(array $items, bool $preview = false): array
    {
        $pages = DB::table('managed_pages')->whereNull('deleted_at')->get(['id', 'path', DB::raw('CASE WHEN published IS NULL THEN 0 ELSE 1 END as is_published')])->keyBy('id');
        $resolve = function (array $items) use (&$resolve, $pages, $preview): array {
            $result = [];
            foreach ($items as $item) {
                if (! ($item['visible'] ?? true)) {
                    continue;
                }
                $href = $item['href'] ?? '';
                if ($item['pageId'] ?? '') {
                    $page = $pages->get($item['pageId']);
                    $href = $page && ($preview || $page->is_published) ? $page->path : '';
                    if ($href && $preview) {
                        $href .= '?cms_preview=1';
                    }
                }
                $children = $resolve($item['children'] ?? []);
                if ($href || $children) {
                    $result[] = ['id' => $item['id'], 'label' => $item['label'], 'href' => $href, 'children' => $children];
                }
            }

            return $result;
        };

        return $resolve($items);
    }

    public static function safeUrl(string $url, bool $image = false): bool
    {
        if ($url === '') {
            return true;
        }
        if (preg_match('/[\x00-\x20\\\\]/', $url) || str_starts_with($url, '//') || preg_match('/%(?:0[ad]|5c)/i', $url)) {
            return false;
        }
        if (str_starts_with($url, '/')) {
            $path = rawurldecode(parse_url($url, PHP_URL_PATH) ?: '');
            if (! PublicLinks::internalExists($url, $image)) {
                return false;
            }
        } elseif (! preg_match($image ? '~^https://~i' : '~^(https?://|mailto:|tel:|#[a-zA-Z])~i', $url)) {
            return false;
        }

        return ! $image || (bool) preg_match('/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i', $url);
    }

    public static function document(array $data, object $page): array
    {
        FieldRules::textTree($data);
        $data = Validator::make($data, [
            'title' => 'required|string|max:180', 'description' => 'present|string|max:600',
            'fields' => 'present|array|max:1500', 'collections' => 'sometimes|array|max:100',
            'blocks' => 'present|array|max:60', 'placement' => 'required|in:before,after,replace',
            'blocks.*.id' => 'required|string|max:80|distinct', 'blocks.*.type' => 'required|in:text,image,links,cards,faq,table',
            'blocks.*.richText' => 'sometimes|array|max:200',
            'blocks.*.richText.*' => 'array:type,runs',
            'blocks.*.richText.*.type' => 'required|in:paragraph,bullet,number',
            'blocks.*.richText.*.runs' => 'present|array|max:300',
            'blocks.*.richText.*.runs.*' => 'array:text,bold,italic,url',
            'blocks.*.richText.*.runs.*.text' => 'present|string|max:15000',
            'blocks.*.richText.*.runs.*.bold' => 'sometimes|boolean',
            'blocks.*.richText.*.runs.*.italic' => 'sometimes|boolean',
            'blocks.*.richText.*.runs.*.url' => 'sometimes|string|max:2000',
            'blocks.*.title' => 'present|string|max:180', 'blocks.*.text' => 'present|string|max:15000',
            'blocks.*.url' => 'present|string|max:2000', 'blocks.*.alt' => 'present|string|max:300',
            'blocks.*.items' => 'present|array|max:100', 'blocks.*.items.*.title' => 'present|string|max:300',
            'blocks.*.items.*.text' => 'present|string|max:10000', 'blocks.*.items.*.url' => 'present|string|max:2000',
            'blocks.*.headers' => 'present|array|max:12', 'blocks.*.headers.*' => 'string|max:200',
            'blocks.*.rows' => 'present|array|max:150', 'blocks.*.rows.*' => 'array|max:12', 'blocks.*.rows.*.*' => 'string|max:2000',
        ])->validate();
        $catalog = self::catalog();
        $allowed = self::definition($page->path)['fields'] ?? [];
        foreach ($data['fields'] as $key => $value) {
            $field = $catalog['fields'][$key] ?? null;
            if (! in_array($key, $allowed, true) || ! is_string($value) || mb_strlen($value) > 15000 || ($field['type'] !== 'text' && ! self::safeUrl($value, $field['type'] === 'image'))) {
                throw ValidationException::withMessages(['fields' => 'Teks atau tautan tidak valid. Muat ulang editor dan periksa isian.']);
            }
            if (($field['internalOnly'] ?? false) && ! PublicLinks::pageExists($value)) {
                throw ValidationException::withMessages(['fields' => 'Pilih halaman tujuan yang sudah diterbitkan: '.$field['label']]);
            }
            if (($field['decoration'] ?? '') === 'arrow') {
                $data['fields'][$key] = trim(preg_replace('/[←→↗↘↙↖↑↓➜➔➝•●▪]/u', '', $value));
            }
        }
        $collections = [];
        foreach ($data['collections'] ?? [] as $key => $value) {
            $definition = $catalog['collections'][$key] ?? null;
            if (! $definition || ! in_array($key, $catalog['pages'][$page->path]['collections'] ?? [], true)) {
                throw ValidationException::withMessages(['collections' => 'Daftar konten tidak dikenal.']);
            }
            if ($key === 'footer_social' && is_array($value)) {
                foreach ($value as &$contact) {
                    if (! is_array($contact) || ! is_string($contact['href'] ?? null)) {
                        continue;
                    }
                    $href = trim($contact['href']);
                    $type = $contact['type'] ?? '';
                    if ($href !== '' && $type === 'email' && ! str_contains($href, ':')) {
                        $href = 'mailto:'.$href;
                    } elseif ($href !== '' && $type === 'phone') {
                        $number = preg_replace('/^tel:/i', '', $href);
                        if (preg_match('/^\+?[0-9() .-]+$/', $number)) {
                            $href = 'tel:'.preg_replace('/[^0-9+]/', '', $number);
                        }
                    } elseif ($type === 'instagram' && preg_match('/^@?[A-Za-z0-9_.]+$/', $href) && ! str_contains($href, '.com')) {
                        $href = 'https://instagram.com/'.ltrim($href, '@');
                    } elseif ($href !== '' && ! in_array($type, ['email', 'phone'], true) && ! str_contains($href, ':') && preg_match('~^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:/[^\s]*)?$~i', $href)) {
                        $href = 'https://'.$href;
                    }
                    $contact['href'] = $href;
                }
                unset($contact);
            }
            $collections[$key] = self::collection($value, $definition['default']);
            if ($key === 'footer_social') {
                $types = ['instagram', 'email', 'phone', 'whatsapp', 'youtube', 'facebook', 'linkedin', 'website'];
                if (count($value) > 8) {
                    throw ValidationException::withMessages(['collections' => 'Maksimal delapan tombol kontak footer.']);
                }
                foreach ($collections[$key] as $contactIndex => $item) {
                    if (! in_array($item['type'], $types, true)) {
                        throw ValidationException::withMessages(['collections' => 'Pilih jenis tombol kontak yang tersedia.']);
                    }
                    $href = $item['href'];
                    $valid = match ($item['type']) {
                        'email' => $href === '' || (str_starts_with($href, 'mailto:') && filter_var(substr($href, 7), FILTER_VALIDATE_EMAIL)),
                        'phone' => $href === '' || preg_match('/^tel:[+0-9()-]+$/', $href),
                        'instagram' => $href === '' || (filter_var($href, FILTER_VALIDATE_URL) && in_array(parse_url($href, PHP_URL_SCHEME), ['https', 'http'], true)),
                        default => filter_var($href, FILTER_VALIDATE_URL) && in_array(parse_url($href, PHP_URL_SCHEME), ['https', 'http'], true),
                    };
                    if (! $valid) {
                        throw ValidationException::withMessages(['collections' => 'Periksa tombol kontak nomor '.($contactIndex + 1).': isi email, nomor telepon, atau alamat website yang sesuai dengan jenis tombol.']);
                    }
                }
            }
        }
        foreach ($data['blocks'] as &$block) {
            if (isset($block['richText'])) {
                $plain = [];
                foreach ($block['richText'] as $paragraph) {
                    foreach ($paragraph['runs'] as $run) {
                        if (! empty($run['url']) && ! self::safeUrl($run['url'])) {
                            throw ValidationException::withMessages(['blocks' => 'Pilih tautan teks yang tersedia dan valid.']);
                        }
                    }
                    $plain[] = implode('', array_column($paragraph['runs'], 'text'));
                }
                $block['text'] = implode("\n", $plain);
                if (mb_strlen($block['text']) > 15000) {
                    throw ValidationException::withMessages(['blocks' => 'Isi teks maksimal 15.000 karakter per bagian.']);
                }
            }

            if (! self::safeUrl($block['url'], $block['type'] === 'image')) {
                throw ValidationException::withMessages(['blocks' => 'Alamat gambar atau dokumen tidak valid.']);
            }
            foreach ($block['items'] as &$item) {
                if (! self::safeUrl($item['url'])) {
                    throw ValidationException::withMessages(['blocks' => 'Tautan pada daftar tidak valid.']);
                }
                $item = array_intersect_key($item, array_flip(['title', 'text', 'url']));
            }
            unset($item);
            if ($block['type'] === 'table') {
                foreach ($block['rows'] as $rowIndex => $row) {
                    foreach ($row as $column => $value) {
                        FieldRules::check(FieldRules::labelPolicy($block['headers'][$column] ?? ''), $value, 'blocks.rows.'.$rowIndex.'.'.$column);
                    }
                }
            }
            $block = array_intersect_key($block, array_flip(['id', 'type', 'title', 'text', 'richText', 'url', 'alt', 'items', 'headers', 'rows']));
        }
        unset($block);

        if ($page->path === '/informasi/tkt') {
            $levels = $collections['collection_tkt_tingkat'] ?? $catalog['collections']['collection_tkt_tingkat']['default'];
            $stages = $collections['collection_tkt_tahap'] ?? $catalog['collections']['collection_tkt_tahap']['default'];
            $numbers = array_column($levels, 'tingkat');
            $invalid = count(array_unique($numbers)) !== count($numbers);
            foreach ($stages as $stage) {
                $invalid = $invalid || ! is_int($stage['dari']) || ! is_int($stage['sampai']) || $stage['dari'] < 1 || $stage['sampai'] > 9 || $stage['dari'] > $stage['sampai'];
            }
            foreach ($numbers as $number) {
                $matches = count(array_filter($stages, fn ($stage) => $number >= $stage['dari'] && $number <= $stage['sampai']));
                $invalid = $invalid || ! is_int($number) || $number < 1 || $number > 9 || $matches !== 1;
            }
            if ($invalid) {
                throw ValidationException::withMessages(['collections' => 'Gunakan nomor TKT 1 sampai 9 tanpa duplikat. Setiap tingkat harus masuk tepat satu rentang tahap agar tampil di website.']);
            }
        }

        return ['title' => $data['title'], 'description' => $data['description'], 'fields' => (object) $data['fields'], 'collections' => (object) $collections, 'blocks' => $data['blocks'], 'placement' => $data['placement']];
    }

    private static function collection(mixed $value, mixed $sample, string $key = ''): mixed
    {
        $fail = fn () => throw ValidationException::withMessages(['collections' => 'Periksa isian daftar: format atau tautannya tidak sesuai.']);
        if (is_array($sample)) {
            if (! is_array($value) || count($value) > 200) {
                $fail();
            }
            if (array_is_list($sample)) {
                if (! array_is_list($value)) {
                    $fail();
                }

                return array_map(fn ($entry) => self::collection($entry, $sample[0] ?? ''), $value);
            }
            if (array_diff(array_keys($value), array_keys($sample)) || array_diff(array_keys($sample), array_keys($value))) {
                $fail();
            }
            foreach ($sample as $name => $entry) {
                $value[$name] = self::collection($value[$name], $entry, $name);
            }

            return $value;
        }
        if (is_numeric($sample) && ! is_string($sample)) {
            if ((is_int($sample) && (! is_int($value) || $value < 0 || $value > 2147483647))
                || (! is_int($sample) && ((! is_int($value) && ! is_float($value)) || ! is_finite((float) $value) || abs((float) $value) > 1e12))) {
                $fail();
            }

            return $value + 0;
        }
        FieldRules::check(FieldRules::policy('collection', $key), $value, $key ?: 'collections');
        if (! is_string($value) || mb_strlen($value) > 15000 || (preg_match('/href|url|src/i', $key) && ! self::safeUrl($value, $key === 'src'))) {
            $fail();
        }
        if (($key === 'hex' || ($key === 'warna' && is_string($sample) && str_starts_with($sample, '#'))) && ! preg_match('/^#[0-9a-f]{3,8}$/i', $value)) {
            $fail();
        }

        return $value;
    }

    public static function referencesPublishedAsset(string $url): bool
    {
        if (! self::ready()) {
            return false;
        }
        foreach (DB::table('managed_pages')->whereNull('deleted_at')->whereNotNull('published')->pluck('published') as $json) {
            $found = false;
            $document = self::decode($json);
            array_walk_recursive($document, function ($value) use ($url, &$found) {
                $found = $found || $value === $url;
            });
            if ($found) {
                return true;
            }
        }

        return false;
    }
}
