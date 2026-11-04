<?php

namespace App\Support;

use App\Models\Admin;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CmsReset
{
    public static function defaults(): array
    {
        $defaults = json_decode(file_get_contents(database_path('cms-default-content.json')), true, flags: JSON_THROW_ON_ERROR);
        $defaults['tables'] = EventStructure::upgradeTables($defaults['tables']);
        $semhas = json_decode(file_get_contents(database_path('semhas-defaults.json')), true, flags: JSON_THROW_ON_ERROR);
        $period = collect($defaults['tables']['AcaraPeriode'])->first(fn ($row) => $row['acara'] === 'semhas' && (int) $row['tahun'] === 2026);
        if (! $period) {
            $period = $semhas['AcaraPeriode'][0];
            $defaults['tables']['AcaraPeriode'][] = $period;
        }
        foreach ($semhas['AcaraSkema'] as $scheme) {
            $scheme['periodeId'] = $period['id'];
            if (! collect($defaults['tables']['AcaraSkema'])->contains(fn ($row) => $row['periodeId'] === $period['id'] && $row['nama'] === $scheme['nama'])) {
                $defaults['tables']['AcaraSkema'][] = $scheme;
            }
        }

        $schedule = json_decode(file_get_contents(database_path('semhas-2026-schedule.json')), true, flags: JSON_THROW_ON_ERROR);
        $schemes = collect($defaults['tables']['AcaraSkema'])->where('periodeId', $period['id'])->keyBy('nama');
        foreach ($schedule as $row) {
            $row['periodeId'] = $period['id'];
            $row['skemaId'] = $schemes['Skema 1']['id'];
            $defaults['tables']['MonevSlot'][] = $row;
        }

        // Keep the same columns in each batch, including schedules from older years.
        foreach ($defaults['tables']['MonevSlot'] as &$row) {
            $row = ['tempat' => null, 'reviewer' => null, 'catatan' => null, ...$row];
        }
        unset($row);

        return $defaults;
    }

    /** Only public content belongs here. Accounts, internal archives, logs and files never do. */
    public static function scopes(string $scope, ?array $reference = null): array
    {
        if ($scope === 'all') {
            return array_fill_keys([...array_values(CmsContent::TABLES), 'ProfileTableContent'], []);
        }
        if ($scope === 'menu') {
            return [];
        }
        $page = self::scopePage($scope, $reference);
        if (! $page->builtin) {
            return [];
        }
        $path = $page->path;
        $map = match ($path) {
            '/' => ['HeroContent' => [], 'QuickAccessLink' => [], 'Winner' => [], 'StatEntry' => [], 'TautanPengusulan' => [], 'ContentListItem' => ['section' => ['marquee', 'home-agenda', 'home-rekap-catatan', 'home-riwayat']], 'DocumentItem' => ['section' => ['home-media', 'home-links', 'home-prodi']]],
            '/profil' => ['ContentListItem' => ['section' => ['profil-pengantar', 'profil-visi', 'profil-misi', 'profil-tujuan', 'profil-tupoksi', 'profil-ketua', 'profil-sekretaris']], 'FocusCluster' => [], 'RoadmapItem' => [], 'DocumentItem' => ['section' => ['profil-media']], 'ProfileTableContent' => ['section' => ['profil-media']]],
            '@global' => ['SiteSettings' => []],
            '/hubungi' => ['Staff' => []],
            '/riset-grup' => ['RisetGrup' => []],
            '/penelitian', '/pkm' => ['HubCard' => ['hub' => [ltrim($path, '/')]]],
            '/informasi/pengumuman' => ['Announcement' => []],
            '/informasi/kegiatan' => ['Kegiatan' => []],
            '/informasi/luaran' => ['PblProyek' => []],
            '/layanan/ki' => ['KiKarya' => []],
            '/layanan/asesmen' => ['AsesmenLapangan' => []],
            '/layanan/monev', '/layanan/semhas' => ['MonevSlot' => ['acara' => [basename($path)]], 'AcaraPeriode' => ['acara' => [basename($path)]], 'AcaraSkema' => ['acara' => [basename($path)]]],
            default => [],
        };
        if (preg_match('#^/(penelitian|pkm)/(internal|eksternal|unggulan)$#', $path)) {
            $category = str_replace('/', '-', ltrim($path, '/'));
            $map = ['RisetEntry' => ['category' => [$category]], 'TrendStat' => ['metric' => [$category]]];
        }
        if (str_starts_with($path, '/informasi/') || str_starts_with($path, '/layanan/') || $path === '/repository') {
            $map['DocumentItem'] = ['section' => [basename($path)]];
        }

        if (isset($map['DocumentItem']) && ! isset($map['ProfileTableContent'])) {
            $map['ProfileTableContent'] = $map['DocumentItem'];
        }

        return $map;
    }

    private static function scopePage(string $scope, ?array $reference = null): object
    {
        $page = DB::table('managed_pages')->where('id', $scope)->first();
        if (! $page && $reference && $reference['id'] === $scope) {
            $page = (object) $reference;
        }
        abort_unless($page, 404);

        return $page;
    }

    private static function query(string $table, array $filters): Builder
    {
        $query = DB::table($table);
        foreach ($filters as $key => $values) {
            if ($table === 'ProfileTableContent' && $key === 'section') {
                $query->whereIn('documentId', DB::table('DocumentItem')->whereIn('section', $values)->select('id'));
            } else {
                $query->whereIn($key, $values);
            }
        }
        if ($table === 'ContentListItem') {
            $query->where('section', '!=', 'system-revisions');
        }

        return $query;
    }

    public static function capture(string $scope, ?array $reference = null): array
    {
        $tables = [];
        foreach (self::scopes($scope, $reference) as $table => $filters) {
            $tables[$table] = self::query($table, $filters)->orderBy($table === 'ProfileTableContent' ? 'documentId' : 'id')->get()->map(fn ($row) => (array) $row)->all();
        }
        $pages = $scope === 'menu' ? [] : DB::table('managed_pages')->when($scope !== 'all', fn ($query) => $query->where('id', $scope))->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $menu = in_array($scope, ['all', 'menu'], true) ? (array) DB::table('site_navigation')->where('id', 'main')->first() : null;

        return ['format' => 1, 'scope' => $scope, 'scopePage' => in_array($scope, ['all', 'menu'], true) ? null : (array) self::scopePage($scope, $reference), 'tables' => $tables, 'pages' => $pages, 'menu' => $menu];
    }

    public static function fingerprint(array $snapshot): string
    {
        return hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR));
    }

    public static function label(string $scope, ?array $reference = null): string
    {
        if (in_array($scope, ['all', 'menu'], true)) {
            return $scope === 'all' ? 'Seluruh konten situs' : 'Menu & navigasi';
        }
        $page = self::scopePage($scope, $reference);

        return ManagedContent::decode($page->draft)['title'].' ('.$page->path.')';
    }

    public static function preview(string $scope, ?string $backupId = null): array
    {
        $backup = $backupId ? self::backup($backupId) : null;
        if ($backup) {
            $scope = $backup['scope'];
        }
        $current = self::capture($scope, $backup['scopePage'] ?? null);
        $rows = [];
        foreach ($current['tables'] as $table => $items) {
            $target = $backup['tables'][$table] ?? self::defaultRows($table, self::scopes($scope, $backup['scopePage'] ?? null)[$table]);
            $rows[] = ['label' => self::tableLabel($table), 'before' => count($items), 'after' => count($target)];
        }
        $page = $current['pages'][0] ?? null;

        return ['scope' => $scope, 'backupId' => $backupId, 'label' => self::label($scope, $backup['scopePage'] ?? null), 'fingerprint' => self::fingerprint($current),
            'baseline' => self::defaults()['version'], 'rows' => $rows, 'pages' => count($current['pages']),
            'customPages' => count(array_filter($current['pages'], fn ($row) => ! $row['builtin'] && ! $row['deleted_at'])),
            'customTemplate' => $scope !== 'all' && $page && ! $page['builtin'],
            'sharedContact' => ($page['path'] ?? '') === '/hubungi',
            'phrase' => $backup ? 'PULIHKAN' : ($scope === 'all' ? 'RESET SITUS' : 'RESET')];
    }

    private static function tableLabel(string $table): string
    {
        return ['HeroContent' => 'Banner beranda', 'SiteSettings' => 'Identitas dan kontak bersama', 'ContentListItem' => 'Daftar teks', 'QuickAccessLink' => 'Akses cepat', 'Winner' => 'Pemenang hibah', 'StatEntry' => 'Rekap statistik', 'TrendStat' => 'Data tren', 'TautanPengusulan' => 'Tautan pengusulan', 'HubCard' => 'Pilihan skema', 'RoadmapItem' => 'Roadmap', 'FocusCluster' => 'Klaster riset', 'DocumentItem' => 'Dokumen dan media', 'ProfileTableContent' => 'Isi bagan dan tabel terkait', 'RisetEntry' => 'Data penelitian dan pengabdian publik', 'RisetGrup' => 'Kelompok riset', 'Staff' => 'Tim P3M', 'Announcement' => 'Pengumuman', 'Kegiatan' => 'Kegiatan', 'PblProyek' => 'Proyek PBL', 'KiKarya' => 'Karya KI', 'MonevSlot' => 'Jadwal kegiatan', 'AcaraSkema' => 'Skema kegiatan', 'AcaraPeriode' => 'Periode kegiatan', 'AsesmenLapangan' => 'Asesmen lapangan'][$table];
    }

    private static function defaultRows(string $table, array $filters): array
    {
        return array_values(array_filter(self::defaults()['tables'][$table], function ($row) use ($filters, $table) {
            foreach ($filters as $key => $values) {
                if ($table === 'ProfileTableContent' && $key === 'section') {
                    $document = collect(self::defaults()['tables']['DocumentItem'])->firstWhere('id', $row['documentId']);
                    if (! in_array($document['section'], $values, true)) {
                        return false;
                    }

                    continue;
                }
                if (! in_array($row[$key], $values, true)) {
                    return false;
                }
            }

            return true;
        }));
    }

    public static function backup(string $id): array
    {
        $row = DB::table('cms_reset_backups')->where('id', $id)->first();
        abort_unless($row, 404);
        try {
            $data = json_decode(Crypt::decryptString($row->snapshot), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException $exception) {
            abort(422, 'Cadangan tidak dapat dibaca. Pastikan APP_KEY yang digunakan masih sama dan cadangan tidak rusak.');
        }
        abort_unless(($data['format'] ?? null) === 1 && $data['scope'] === $row->scope, 422, 'Format cadangan tidak cocok.');
        $expected = array_keys(self::scopes($data['scope'], $data['scopePage']));
        if (! array_key_exists('AcaraSkema', $data['tables']) && in_array('AcaraSkema', $expected, true) && array_keys($data['tables']) === array_values(array_diff($expected, ['AcaraSkema']))) {
            $upgraded = EventStructure::upgradeTables($data['tables']);
            $data['tables'] = array_replace(array_fill_keys($expected, []), $upgraded);
        }
        abort_unless(array_keys($data['tables']) === $expected, 422, 'Cakupan cadangan tidak cocok dengan versi aplikasi.');

        return $data;
    }

    /** The caller holds the shared CMS write lock inside the same transaction. */
    public static function execute(Admin $actor, string $scope, string $fingerprint, ?string $backupId = null): string
    {
        $restore = $backupId ? self::backup($backupId) : null;
        $scope = $restore['scope'] ?? $scope;
        $before = self::capture($scope, $restore['scopePage'] ?? null);
        abort_unless(hash_equals(self::fingerprint($before), $fingerprint), 409, 'Data berubah sejak ringkasan dibuka. Muat ulang dan periksa ringkasan baru.');
        $id = (string) Str::uuid();
        DB::table('cms_reset_backups')->insert(['id' => $id, 'scope' => $scope, 'label' => self::label($scope, $restore['scopePage'] ?? null), 'action' => $restore ? 'restore' : 'reset', 'actor' => $actor->email, 'snapshot' => Crypt::encryptString(json_encode($before, JSON_THROW_ON_ERROR)), 'created_at' => now()]);
        $targetTables = $restore['tables'] ?? [];
        if (! $restore) {
            foreach (self::scopes($scope) as $table => $filters) {
                $targetTables[$table] = self::defaultRows($table, $filters);
            }
        }
        self::replaceTables($scope, $targetTables, $before['tables'], $before['scopePage']);
        if ($restore) {
            self::restorePages($restore, $before);
        } else {
            self::resetPages($scope, $before['pages']);
        }
        DB::table('cms_excel_imports')->whereNull('result')->delete();
        DB::table('cms_reset_state')->where('id', 'content')->increment('generation');
        Audit::record($actor, $restore ? 'restore' : 'reset', 'cms-reset', self::label($scope, $before['scopePage']).'; cadangan sebelum tindakan: '.$id.($backupId ? '; sumber: '.$backupId : ''));

        return $id;
    }

    private static function replaceTables(string $scope, array $target, array $current, ?array $reference): void
    {
        $target = EventStructure::upgradeTables($target);
        $scopes = self::scopes($scope, $reference);
        $versions = collect($current['ProfileTableContent'] ?? [])->pluck('version', 'documentId')->all();
        foreach ($target as $table => $rows) {
            $key = $table === 'ProfileTableContent' ? 'documentId' : 'id';
            $outside = DB::table($table)->whereIn($key, array_column($rows, $key))->whereNotIn($key, array_column($current[$table], $key))->exists();
            abort_if($outside, 409, 'Sebagian data bawaan sudah dipindahkan ke halaman lain. Reset ini dibatalkan agar halaman lain tidak berubah. Periksa penempatan data terlebih dahulu.');
        }
        if (isset($scopes['ProfileTableContent'])) {
            self::query('ProfileTableContent', $scopes['ProfileTableContent'])->delete();
        }
        foreach ($scopes as $table => $filters) {
            if ($table !== 'ProfileTableContent') {
                self::query($table, $filters)->delete();
            }
        }
        foreach ($target as $table => $rows) {
            if ($table === 'ProfileTableContent') {
                continue;
            }
            foreach (array_chunk($rows, 50) as $chunk) {
                DB::table($table)->insert($chunk);
            }
        }
        foreach ($target['ProfileTableContent'] ?? [] as $row) {
            $row['version'] = max((int) $row['version'], (int) ($versions[$row['documentId']] ?? 0)) + 1;
            $row['updatedAt'] = now()->format('Y-m-d H:i:s.v');
            DB::table('ProfileTableContent')->insert($row);
        }
    }

    private static function resetPages(string $scope, array $pages): void
    {
        $defaults = self::defaults();
        foreach ($pages as $page) {
            if (! $page['builtin'] && $scope === 'all') {
                DB::table('managed_pages')->where('id', $page['id'])->update(['published' => null, 'published_at' => null, 'deleted_at' => $page['deleted_at'] ?? now(), 'version' => $page['version'] + 1, 'updated_at' => now()]);

                continue;
            }
            $document = $page['builtin'] ? $defaults['pages'][$page['path']] : PageTemplates::document($page['template'], ManagedContent::decode($page['draft'])['title']);
            $json = self::documentJson($document);
            DB::table('managed_pages')->where('id', $page['id'])->update(['draft' => $json, 'published' => $page['builtin'] ? $json : null, 'published_at' => $page['builtin'] ? now() : null, 'deleted_at' => null, 'version' => $page['version'] + 1, 'updated_at' => now()]);
        }
        if (in_array($scope, ['all', 'menu'], true)) {
            $ids = DB::table('managed_pages')->where('builtin', true)->pluck('id', 'path')->all();
            $build = function (array $items) use (&$build, $ids): array {
                return array_map(fn ($item) => ['id' => (string) Str::uuid(), 'label' => $item['label'], 'pageId' => $ids[$item['href'] ?? ''] ?? '', 'href' => isset($ids[$item['href'] ?? '']) ? '' : ($item['href'] ?? ''), 'visible' => true, 'children' => $build($item['children'] ?? [])], $items);
            };
            $menu = json_encode($build($defaults['menu']), JSON_THROW_ON_ERROR);
            DB::table('site_navigation')->where('id', 'main')->update(['draft' => $menu, 'published' => $menu, 'version' => DB::raw('version + 1'), 'updated_at' => now()]);
        }
    }

    private static function documentJson(array $document): string
    {
        $document['fields'] = (object) $document['fields'];
        $document['collections'] = (object) $document['collections'];

        return json_encode($document, JSON_THROW_ON_ERROR);
    }

    private static function restorePages(array $target, array $before): void
    {
        $versions = collect($before['pages'])->pluck('version', 'id')->all();
        if ($target['scope'] === 'all') {
            DB::table('managed_pages')->whereNotIn('id', array_column($target['pages'], 'id'))->where('builtin', false)->update(['published' => null, 'published_at' => null, 'deleted_at' => now(), 'version' => DB::raw('version + 1'), 'updated_at' => now()]);
        }
        if (! in_array($target['scope'], ['all', 'menu'], true) && $target['pages'] === []) {
            DB::table('managed_pages')->where('id', $target['scope'])->where('builtin', false)->update(['published' => null, 'published_at' => null, 'deleted_at' => now(), 'version' => DB::raw('version + 1'), 'updated_at' => now()]);
        }
        foreach ($target['pages'] as $page) {
            abort_if(DB::table('managed_pages')->where('path', $page['path'])->where('id', '!=', $page['id'])->exists(), 409, 'Alamat halaman dalam cadangan sudah digunakan halaman lain. Pemulihan dibatalkan tanpa mengubah data.');
            $page['version'] = max((int) $page['version'], (int) ($versions[$page['id']] ?? 0)) + 1;
            $page['updated_at'] = now();
            DB::table('managed_pages')->updateOrInsert(['id' => $page['id']], $page);
        }
        if ($target['menu']) {
            $menu = $target['menu'];
            $menu['version'] = max($menu['version'], $before['menu']['version']) + 1;
            $menu['updated_at'] = now();
            DB::table('site_navigation')->where('id', 'main')->update($menu);
        }
    }
}
