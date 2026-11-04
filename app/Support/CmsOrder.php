<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CmsOrder
{
    public static function enabled(string $table): bool
    {
        return in_array('order', array_column(CmsContent::fields($table), 'name'), true);
    }

    /** Each scope is one independently ordered list in the public page. */
    public static function scopeFields(string $table): array
    {
        return match ($table) {
            'ContentListItem' => ['section'],
            'DocumentItem' => ['section', 'periodeId', 'skemaId'],
            'AcaraSkema' => ['acara', 'periodeId'],
            'HubCard' => ['hub'],
            'StatEntry' => ['group'],
            'RisetEntry' => ['category', 'year'],
            'MonevSlot' => ['acara', 'periodeId', 'skemaId', 'jurusan', 'sesi'],
            'KiKarya' => ['tahun'],
            default => [],
        };
    }

    public static function sameScope(string $table, array $a, array $b): bool
    {
        foreach (self::scopeFields($table) as $field) {
            if (($a[$field] ?? null) !== ($b[$field] ?? null)) {
                return false;
            }
        }

        return true;
    }

    /** Called first inside each write transaction, including inserts into empty lists. */
    public static function lock(string $table): void
    {
        if (self::enabled($table)) {
            DB::table($table)->orderBy('id')->lockForUpdate()->get(['id']);
        }
    }

    private static function query(string $table, array $scope): Builder
    {
        $query = DB::table($table)->whereNull('deletedAt');
        foreach (self::scopeFields($table) as $field) {
            $query->where($field, $scope[$field] ?? null);
        }

        return $query->orderBy('order')->orderBy('id');
    }

    /** Keep the actual position on content-only edits; append new items by default. */
    public static function position(string $table, array $data, ?object $existing): ?int
    {
        if (array_key_exists('order', $data) && (! $existing || (int) $data['order'] !== (int) $existing->order)) {
            $scope = [...($existing ? (array) $existing : []), ...$data];
            $maximum = self::query($table, $scope)->when($existing, fn ($query) => $query->where('id', '!=', $existing->id))->count();
            if (! is_numeric($data['order']) || (int) $data['order'] < 0 || (int) $data['order'] > $maximum) {
                throw ValidationException::withMessages(['order' => 'Urutan harus antara 1 dan '.($maximum + 1).' sesuai jumlah data pada bagian ini.']);
            }
            return (int) $data['order'];
        }
        if ($existing && self::sameScope($table, (array) $existing, [...(array) $existing, ...$data])) {
            $ids = self::query($table, (array) $existing)->pluck('id')->all();
            $index = array_search($existing->id, $ids, true);

            return $index === false ? null : $index;
        }

        return null;
    }

    public static function place(string $table, array $row, ?int $position): void
    {
        $ids = self::query($table, $row)->where('id', '!=', $row['id'])->pluck('id')->all();
        array_splice($ids, min(max(0, $position ?? count($ids)), count($ids)), 0, [$row['id']]);
        self::write($table, $ids);
    }

    public static function normalize(string $table, array $scope): void
    {
        self::write($table, self::query($table, $scope)->pluck('id')->all());
    }

    public static function swap(string $table, array $a, array $b): void
    {
        $ids = self::query($table, $a)->pluck('id')->all();
        $first = array_search($a['id'], $ids, true);
        $second = array_search($b['id'], $ids, true);
        abort_if($first === false || $second === false, 404);
        [$ids[$first], $ids[$second]] = [$ids[$second], $ids[$first]];
        self::write($table, $ids);
    }

    private static function write(string $table, array $ids): void
    {
        $hasTimestamp = in_array('updatedAt', array_column(CmsContent::fields($table), 'name'), true);
        foreach ($ids as $order => $id) {
            DB::table($table)->where('id', $id)->where('order', '!=', $order)
                ->update(['order' => $order, ...($hasTimestamp ? ['updatedAt' => now()->format('Y-m-d H:i:s.v')] : [])]);
        }
    }
}
