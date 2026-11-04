<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SintaScopeRevisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_split_preserves_admin_values_and_is_idempotent(): void
    {
        $rows = [['skema' => 'Pemberdayaan Berbasis Kewirausahaan', 'lingkup' => 'Tiga ruang lingkup', 'jabatan' => 'Lektor', 'saintek' => '77', 'soshum' => '33'], ['skema' => 'Pemberdayaan Berbasis Wilayah', 'lingkup' => 'Pemberdayaan Wilayah dan Desa Binaan', 'jabatan' => 'Lektor', 'saintek' => '50', 'soshum' => '25'], ['skema' => 'Kustom', 'lingkup' => 'Pilihan admin', 'jabatan' => 'Lektor', 'saintek' => '99', 'soshum' => '88']];
        $doc = json_encode(['fields' => ['custom' => 'Tetap'], 'collections' => ['collection_sinta_ambang' => $rows]]);
        DB::table('managed_pages')->where('path', '/informasi/sinta')->update(['draft' => $doc, 'published' => $doc]);
        $migration = require database_path('migrations/2026_10_26_072822_split_sinta_grant_scopes.php');
        $migration->up();
        $migration->up();
        $page = DB::table('managed_pages')->where('path', '/informasi/sinta')->first();
        foreach (['draft', 'published'] as $column) {
            $data = json_decode($page->{$column}, true);
            $items = $data['collections']['collection_sinta_ambang'];
            $this->assertCount(6, $items);
            $this->assertSame(['77', '77', '77', '50', '50', '99'], array_column($items, 'saintek'));
            $this->assertSame('Tetap', $data['fields']['custom']);
            $this->assertSame('Pilihan admin', $items[5]['lingkup']);
        }
    }
}
