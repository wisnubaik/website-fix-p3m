<?php

namespace App\Support;

use App\Models\RisetEntry;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ResearchBulk
{
    public static function category(array $definition): string
    {
        $resource = $definition['resource'];
        $scope = $definition['scope'];
        $required = match ($resource) {
            'riset-entries' => ['category'],
            'documents', 'content-list' => ['section'],
            'monev-slot' => ['acara', 'periodeId', 'skemaId'],
            'hub-cards' => ['hub'], 'stat-entries' => ['group'], 'trend-stats' => ['metric'],
            'ki-karya', 'pbl', 'staff', 'riset-grup', 'announcements', 'kegiatan',
            'quick-access', 'winners', 'roadmap', 'clusters', 'tautan-pengusulan' => [],
            default => null,
        };
        abort_if($required === null, 422, 'Penggantian massal tidak tersedia untuk bagian ini.');
        foreach ($required as $key) {
            abort_if(empty($scope[$key]), 422, 'Pilih bagian tujuan sebelum mengganti data.');
        }
        if ($resource === 'documents' && in_array($scope['section'], ['monev', 'semhas'], true)) {
            abort_if(empty($scope['periodeId']) || empty($scope['skemaId']), 422, 'Pilih periode dan skema tujuan.');
        }
        abort_if($resource === 'content-list' && $scope['section'] === 'system-revisions', 422);
        if ($resource === 'riset-entries') {
            abort_unless(isset(RisetEntry::CATEGORIES[$scope['category']]), 422);
            if (count($scope) === 1) {
                return $scope['category'];
            }
        }
        if ($resource === 'ki-karya' && $scope === []) {
            return 'ki-karya';
        }
        ksort($scope);

        return 'scope:'.base64_encode(json_encode(['resource' => $resource, 'scope' => $scope]));
    }

    public static function key(string $category): string
    {
        return str_starts_with($category, 'scope:') ? 'scope:'.hash('sha256', $category) : $category;
    }

    private static function target(string $category): array
    {
        if (str_starts_with($category, 'scope:')) {
            $definition = json_decode(base64_decode(substr($category, 6)), true, flags: JSON_THROW_ON_ERROR);
            return [CmsContent::TABLES[$definition['resource']], $definition['scope']];
        }
        return $category === 'ki-karya' ? ['KiKarya', []] : ['RisetEntry', ['category' => $category]];
    }

    private static function query(string $category): Builder
    {
        [$table, $scope] = self::target($category);
        $query = DB::table($table);
        foreach ($scope as $key => $value) {
            $query->where($key, $value);
        }
        return $query;
    }

    public static function rows(string $category): array
    {
        return self::query($category)->whereNull('deletedAt')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
    }

    public static function label(string $category): string
    {
        if (! str_starts_with($category, 'scope:')) {
            return $category === 'ki-karya' ? 'Karya Kekayaan Intelektual, seluruh tahun' : RisetEntry::CATEGORIES[$category].', seluruh tahun';
        }
        [$table, $scope] = self::target($category);
        $parts = [];
        foreach ($scope as $key => $value) {
            $value = match ($key) {
                'periodeId' => DB::table('AcaraPeriode')->where('id', $value)->value('judul') ?? $value,
                'skemaId' => DB::table('AcaraSkema')->where('id', $value)->value('nama') ?? $value,
                default => $value,
            };
            $parts[] = (string) $value;
        }
        return $parts ? implode(' / ', $parts) : 'Seluruh daftar pada bagian ini';
    }

    public static function fingerprint(string $category): string
    {
        return hash('sha256', json_encode(self::rows($category)));
    }

    public static function defaults(string $category): array
    {
        [$table, $scope] = self::target($category);
        $tables = CmsReset::defaults()['tables'];
        return array_values(array_filter($tables[$table] ?? [], function ($row) use ($scope) {
            foreach ($scope as $key => $value) {
                if ((string) ($row[$key] ?? '') !== (string) $value) {
                    return false;
                }
            }
            return empty($row['deletedAt']);
        }));
    }

    public static function backup(string $category, string $adminId): void
    {
        DB::table('research_data_backups')->insert(['id' => (string) Str::uuid(), 'category' => self::key($category), 'admin_id' => $adminId, 'payload' => Crypt::encryptString(json_encode(self::rows($category))), 'created_at' => now()]);
    }

    public static function clear(string $category): void
    {
        self::query($category)->whereNull('deletedAt')->update(['deletedAt' => now(), 'updatedAt' => now()]);
    }

    public static function restore(string $category, array $rows): void
    {
        [$table, $scope] = self::target($category);
        foreach ($rows as $row) {
            foreach ($scope as $key => $value) {
                abort_unless((string) ($row[$key] ?? '') === (string) $value, 422);
            }
            $existing = DB::table($table)->where('id', $row['id'])->first();
            if ($existing) {
                foreach ($scope as $key => $value) {
                    abort_unless((string) ($existing->$key ?? '') === (string) $value, 409, 'Data telah dipindahkan ke bagian lain. Pemulihan dibatalkan.');
                }
            }
            $row['deletedAt'] = null;
            $row['updatedAt'] = now()->format('Y-m-d H:i:s.v');
            DB::table($table)->updateOrInsert(['id' => $row['id']], $row);
        }
        if (CmsOrder::enabled($table)) {
            $groups = [];
            foreach ($rows as $row) {
                $group = array_intersect_key($row, array_flip(CmsOrder::scopeFields($table)));
                $groups[json_encode($group)] = $group;
            }
            foreach ($groups as $group) {
                CmsOrder::normalize($table, $group);
            }
        }
    }
}
