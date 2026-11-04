<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SemhasSchemeMergeTest extends TestCase
{
    use RefreshDatabase;

    public function test_merging_default_schemes_preserves_rows_and_custom_schemes(): void
    {
        $defaults = json_decode(file_get_contents(database_path('semhas-defaults.json')), true);
        $period = DB::table('AcaraPeriode')->where('acara', 'semhas')->where('tahun', 2026)->whereNull('deletedAt')->first();
        if (! $period) {
            DB::table('AcaraPeriode')->insert($defaults['AcaraPeriode'][0]);
            $period = DB::table('AcaraPeriode')->where('id', $defaults['AcaraPeriode'][0]['id'])->first();
        }
        $scheme = $defaults['AcaraSkema'][0];
        foreach (['old-research' => 'Penelitian', 'old-pkm' => 'Pengabdian kepada Masyarakat', 'custom' => 'Skema khusus'] as $id => $name) {
            DB::table('AcaraSkema')->insert([...$scheme, 'id' => $id, 'periodeId' => $period->id, 'nama' => $name, 'published' => $id !== 'old-pkm']);
        }
        $row = json_decode(file_get_contents(database_path('semhas-2026-schedule.json')), true)[0];
        foreach (['old-research', 'old-pkm', 'custom'] as $id) {
            DB::table('MonevSlot')->insert([...$row, 'id' => 'row-'.$id, 'periodeId' => $period->id, 'skemaId' => $id]);
        }
        $count = DB::table('MonevSlot')->count();
        $migration = require database_path('migrations/2026_10_28_030000_merge_default_semhas_2026_schemes.php');
        $migration->up();
        $migration->up();
        $target = DB::table('AcaraSkema')->where('periodeId', $period->id)->where('nama', 'Skema 1')->whereNull('deletedAt')->first();
        $this->assertNotNull($target);
        $this->assertSame($count, DB::table('MonevSlot')->count());
        $this->assertDatabaseHas('MonevSlot', ['id' => 'row-old-research', 'skemaId' => $target->id]);
        $this->assertDatabaseHas('MonevSlot', ['id' => 'row-old-pkm', 'skemaId' => $target->id, 'published' => false]);
        $this->assertDatabaseHas('MonevSlot', ['id' => 'row-custom', 'skemaId' => 'custom']);
        $this->assertDatabaseHas('AcaraSkema', ['id' => 'custom', 'deletedAt' => null]);
    }
}
