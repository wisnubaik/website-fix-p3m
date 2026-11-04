<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class PageNavigation
{
    /** Remove only the target; retain its children as a non-clickable group. */
    public static function withoutPage(array $items, string $id): array
    {
        $result = [];
        foreach ($items as $item) {
            $item['children'] = self::withoutPage($item['children'] ?? [], $id);
            if (($item['pageId'] ?? '') === $id) {
                if ($item['children'] === []) {
                    continue;
                }
                $item['pageId'] = '';
                $item['href'] = '';
            }
            $result[] = $item;
        }

        return $result;
    }

    public static function remove(object $menu, string $id): void
    {
        $changes = [];
        foreach (['draft', 'published'] as $column) {
            $old = ManagedContent::decode($menu->$column) ?? [];
            $new = self::withoutPage($old, $id);
            if ($old !== $new) {
                $changes[$column] = json_encode($new, JSON_THROW_ON_ERROR);
            }
        }
        if ($changes !== []) {
            DB::table('site_navigation')->where('id', 'main')->update([...$changes, 'version' => $menu->version + 1, 'updated_at' => now()]);
        }
    }
}
