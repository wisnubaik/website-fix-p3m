<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\RisetEntry;
use App\Support\CmsContent;
use App\Support\CmsExcel;
use App\Support\ExcelWorkbook;
use App\Support\ResearchBulk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;
use ZipArchive;

class ExcelImportTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    private array $temporary = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->login($this->admin);
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    protected function tearDown(): void
    {
        foreach ($this->temporary as $path) {
            @unlink($path);
        }
        parent::tearDown();
    }

    private function login(Admin $admin): void
    {
        $this->flushSession();
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
    }

    private function excel(string $resource, array $rows, array $config = [], ?callable $mutate = null): UploadedFile
    {
        $definition = CmsExcel::definition($this->admin, $resource, $config);
        $file = ExcelWorkbook::template(CmsExcel::signature($definition), $definition['columns'], 'Uji impor');
        $this->temporary[] = $file;
        $zip = new ZipArchive;
        $zip->open($file);
        $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $extra = '';
        foreach ($rows as $r => $row) {
            $extra .= '<row r="'.($r + 2).'">';
            $c = 0;
            foreach ($definition['columns'] as $key => $column) {
                $index = $c++;
                $letter = '';
                do {
                    $letter = chr(65 + $index % 26).$letter;
                    $index = intdiv($index, 26) - 1;
                } while ($index >= 0);
                $value = htmlspecialchars((string) ($row[$key] ?? ''), ENT_XML1 | ENT_QUOTES, 'UTF-8');
                $extra .= '<c r="'.$letter.($r + 2).'" t="inlineStr"><is><t xml:space="preserve">'.$value.'</t></is></c>';
            }
            $extra .= '</row>';
        }
        $zip->addFromString('xl/worksheets/sheet1.xml', str_replace('</sheetData>', $extra.'</sheetData>', $xml));
        $zip->close();
        $zip->open($file);
        if ($mutate) {
            $mutate($zip);
        }
        $zip->close();

        return new UploadedFile($file, 'data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    private function preview(string $resource, array $rows, array $config = []): TestResponse
    {
        return $this->post('/api/admin/excel/'.$resource.'/preview', ['file' => $this->excel($resource, $rows, $config), 'config' => json_encode($config)], ['Accept' => 'application/json']);
    }

    public function test_ki_replace_clear_defaults_and_undo_do_not_affect_research(): void
    {
        $row = ['tahun' => '2026', 'judul' => 'Karya lama', 'ketua' => 'Ketua', 'prodi' => 'TI', 'jenisKi' => 'Hak Cipta', 'bentuk' => 'Buku', 'status' => 'Tercatat'];
        $id = $this->postJson('/api/admin/ki-karya', $row)->assertCreated()->json('id');
        $research = $this->postJson('/api/admin/riset-entries', ['category' => 'penelitian-internal', 'year' => '2026', 'title' => 'Riset tetap', 'leader' => 'Ketua'])->assertCreated()->json('id');
        $file = $this->excel('ki-karya', [$row, [...$row, 'judul' => 'Karya baru']]);
        $preview = $this->post('/api/admin/excel/ki-karya/preview', ['file' => $file, 'mode' => 'replace'], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('validCount', 2)->assertJsonPath('oldCount', 1);
        $this->postJson('/api/admin/excel/ki-karya/commit', ['token' => $preview->json('token')])->assertOk();
        $this->assertSame(2, DB::table('KiKarya')->whereNull('deletedAt')->count());
        $undo = $this->postJson('/api/admin/excel/ki-karya/bulk-preview', ['action' => 'undo'])->assertOk()->assertJsonPath('newCount', 1);
        $this->postJson('/api/admin/excel/ki-karya/commit', ['token' => $undo->json('token')])->assertOk();
        $this->assertDatabaseHas('KiKarya', ['id' => $id, 'deletedAt' => null]);
        $clear = $this->postJson('/api/admin/excel/ki-karya/bulk-preview', ['action' => 'clear'])->assertOk();
        $this->postJson('/api/admin/excel/ki-karya/commit', ['token' => $clear->json('token')])->assertOk();
        $this->assertSame(0, DB::table('KiKarya')->whereNull('deletedAt')->count());
        $defaults = $this->postJson('/api/admin/excel/ki-karya/bulk-preview', ['action' => 'defaults'])->assertOk();
        $this->postJson('/api/admin/excel/ki-karya/commit', ['token' => $defaults->json('token')])->assertOk();
        $this->assertSame(count(ResearchBulk::defaults('ki-karya')), DB::table('KiKarya')->whereNull('deletedAt')->count());
        $this->assertDatabaseHas('RisetEntry', ['id' => $research, 'deletedAt' => null]);
        $this->assertSame(0, DB::table('research_data_backups')->where('category', '!=', 'ki-karya')->count());
        $this->postJson('/api/admin/excel/ki-karya/bulk-preview', ['action' => 'clear', 'config' => ['scope' => ['tahun' => '2026']]])->assertUnprocessable();
    }

    public function test_research_replacement_keeps_matching_rows_and_can_restore_backup(): void
    {
        $category = 'penelitian-internal';
        $config = ['scope' => ['category' => $category]];
        $row = ['category' => $category, 'year' => '2026', 'title' => 'Riset lama', 'leader' => 'Ketua', 'funding' => 100, 'published' => true];
        $old = $this->postJson('/api/admin/riset-entries', $row)->assertCreated()->json('id');
        $other = $this->postJson('/api/admin/riset-entries', [...$row, 'category' => 'pkm-internal'])->assertCreated()->json('id');
        $file = $this->excel('riset-entries', [[...$row, 'published' => 'Ya'], [...$row, 'title' => 'Riset baru', 'published' => 'Tidak']], $config);
        $preview = $this->post('/api/admin/excel/riset-entries/preview', ['file' => $file, 'config' => json_encode($config), 'mode' => 'replace'], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('validCount', 2)->assertJsonPath('oldCount', 1);
        $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 2);
        $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $preview->json('token')])->assertOk();
        $this->assertDatabaseCount('research_data_backups', 1);
        $this->assertSame(2, DB::table('RisetEntry')->where('category', $category)->whereNull('deletedAt')->count());
        $this->assertDatabaseHas('RisetEntry', ['id' => $other, 'deletedAt' => null]);
        $undo = $this->postJson('/api/admin/excel/riset-entries/bulk-preview', ['config' => $config, 'action' => 'undo'])->assertOk()->assertJsonPath('newCount', 1);
        $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $undo->json('token')])->assertOk();
        $this->assertDatabaseHas('RisetEntry', ['id' => $old, 'deletedAt' => null]);
        $this->assertSame(1, DB::table('RisetEntry')->where('category', $category)->whereNull('deletedAt')->count());
    }

    public function test_clear_and_defaults_are_scoped_to_each_of_six_categories(): void
    {
        foreach (array_keys(RisetEntry::CATEGORIES) as $category) {
            $config = ['scope' => ['category' => $category]];
            $row = ['category' => $category, 'year' => '2026', 'title' => 'Isi admin', 'leader' => 'Ketua'];
            $this->postJson('/api/admin/riset-entries', $row)->assertCreated();
            $otherBefore = DB::table('RisetEntry')->where('category', '!=', $category)->whereNull('deletedAt')->count();
            $preview = $this->postJson('/api/admin/excel/riset-entries/bulk-preview', ['config' => $config, 'action' => 'clear'])->assertOk()->assertJsonPath('newCount', 0);
            $this->assertSame(1, DB::table('RisetEntry')->where('category', $category)->whereNull('deletedAt')->count());
            $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $preview->json('token')])->assertOk();
            $this->assertSame(0, DB::table('RisetEntry')->where('category', $category)->whereNull('deletedAt')->count());
            $defaults = ResearchBulk::defaults($category);
            $restore = $this->postJson('/api/admin/excel/riset-entries/bulk-preview', ['config' => $config, 'action' => 'defaults']);
            if ($defaults) {
                $restore->assertOk()->assertJsonPath('newCount', count($defaults));
                $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $restore->json('token')])->assertOk();
                $this->assertSame(count($defaults), DB::table('RisetEntry')->where('category', $category)->whereNull('deletedAt')->count());
            } else {
                $restore->assertUnprocessable();
            }
            $this->assertSame($otherBefore, DB::table('RisetEntry')->where('category', '!=', $category)->whereNull('deletedAt')->count());
        }
    }

    public function test_bulk_rejects_stale_preview_bad_scope_and_other_admin_token(): void
    {
        $config = ['scope' => ['category' => 'pkm-eksternal']];
        $this->postJson('/api/admin/excel/riset-entries/bulk-preview', ['action' => 'clear'])->assertUnprocessable();
        $this->postJson('/api/admin/excel/acara-skema/bulk-preview', ['action' => 'clear'])->assertUnprocessable();
        $preview = $this->postJson('/api/admin/excel/riset-entries/bulk-preview', ['config' => $config, 'action' => 'clear'])->assertOk();
        $this->postJson('/api/admin/riset-entries', ['category' => 'pkm-eksternal', 'year' => '2026', 'title' => 'Perubahan baru', 'leader' => 'Ketua'])->assertCreated();
        $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $preview->json('token')])->assertConflict();
        $this->assertDatabaseCount('research_data_backups', 0);
        $this->login(Admin::factory()->create(['role' => 'ADMIN']));
        $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $preview->json('token')])->assertNotFound();
        $this->postJson('/api/admin/excel/riset-entries/bulk-preview', ['config' => $config, 'action' => 'clear'])->assertOk();
    }

    public function test_replacement_invalid_excel_and_restore_collision_leave_old_data_intact(): void
    {
        $category = 'penelitian-internal';
        $config = ['scope' => ['category' => $category]];
        $this->postJson('/api/admin/riset-entries', ['category' => $category, 'year' => '2026', 'title' => 'Tetap ada', 'leader' => 'Ketua'])->assertCreated();
        $file = $this->excel('riset-entries', [['year' => 'salah', 'title' => 'Tidak valid', 'leader' => 'Ketua']], $config);
        $this->post('/api/admin/excel/riset-entries/preview', ['file' => $file, 'config' => json_encode($config), 'mode' => 'replace'], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('token', null);
        $defaults = ResearchBulk::defaults($category);
        DB::table('RisetEntry')->insert([...$defaults[0], 'category' => 'pkm-internal']);
        $preview = $this->postJson('/api/admin/excel/riset-entries/bulk-preview', ['config' => $config, 'action' => 'defaults'])->assertOk();
        $this->postJson('/api/admin/excel/riset-entries/commit', ['token' => $preview->json('token')])->assertConflict();
        $this->assertDatabaseHas('RisetEntry', ['title' => 'Tetap ada', 'deletedAt' => null]);
        $this->assertDatabaseCount('research_data_backups', 0);
    }

    private function group(string $name, array $extra = []): array
    {
        return ['nama' => $name, 'ketua' => 'Ketua', 'fokus' => 'Terapan', 'deskripsi' => 'Keterangan', 'published' => 'Ya', ...$extra];
    }

    public function test_preview_does_not_save_and_commit_is_atomic_ordered_and_idempotent(): void
    {
        $this->postJson('/api/admin/riset-grup', $this->group('Data lama', ['published' => true]))->assertCreated();
        $preview = $this->preview('riset-grup', [$this->group('A'), $this->group('B'), $this->group('A')])->assertOk()->assertJsonPath('duplicates', 1)->assertJsonPath('validCount', 2);
        $this->assertDatabaseCount('RisetGrup', 1);
        $token = $preview->json('token');
        $this->postJson('/api/admin/excel/riset-grup/commit', ['token' => $token])->assertOk()->assertJsonPath('imported', 2);
        $this->postJson('/api/admin/excel/riset-grup/commit', ['token' => $token])->assertOk()->assertJsonPath('imported', 2);
        $this->assertSame(['Data lama', 'A', 'B'], DB::table('RisetGrup')->orderBy('order')->pluck('nama')->all());
        $this->assertSame([0, 1, 2], DB::table('RisetGrup')->orderBy('order')->pluck('order')->all());
        $this->preview('riset-grup', [$this->group('A'), $this->group('B')])->assertOk()->assertJsonPath('validCount', 0)->assertJsonPath('duplicates', 2)->assertJsonPath('token', null);
        $this->assertSame(1, DB::table('ActivityLog')->where('detail', 'like', 'Impor Excel:%')->count());
    }

    public function test_invalid_rows_block_entire_batch_and_report_excel_row(): void
    {
        $this->preview('riset-grup', [$this->group('Baik'), $this->group('Buruk', ['anggota' => '-4'])])->assertOk()->assertJsonPath('token', null)->assertJsonPath('errors.0.row', 3)->assertJsonPath('errorCount', 1);
        $this->assertDatabaseCount('RisetGrup', 0);
        $this->assertDatabaseCount('cms_excel_imports', 0);
    }

    public function test_inline_current_data_download_can_be_read_back_without_changing_content(): void
    {
        $config = ['title' => 'Tugas', 'context' => 'test-profile', 'columns' => [
            ['key' => 'name', 'label' => 'Peran'], ['key' => 'items', 'label' => 'Tugas', 'type' => 'lines'],
            ['key' => 'ordered', 'label' => 'Bernomor', 'type' => 'boolean'],
        ]];
        $response = $this->postJson('/api/admin/excel/rows/template', ['config' => $config, 'includeData' => true,
            'currentRows' => [['name' => 'Dosen', 'items' => ['Meneliti', 'Mengabdi'], 'ordered' => true]],
        ])->assertOk();
        $path = $response->baseResponse->getFile()->getPathname();
        $this->temporary[] = $path;
        $definition = CmsExcel::definition($this->admin, 'rows', $config);
        $read = ExcelWorkbook::read($path, CmsExcel::signature($definition), $definition['columns']);
        $result = CmsExcel::prepare($this->admin, $definition, $read['rows'], $read['date1904']);
        $this->assertSame(0, $result['errorCount']);
        $this->assertSame(['name' => 'Dosen', 'items' => ['Meneliti', 'Mengabdi'], 'ordered' => true], $result['rows'][0]['values']);
        $this->assertDatabaseCount('cms_excel_imports', 0);
    }

    public function test_every_bulk_resource_can_download_preview_and_import(): void
    {
        $period = $this->postJson('/api/admin/acara-periode', ['acara' => 'monev', 'tahun' => 2026, 'judul' => 'Monev 2026', 'tanggalMulai' => '2026-10-18'])->assertCreated()->json('id');
        $scheme = $this->postJson('/api/admin/acara-skema', ['acara' => 'monev', 'periodeId' => $period, 'nama' => 'Internal'])->assertCreated()->json('id');
        $samples = [
            'quick-access' => ['href' => 'https://example.org', 'title' => 'Akses', 'meta' => 'Keterangan'],
            'winners' => ['category' => 'penelitian', 'name' => 'Nama', 'skema' => 'Skema', 'tag' => '2026'],
            'riset-entries' => ['category' => 'penelitian-internal', 'year' => '2026', 'title' => 'Riset', 'leader' => 'Ketua', 'funding' => '1000000'],
            'asesmen' => ['prodi' => 'TI', 'tanggal' => '2026-10-18'],
            'content-list' => ['section' => 'profil-misi', 'text' => 'Misi'],
            'hub-cards' => ['hub' => 'penelitian', 'title' => 'Judul', 'desc' => 'Deskripsi', 'href' => 'https://example.org'],
            'roadmap' => ['year' => '2026', 'title' => 'Peta jalan', 'desc' => 'Deskripsi'],
            'pbl' => ['prodi' => 'TI', 'proyek' => 'Proyek', 'sumber' => 'Internal'],
            'staff' => ['role' => 'Ketua', 'name' => 'Nama', 'initial' => 'N', 'details' => "Email: nama@example.org\nBidang: Informatika"],
            'trend-stats' => ['metric' => 'proposal', 'year' => '2026', 'value' => '4'],
            'documents' => ['section' => 'repository', 'groupTitle' => 'Panduan', 'name' => 'Dokumen', 'kind' => 'pdf', 'href' => 'https://example.org/file.pdf'],
            'ki-karya' => ['tahun' => '2026', 'judul' => 'Karya', 'ketua' => 'Ketua', 'prodi' => 'TI'],
            'stat-entries' => ['group' => 'rekap-batch-1-penelitian', 'label' => 'Internal', 'value' => '5'],
            'clusters' => ['title' => 'Klaster', 'desc' => 'Deskripsi'],
            'riset-grup' => $this->group('Grup', ['published' => '']),
            'announcements' => ['num' => '001', 'title' => 'Pengumuman', 'kind' => 'pdf', 'badge' => 'Info'],
            'monev-slot' => ['periodeId' => $period, 'skemaId' => $scheme, 'tanggal' => '2026-10-18', 'acara' => 'monev', 'jurusan' => 'teknik', 'sesi' => 'penelitian', 'mulai' => '08:00', 'selesai' => '09:00', 'nama' => 'Nama', 'prodi' => 'TI'],
            'kegiatan' => ['judul' => 'Kegiatan', 'tanggalMulai' => '2026-10-18', 'tanggalSelesai' => '2026-10-19'],
            'tautan-pengusulan' => ['label' => 'Ajukan', 'href' => 'https://example.org'],
        ];
        foreach ($samples as $resource => $sample) {
            $config = $resource === 'monev-slot' ? ['scope' => ['acara' => 'monev', 'periodeId' => $period, 'skemaId' => $scheme]] : [];
            $this->postJson('/api/admin/excel/'.$resource.'/template', ['config' => $config])->assertOk()->assertDownload('template-'.$resource.'.xlsx');
            $preview = $this->preview($resource, [$sample], $config)->assertOk();
            $this->assertSame(0, $preview->json('errorCount'), $resource.': '.json_encode($preview->json('errors')));
            $preview->assertJsonPath('validCount', 1);
            $this->assertNotNull($preview->json('token'), $resource);
            $this->postJson('/api/admin/excel/'.$resource.'/commit', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 1);
            $this->assertDatabaseCount(CmsContent::TABLES[$resource], 1);
            if (array_key_exists('published', CmsExcel::defaults(CmsContent::TABLES[$resource]))) {
                $this->assertEquals(0, DB::table(CmsContent::TABLES[$resource])->value('published'), $resource);
            }
        }
    }

    public function test_winners_from_the_reported_excel_import_in_order_and_invalid_names_report_the_row(): void
    {
        $rows = [];
        for ($i = 1; $i <= 3; $i++) {
            $rows[] = ['category' => 'tes'.$i, 'name' => 'Wisnu '.chr(64 + $i), 'skema' => 'skema tes', 'tag' => 'TES', 'published' => 'Ya'];
        }
        $preview = $this->preview('winners', $rows)->assertOk()->assertJsonPath('validCount', 3)->assertJsonPath('errorCount', 0);
        $this->postJson('/api/admin/excel/winners/commit', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 3);
        $this->assertSame(['Wisnu A', 'Wisnu B', 'Wisnu C'], DB::table('Winner')->orderBy('order')->pluck('name')->all());
        $this->assertSame([0, 1, 2], DB::table('Winner')->orderBy('order')->pluck('order')->all());
        $this->assertSame(3, DB::table('Winner')->where('published', true)->count());
        $rows[1]['name'] = '   ';
        $this->preview('winners', $rows)->assertOk()->assertJsonPath('token', null)->assertJsonPath('errors.0.row', 3)->assertJsonPath('errorCount', 1);
        $this->assertDatabaseCount('Winner', 3);
    }

    public function test_import_server_failures_roll_back_and_show_actionable_messages_without_debug_details(): void
    {
        config(['app.debug' => true]);
        $nextError = null;
        DB::listen(function ($query) use (&$nextError) {
            if ($nextError && preg_match('/insert into ["`]?Winner/i', $query->sql)) {
                $error = $nextError;
                $nextError = null;
                throw $error;
            }
        });
        foreach ([
            [new \Error('Class "App\\Support\\CmsOrder" not found'), 503, 'EXCEL_ORDER_UNAVAILABLE'],
            [new \RuntimeException('SQL private-server-details'), 500, 'EXCEL_SERVER_ERROR'],
        ] as $index => [$error, $status, $code]) {
            $preview = $this->preview('winners', [['category' => 'Penelitian', 'name' => 'Peserta '.chr(65 + $index), 'skema' => 'PDP', 'tag' => 'TES']])->assertOk();
            $nextError = $error;
            $this->postJson('/api/admin/excel/winners/commit', ['token' => $preview->json('token')])
                ->assertStatus($status)->assertJsonPath('code', $code)->assertJsonMissingPath('exception')->assertJsonMissingPath('trace');
            $this->assertDatabaseCount('Winner', $index);
            $this->assertNull(DB::table('cms_excel_imports')->where('id', $preview->json('token'))->value('result'));
            $this->postJson('/api/admin/excel/winners/commit', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 1);
        }
    }

    public function test_scope_is_bound_to_template_and_required_fields_cannot_be_removed(): void
    {
        $config = ['scope' => ['category' => 'penelitian-internal'], 'columns' => [['key' => 'title', 'label' => 'Judul']]];
        $definition = CmsExcel::definition($this->admin, 'riset-entries', $config);
        $this->assertArrayHasKey('year', $definition['columns']);
        $this->assertArrayHasKey('leader', $definition['columns']);
        $file = $this->excel('riset-entries', [['title' => 'A', 'year' => '2026', 'leader' => 'Ketua']], $config);
        $config['scope']['category'] = 'pkm-internal';
        $this->post('/api/admin/excel/riset-entries/preview', ['file' => $file, 'config' => json_encode($config)], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount('RisetEntry', 0);
    }

    public function test_permissions_and_batch_ownership_are_enforced(): void
    {
        $preview = $this->preview('riset-grup', [$this->group('A')])->assertOk();
        $admin = Admin::factory()->create(['role' => 'ADMIN']);
        $this->login($admin);
        foreach (['content-list', 'stat-entries', 'rows'] as $resource) {
            $this->postJson('/api/admin/excel/'.$resource.'/template')->assertForbidden();
        }
        $this->postJson('/api/admin/excel/documents/template', ['config' => ['scope' => ['section' => 'profil-media']]])->assertForbidden();
        $this->postJson('/api/admin/excel/riset-grup/commit', ['token' => $preview->json('token')])->assertNotFound();
        $file = $this->excel('documents', [['section' => 'home-media', 'name' => 'Logo', 'groupTitle' => 'A', 'kind' => 'link', 'href' => 'https://example.org']]);
        $this->post('/api/admin/excel/documents/preview', ['file' => $file], ['Accept' => 'application/json'])->assertForbidden();
        $this->postJson('/api/admin/excel/riset-grup/template')->assertOk();
        foreach (['accounts', 'activity-log', 'arsip', 'hero', 'settings', 'acara-periode'] as $resource) {
            $this->postJson('/api/admin/excel/'.$resource.'/template')->assertNotFound();
        }
    }

    public function test_unique_stat_conflict_prevents_saving_even_if_it_appears_after_preview(): void
    {
        $row = ['metric' => 'proposal', 'year' => '2026', 'value' => '4'];
        $a = $this->preview('trend-stats', [$row])->assertOk();
        $b = $this->preview('trend-stats', [[...$row, 'value' => '5']])->assertOk();
        $this->postJson('/api/admin/excel/trend-stats/commit', ['token' => $a->json('token')])->assertOk();
        $this->postJson('/api/admin/excel/trend-stats/commit', ['token' => $b->json('token')])->assertUnprocessable();
        $this->assertDatabaseCount('TrendStat', 1);
        $this->assertDatabaseHas('TrendStat', ['value' => 4]);
    }

    public function test_expired_batches_and_changed_permissions_cannot_commit(): void
    {
        $preview = $this->preview('content-list', [['text' => 'Misi']], ['scope' => ['section' => 'profil-misi']])->assertOk();
        $this->admin->update(['role' => 'ADMIN']);
        $this->postJson('/api/admin/excel/content-list/commit', ['token' => $preview->json('token')])->assertForbidden();
        $this->admin->update(['role' => 'SUPERADMIN']);
        DB::table('cms_excel_imports')->update(['expires_at' => now()->subMinute()]);
        $this->postJson('/api/admin/excel/content-list/commit', ['token' => $preview->json('token')])->assertStatus(410);
    }

    public function test_inline_rows_dates_times_shared_strings_and_hyperlinks(): void
    {
        $config = ['context' => 'table-1', 'columns' => [['key' => 'name', 'label' => 'Nama'], ['key' => 'date', 'label' => 'Tanggal', 'type' => 'date'], ['key' => 'time', 'label' => 'Jam', 'type' => 'time'], ['key' => 'list', 'label' => 'Daftar', 'type' => 'lines'], ['key' => 'target', 'label' => 'Target', 'type' => 'integer', 'nullable' => true]]];
        $file = $this->excel('rows', [['name' => '001', 'date' => '45292', 'time' => '0.5', 'list' => "Satu\nDua"]], $config, function (ZipArchive $zip): void {
            $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
            $xml = str_replace('<c r="A2" t="inlineStr"><is><t xml:space="preserve">001</t></is></c>', '<c r="A2" t="s"><v>0</v></c>', $xml);
            $zip->addFromString('xl/worksheets/sheet1.xml', $xml);
            $zip->addFromString('xl/sharedStrings.xml', '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>001</t></si></sst>');
            $zip->addFromString('xl/worksheets/_rels/sheet1.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="h" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" TargetMode="External" Target="https://example.org"/></Relationships>');
        });
        $this->post('/api/admin/excel/rows/preview', ['config' => json_encode($config), 'file' => $file], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('rows.0.values.name', '001')->assertJsonPath('rows.0.values.date', '2024-01-01')->assertJsonPath('rows.0.values.time', '12:00')->assertJsonPath('rows.0.values.list', ['Satu', 'Dua'])->assertJsonPath('rows.0.values.target', null)->assertJsonPath('token', null);
        $this->assertDatabaseCount('cms_excel_imports', 0);
    }

    public function test_formulas_entities_hidden_rows_and_wrong_headers_are_rejected(): void
    {
        foreach (['formula', 'entity', 'hidden', 'header', 'macro'] as $attack) {
            $file = $this->excel('riset-grup', [$this->group('A')], [], function (ZipArchive $zip) use ($attack): void {
                $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
                $xml = match ($attack) {
                    'formula' => str_replace('<is>', '<f>1+1</f><is>', $xml),'entity' => str_replace('<worksheet', '<!DOCTYPE x [<!ENTITY ext SYSTEM "file:///etc/passwd">]><worksheet', $xml),'hidden' => str_replace('<row r="2">', '<row r="2" hidden="1">', $xml),'header' => str_replace('[nama]', '[id]', $xml),default => $xml
                };
                $zip->addFromString('xl/worksheets/sheet1.xml', $xml);
                if ($attack === 'macro') {
                    $zip->addFromString('xl/vbaProject.bin', 'macro');
                }
            });
            $this->post('/api/admin/excel/riset-grup/preview', ['file' => $file], ['Accept' => 'application/json'])->assertUnprocessable();
        }
        $this->assertDatabaseCount('RisetGrup', 0);
    }

    public function test_dates_ranges_urls_and_large_import_limit(): void
    {
        $this->preview('kegiatan', [['judul' => 'Kegiatan', 'tanggalMulai' => '2026-02-30']])->assertOk()->assertJsonPath('errorCount', 1);
        $period = $this->postJson('/api/admin/acara-periode', ['acara' => 'monev', 'tahun' => 2026, 'judul' => 'Monev 2026', 'tanggalMulai' => '2026-10-18'])->assertCreated()->json('id');
        $scheme = $this->postJson('/api/admin/acara-skema', ['acara' => 'monev', 'periodeId' => $period, 'nama' => 'Internal'])->assertCreated()->json('id');
        $this->preview('monev-slot', [['tanggal' => '2026-10-18', 'acara' => 'monev', 'jurusan' => 'teknik', 'sesi' => 'pkm', 'mulai' => '09:00', 'selesai' => '08:00', 'nama' => 'A', 'prodi' => 'TI']], ['scope' => ['acara' => 'monev', 'periodeId' => $period, 'skemaId' => $scheme]])->assertOk()->assertJsonPath('token', null)->assertJsonPath('errorCount', 1);
        $this->preview('riset-grup', [$this->group('A', ['roadmapHref' => '/alamat-tidak-ada'])])->assertOk()->assertJsonPath('errorCount', 1);
        $this->preview('riset-grup', array_fill(0, 2001, $this->group('A')))->assertUnprocessable();
    }

    public function test_two_thousand_rows_import_without_losing_order_or_values(): void
    {
        $rows = [];
        for ($i = 0; $i < 2000; $i++) {
            $rows[] = ['label' => 'Kategori '.$i, 'value' => (string) $i];
        }
        $config = ['scope' => ['group' => 'rekap-batch-1-penelitian']];
        $preview = $this->preview('stat-entries', $rows, $config)->assertOk()->assertJsonPath('validCount', 2000)->assertJsonPath('errorCount', 0);
        $this->postJson('/api/admin/excel/stat-entries/commit', ['token' => $preview->json('token')])->assertOk()->assertJsonPath('imported', 2000);
        $this->assertDatabaseCount('StatEntry', 2000);
        $this->assertDatabaseHas('StatEntry', ['label' => 'Kategori 1999', 'value' => 1999, 'order' => 1999, 'published' => false]);
        $this->assertSame(range(0, 1999), DB::table('StatEntry')->orderBy('order')->pluck('order')->all());
    }
    public function test_generic_bulk_clear_and_undo_preserve_other_groups(): void
    {
        $config = ['scope' => ['section' => 'home-agenda']];
        $definition = CmsExcel::definition($this->admin, 'content-list', $config);
        $key = ResearchBulk::category($definition);
        $before = ResearchBulk::rows($key);
        $others = DB::table('ContentListItem')->where('section', '!=', 'home-agenda')->get()->toJson();
        $preview = $this->postJson('/api/admin/excel/content-list/bulk-preview', ['config' => $config, 'action' => 'clear'])->assertOk();
        $this->postJson('/api/admin/excel/content-list/commit', ['token' => $preview->json('token')])->assertOk();
        $this->assertSame([], ResearchBulk::rows($key));
        $undo = $this->postJson('/api/admin/excel/content-list/bulk-preview', ['config' => $config, 'action' => 'undo'])->assertOk();
        $this->postJson('/api/admin/excel/content-list/commit', ['token' => $undo->json('token')])->assertOk();
        $this->assertCount(count($before), ResearchBulk::rows($key));
        $this->assertSame($others, DB::table('ContentListItem')->where('section', '!=', 'home-agenda')->get()->toJson());
    }

    public function test_scoped_research_backups_have_distinct_keys_per_year(): void
    {
        $a = ResearchBulk::category(CmsExcel::definition($this->admin, 'riset-entries', ['scope' => ['category' => 'penelitian-internal', 'year' => '2025']]));
        $b = ResearchBulk::category(CmsExcel::definition($this->admin, 'riset-entries', ['scope' => ['category' => 'penelitian-internal', 'year' => '2026']]));
        $this->assertNotSame(ResearchBulk::key($a), ResearchBulk::key($b));
        foreach (ResearchBulk::rows($a) as $row) {
            $this->assertSame('2025', (string) $row['year']);
        }
    }

    public function test_backup_history_protects_latest_and_checks_confirmation(): void
    {
        $key = ResearchBulk::category(CmsExcel::definition($this->admin, 'riset-grup', []));
        ResearchBulk::backup($key, $this->admin->id);
        $older = DB::table('research_data_backups')->orderByDesc('sequence')->value('id');
        DB::table('research_data_backups')->where('id', $older)->update(['created_at' => now()->subDays(45)]);
        ResearchBulk::backup($key, $this->admin->id);
        $latest = DB::table('research_data_backups')->orderByDesc('sequence')->value('id');
        $url = '/api/admin/excel/riset-grup/bulk-preview';
        $this->postJson($url, ['action' => 'status'])->assertOk()->assertJsonCount(2, 'backups');
        $this->postJson($url, ['action' => 'delete-backup', 'backupId' => $older])->assertUnprocessable();
        $this->postJson($url, ['action' => 'delete-backup', 'backupId' => $latest, 'confirmation' => 'HAPUS CADANGAN'])->assertUnprocessable();
        $this->postJson($url, ['action' => 'delete-backup', 'backupId' => $older, 'confirmation' => 'HAPUS CADANGAN'])->assertOk();
        $this->assertDatabaseMissing('research_data_backups', ['id' => $older]);
        $this->assertDatabaseHas('research_data_backups', ['id' => $latest]);
    }

}
