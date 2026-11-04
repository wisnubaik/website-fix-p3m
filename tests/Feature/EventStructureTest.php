<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\CmsExcel;
use App\Support\CmsReset;
use App\Support\EventStructure;
use App\Support\ExcelWorkbook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;
use ZipArchive;

class EventStructureTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $this->admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($this->admin)->withSession(['admin_version' => $this->admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
    }

    private function period(string $event, int $year): array
    {
        return $this->postJson('/api/admin/acara-periode', ['acara' => $event, 'tahun' => $year, 'judul' => ucfirst($event).' '.$year,
            'tanggalMulai' => $year.'-08-01', 'tanggalSelesai' => $year.'-08-31', 'timeline' => json_encode([['judul' => 'Paparan', 'tanggalMulai' => $year.'-08-18', 'tanggalSelesai' => '']]), 'published' => true])->assertCreated()->json();
    }

    private function scheme(array $period, string $name = 'Skema 1'): array
    {
        return $this->postJson('/api/admin/acara-skema', ['acara' => $period['acara'], 'periodeId' => $period['id'], 'nama' => $name, 'published' => true])->assertCreated()->json();
    }

    private function slot(array $period, array $scheme, string $name = 'Pemakalah'): array
    {
        return ['acara' => $period['acara'], 'periodeId' => $period['id'], 'skemaId' => $scheme['id'], 'jurusan' => 'teknik', 'sesi' => 'penelitian', 'tanggal' => $period['tahun'].'-08-18', 'mulai' => '08:00', 'selesai' => '08:20', 'nama' => $name, 'prodi' => 'TI', 'published' => true];
    }

    public function test_confirmed_scheme_migration_preserves_custom_names_and_other_events(): void
    {
        $period = $this->period('monev', 2026);
        $legacy = $this->scheme($period, 'Data lama (belum dipilah)');
        $custom = $this->scheme($period, 'Pilihan admin');
        $semhas = $this->scheme($this->period('semhas', 2026), 'Data lama (belum dipilah)');
        $migration = require database_path('migrations/2026_10_25_231155_name_confirmed_monev_2026_scheme.php');
        $migration->up();
        $migration->up();
        $this->assertDatabaseHas('AcaraSkema', ['id' => $legacy['id'], 'nama' => 'Kompetitif Internal (DIPA)']);
        $this->assertDatabaseHas('AcaraSkema', ['id' => $custom['id'], 'nama' => 'Pilihan admin']);
        $this->assertDatabaseHas('AcaraSkema', ['id' => $semhas['id'], 'nama' => 'Data lama (belum dipilah)']);
    }

    public function test_parallel_pdf_is_separate_scoped_and_hidden_when_unpublished(): void
    {
        foreach (['monev', 'semhas'] as $event) {
            $period = $this->period($event, 2026);
            $scheme = $this->scheme($period);
            $body = ['section' => $event, 'periodeId' => $period['id'], 'skemaId' => $scheme['id'], 'year' => '2026', 'category' => 'Jadwal paralel', 'groupTitle' => 'Teknik', 'kind' => 'pdf', 'name' => 'Jadwal paralel Teknik', 'href' => 'https://example.com/jadwal.pdf', 'published' => true];
            $record = $this->postJson('/api/admin/documents', $body)->assertCreated()->json();
            $data = EventStructure::publicData($event);
            $schemeData = collect($data)->first()['schemes'][0];
            $this->assertCount(1, $schemeData['parallelDocuments']);
            $this->assertCount(0, $schemeData['sections']);
            $this->assertDatabaseCount('MonevSlot', 0);
            $this->putJson('/api/admin/documents/'.$record['id'], ['published' => false])->assertOk();
            $this->assertCount(0, collect(EventStructure::publicData($event))->first()['schemes'][0]['parallelDocuments']);
            $this->postJson('/api/admin/documents', [...$body, 'href' => 'https://example.com/file.xlsx'])->assertUnprocessable();
        }
    }

    public function test_period_scheme_schedule_and_documents_stay_separate_for_both_events(): void
    {
        foreach (['monev', 'semhas'] as $event) {
            $a = $this->period($event, 2026);
            $b = $this->period($event, 2027);
            $sa = $this->scheme($a);
            $sb = $this->scheme($b);
            $this->postJson('/api/admin/monev-slot', $this->slot($a, $sa, 'Andi Saputra'))->assertCreated();
            $this->postJson('/api/admin/monev-slot', $this->slot($b, $sb, 'Budi Santoso'))->assertCreated();
            $this->postJson('/api/admin/documents', ['section' => $event, 'periodeId' => $a['id'], 'skemaId' => $sa['id'], 'category' => 'Dokumen skema', 'groupTitle' => 'Panduan', 'name' => 'Dokumen 2026', 'kind' => 'link', 'href' => 'https://example.org', 'published' => true])->assertCreated();
            $this->getJson('/api/admin/monev-slot?periodeId='.$a['id'].'&skemaId='.$sa['id'])->assertJsonCount(1)->assertJsonPath('0.nama', 'Andi Saputra');
            $this->get('/layanan/'.$event)->assertInertia(fn (Assert $page) => $page->has('eventPeriods', 2)->where('eventPeriods.0.tahun', 2027)->where('eventPeriods.1.schemes.0.schedule.0.penelitian.0.nama', 'Andi Saputra')->where('eventPeriods.1.schemes.0.sections.0.items.0.name', 'Dokumen 2026'));
            $this->putJson('/api/admin/acara-skema/'.$sa['id'], ['published' => false])->assertOk();
            $this->get('/layanan/'.$event)->assertInertia(fn (Assert $page) => $page->has('eventPeriods.1.schemes', 0));
            $this->putJson('/api/admin/acara-skema/'.$sa['id'], ['published' => true])->assertOk();
            $this->putJson('/api/admin/acara-periode/'.$a['id'], ['published' => false])->assertOk();
            $this->get('/layanan/'.$event)->assertInertia(fn (Assert $page) => $page->has('eventPeriods', 1)->where('eventPeriods.0.tahun', 2027));
        }
    }

    public function test_invalid_parent_year_timeline_and_duplicate_periods_are_rejected(): void
    {
        $a = $this->period('monev', 2026);
        $b = $this->period('semhas', 2026);
        $sa = $this->scheme($a);
        $sb = $this->scheme($b);
        $this->postJson('/api/admin/acara-periode', ['acara' => 'monev', 'tahun' => 2026, 'judul' => 'Duplikat', 'tanggalMulai' => '2026-01-01'])->assertUnprocessable()->assertJsonValidationErrors('tahun');
        $this->postJson('/api/admin/acara-skema', ['acara' => 'semhas', 'periodeId' => $a['id'], 'nama' => 'Salah acara'])->assertUnprocessable()->assertJsonValidationErrors('periodeId');
        $this->postJson('/api/admin/monev-slot', $this->slot($a, $sb))->assertUnprocessable()->assertJsonValidationErrors('skemaId');
        $this->postJson('/api/admin/monev-slot', [...$this->slot($a, $sa), 'tanggal' => '2027-08-18'])->assertUnprocessable()->assertJsonValidationErrors('tanggal');
        $this->postJson('/api/admin/monev-slot', array_diff_key($this->slot($a, $sa), array_flip(['periodeId', 'skemaId'])))->assertUnprocessable();
        $this->putJson('/api/admin/acara-periode/'.$a['id'], ['timeline' => json_encode([['judul' => 'Salah', 'tanggalMulai' => '2026-08-20', 'tanggalSelesai' => '2026-08-19']])])->assertUnprocessable();
        $this->putJson('/api/admin/acara-periode/'.$a['id'], ['tahun' => 2027])->assertUnprocessable();
        $this->assertDatabaseCount('MonevSlot', 0);
    }

    public function test_delete_restore_and_permissions_preserve_children_and_audit(): void
    {
        $a = $this->period('monev', 2026);
        $sa = $this->scheme($a);
        $this->deleteJson('/api/admin/acara-periode/'.$a['id'])->assertUnprocessable();
        $row = $this->postJson('/api/admin/monev-slot', $this->slot($a, $sa))->assertCreated()->json();
        $this->deleteJson('/api/admin/acara-skema/'.$sa['id'])->assertUnprocessable();
        $this->deleteJson('/api/admin/monev-slot/'.$row['id'])->assertOk();
        $this->deleteJson('/api/admin/acara-skema/'.$sa['id'])->assertUnprocessable();
        $this->deleteJson('/api/admin/monev-slot/'.$row['id'].'?permanent=1')->assertOk();
        $this->deleteJson('/api/admin/acara-skema/'.$sa['id'])->assertOk();
        $this->patchJson('/api/admin/acara-skema/'.$sa['id'])->assertOk();
        $this->deleteJson('/api/admin/acara-skema/'.$sa['id'])->assertOk();
        $this->admin->update(['role' => 'ADMIN']);
        $this->deleteJson('/api/admin/acara-skema/'.$sa['id'].'?permanent=1')->assertForbidden();
        $this->admin->update(['role' => 'SUPERADMIN']);
        $this->deleteJson('/api/admin/acara-skema/'.$sa['id'].'?permanent=1')->assertOk();
        $this->deleteJson('/api/admin/acara-periode/'.$a['id'])->assertOk();
        $this->patchJson('/api/admin/acara-periode/'.$a['id'])->assertOk();
        $this->assertTrue(DB::table('ActivityLog')->where('resource', 'acara-periode')->where('action', 'restore')->exists());
    }

    public function test_excel_template_is_bound_to_period_and_scheme_and_commit_retains_scope(): void
    {
        $period = $this->period('monev', 2026);
        $scheme = $this->scheme($period);
        $other = $this->scheme($period, 'Skema 2');
        $scope = ['acara' => 'monev', 'periodeId' => $period['id'], 'skemaId' => $scheme['id'], 'jurusan' => 'teknik', 'sesi' => 'penelitian'];
        $config = ['scope' => $scope];
        $definition = CmsExcel::definition($this->admin, 'monev-slot', $config);
        $path = ExcelWorkbook::template(CmsExcel::signature($definition), $definition['columns'], 'Jadwal');
        try {
            $zip = new ZipArchive;
            $zip->open($path);
            $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
            $values = $this->slot($period, $scheme, 'Dari Excel');
            $values['published'] = 'Ya';
            $row = '<row r="2">';
            foreach (array_keys($definition['columns']) as $index => $key) {
                $row .= '<c r="'.chr(65 + $index).'2" t="inlineStr"><is><t>'.htmlspecialchars((string) ($values[$key] ?? ''), ENT_XML1).'</t></is></c>';
            }
            $zip->addFromString('xl/worksheets/sheet1.xml', str_replace('</sheetData>', $row.'</row></sheetData>', $xml));
            $zip->close();
            $file = fn () => new UploadedFile($path, 'jadwal.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
            $this->post('/api/admin/excel/monev-slot/preview', ['file' => $file(), 'config' => json_encode(['scope' => [...$scope, 'skemaId' => $other['id']]])], ['Accept' => 'application/json'])->assertUnprocessable();
            $preview = $this->post('/api/admin/excel/monev-slot/preview', ['file' => $file(), 'config' => json_encode($config)], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('errorCount', 0);
            $this->postJson('/api/admin/excel/monev-slot/commit', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 1);
            $this->assertDatabaseHas('MonevSlot', [...$scope, 'nama' => 'Dari Excel', 'order' => 0]);
            $this->postJson('/api/admin/excel/monev-slot/template', ['config' => []])->assertUnprocessable();
        } finally {
            @unlink($path);
        }
    }

    public function test_legacy_data_conversion_is_idempotent_preserves_rows_and_uses_the_actual_year(): void
    {
        $old = json_decode(file_get_contents(database_path('cms-default-content.json')), true)['tables'];
        $new = EventStructure::upgradeTables($old);
        $this->assertEquals($new, EventStructure::upgradeTables($new));
        foreach (['MonevSlot', 'DocumentItem'] as $table) {
            $this->assertCount(count($old[$table]), $new[$table]);
            foreach ($new[$table] as $index => $row) {
                $this->assertSame($old[$table][$index], array_diff_key($row, array_flip(['periodeId', 'skemaId'])));
            }
        }
        $this->assertSame(2026, collect($new['AcaraPeriode'])->firstWhere('acara', 'monev')['tahun']);
        $this->assertSame(2025, collect($new['AcaraPeriode'])->firstWhere('acara', 'semhas')['tahun']);
        foreach ($new['MonevSlot'] as $row) {
            $parent = collect($new['AcaraSkema'])->firstWhere('id', $row['skemaId']);
            $this->assertSame($row['periodeId'], $parent['periodeId']);
        }
    }

    public function test_page_reset_and_restore_keep_new_periods_and_schemes_linked(): void
    {
        $period = $this->period('monev', 2027);
        $scheme = $this->scheme($period);
        $this->postJson('/api/admin/monev-slot', $this->slot($period, $scheme))->assertCreated();
        $page = DB::table('managed_pages')->where('path', '/layanan/monev')->first();
        $before = CmsReset::capture($page->id);
        $backup = DB::transaction(fn () => CmsReset::execute($this->admin, $page->id, CmsReset::fingerprint($before)));
        $this->assertDatabaseMissing('AcaraPeriode', ['id' => $period['id']]);
        $current = CmsReset::capture($page->id);
        DB::transaction(fn () => CmsReset::execute($this->admin, $page->id, CmsReset::fingerprint($current), $backup));
        $this->assertEquals($before['tables'], CmsReset::capture($page->id)['tables']);
        $this->get('/layanan/monev')->assertInertia(fn (Assert $view) => $view->where('eventPeriods.0.tahun', 2027)->has('eventPeriods.0.schemes.0.schedule', 1));
    }

    public function test_backup_from_before_the_period_update_can_still_be_restored(): void
    {
        $page = DB::table('managed_pages')->where('path', '/layanan/monev')->first();
        $old = CmsReset::capture($page->id);
        $defaults = json_decode(file_get_contents(database_path('cms-default-content.json')), true)['tables'];
        $old['tables'] = [
            'MonevSlot' => array_values(array_filter($defaults['MonevSlot'], fn ($row) => $row['acara'] === 'monev')),
            'AcaraPeriode' => array_values(array_filter($defaults['AcaraPeriode'], fn ($row) => $row['acara'] === 'monev')),
            'DocumentItem' => array_values(array_filter($defaults['DocumentItem'], fn ($row) => $row['section'] === 'monev')),
            'ProfileTableContent' => [],
        ];
        DB::table('cms_reset_backups')->insert(['id' => 'legacy-backup', 'scope' => $page->id, 'label' => 'Cadangan lama', 'action' => 'reset', 'actor' => $this->admin->email, 'snapshot' => Crypt::encryptString(json_encode($old)), 'created_at' => now()]);
        $before = CmsReset::capture($page->id);
        DB::transaction(fn () => CmsReset::execute($this->admin, $page->id, CmsReset::fingerprint($before), 'legacy-backup'));
        $this->assertDatabaseCount('MonevSlot', count($old['tables']['MonevSlot']));
        $this->assertSame(0, DB::table('MonevSlot')->whereNull('skemaId')->count());
        $this->get('/layanan/monev')->assertInertia(fn (Assert $view) => $view->where('eventPeriods.0.tahun', 2026)->has('eventPeriods.0.schemes', 1));
    }
}
