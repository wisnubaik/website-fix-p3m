<?php

namespace Tests\Feature;

use App\Support\CmsOrder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EventMigrationTest extends TestCase
{
    public function test_upgrade_preserves_existing_rows_dates_publication_and_unrelated_documents(): void
    {
        $this->artisan('migrate:fresh', ['--path' => 'database/migrations/2026_10_06_084948_create_p3m_content_tables.php', '--force' => true])->assertSuccessful();
        try {
            $defaults = json_decode(file_get_contents(database_path('cms-default-content.json')), true)['tables'];
            foreach (['AcaraPeriode', 'MonevSlot', 'DocumentItem'] as $table) {
                foreach (array_chunk($defaults[$table], 40) as $rows) {
                    DB::table($table)->insert($rows);
                }
            }
            $slot = $defaults['MonevSlot'][0];
            $slot['id'] = 'custom-2027';
            $slot['tanggal'] = '2027-09-12';
            $slot['published'] = false;
            $slot['deletedAt'] = '2026-10-24 00:00:00';
            DB::table('MonevSlot')->insert($slot);
            $before = [];
            foreach (['AcaraPeriode', 'MonevSlot', 'DocumentItem'] as $table) {
                $before[$table] = DB::table($table)->orderBy('id')->get()->map(fn ($r) => (array) $r)->all();
            }
            $this->artisan('migrate', ['--path' => 'database/migrations/2026_10_24_111938_add_annual_event_periods_and_schemes.php', '--force' => true])->assertSuccessful();
            foreach (['MonevSlot', 'DocumentItem'] as $table) {
                $after = DB::table($table)->orderBy('id')->get()->keyBy('id');
                foreach ($before[$table] as $row) {
                    $actual = (array) $after[$row['id']];
                    $ignored = ['periodeId', 'skemaId'];
                    if ($actual['skemaId'] && empty($actual['deletedAt'])) {
                        $ignored[] = 'order';
                        $ignored[] = 'updatedAt';
                    }
                    $this->assertSame(array_diff_key($row, array_flip($ignored)), array_diff_key($actual, array_flip($ignored)));
                }
                $fields = CmsOrder::scopeFields($table);
                foreach ($after->whereNotNull('skemaId')->whereNull('deletedAt')->groupBy(fn ($row) => json_encode(array_intersect_key((array) $row, array_flip($fields)))) as $rows) {
                    $this->assertSame(range(0, $rows->count() - 1), $rows->sortBy('order')->pluck('order')->values()->all());
                }
            }
            foreach ($before['AcaraPeriode'] as $period) {
                $this->assertDatabaseHas('AcaraPeriode', $period);
            }
            $this->assertDatabaseHas('MonevSlot', ['id' => 'custom-2027', 'periodeId' => 'legacy-semhas-2027', 'published' => false]);
            $this->assertDatabaseHas('AcaraPeriode', ['id' => 'legacy-semhas-2027', 'tahun' => 2027, 'tanggalMulai' => '2027-09-12', 'published' => false]);
            $this->assertSame(0, DB::table('MonevSlot')->whereNull('skemaId')->count());
            $this->assertSame(0, DB::table('DocumentItem')->whereNotIn('section', ['monev', 'semhas'])->whereNotNull('skemaId')->count());
        } finally {
            $this->artisan('migrate:fresh', ['--force' => true])->assertSuccessful();
        }
    }
}
