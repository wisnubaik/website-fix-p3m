<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\CmsContent;
use App\Support\CmsExcel;
use App\Support\FieldRules;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class FieldValidationTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $this->admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($this->admin)->withSession(['admin_version' => 0, 'admin_expires_at' => time() + 43200]);
    }

    public static function fieldCases(): array
    {
        return [
            ['person', 'Dr. Éva O’Neill, S.T., M.T.', true],
            ['person', 'Jean-Luc', true], ['person', '李明', true],
            ['person', 'Admin123', false], ['person', '<b>Wisnu</b>', false],
            ['people', "Rahayu, S.ST., M.T.;\nDaffa Samudra", true],
            ['people', 'Dosen 2', false], ['initial', 'AP', true], ['initial', 'A2', false],
            ['integer', 0, true], ['integer', 2147483647, true], ['integer', 2147483648, false],
            ['integer', '1e6', false], ['integer', '+12', false], ['integer', '-1', false],
            ['integer', '1.5', false], ['integer', 'Rp 100', false], ['integer', '1.000', false],
            ['integer', true, false], ['integer', 1.5, false],
            ['digits', '001234567890123456', true], ['digits', '001-A', false],
            ['year', '2026', true], ['year', '2026x', false], ['year', 2026, true],
            ['year', '26', false], ['year', '2100', false],
            ['phone', '(0351) 452970', true], ['phone', '+62 812-3456-7890', true],
            ['phone', '08abc123', false], ['phone', '123', false],
            ['email', 'nama@pnm.ac.id', true], ['email', 'nama@', false],
            ['documentNumber', 'B/001/PL33.9/2026', true], ['documentNumber', '001', true],
            ['instagram', '@p3m_pnm', true], ['instagram', 'https://instagram.com/p3m_pnm/', true],
            ['instagram', 'https://example.com/not-instagram', false],
            ['formattedInteger', '1.500', true], ['formattedInteger', '1500', true],
            ['formattedInteger', '1.5', false],
            ['text', 'P3M 2026: hasil 20% & A/B', true], ['text', "Teks\x07", false],
        ];
    }

    #[DataProvider('fieldCases')]
    public function test_field_policies_follow_semantic_types(string $policy, mixed $value, bool $valid): void
    {
        $this->assertSame($valid, FieldRules::error($policy, $value) === null);
    }

    private function research(array $extra = []): array
    {
        return [...['category' => 'penelitian-internal', 'year' => '2026', 'title' => 'Riset IoT 2026',
            'leader' => 'Dr. Wisnu, S.T.', 'member1' => null, 'member2' => null,
            'funding' => 1000000, 'order' => 0, 'published' => false], ...$extra];
    }

    public function test_both_research_endpoints_reject_invalid_names_and_amounts_without_mutation(): void
    {
        foreach (['/api/admin/riset-entries', '/admin/riset-entries'] as $url) {
            foreach ([['funding' => '1e6'], ['funding' => 'Rp 1000'], ['funding' => -1], ['funding' => 1.5], ['leader' => 'Wisnu123'], ['year' => '2026x']] as $bad) {
                $this->postJson($url, $this->research($bad))->assertUnprocessable()->assertJsonValidationErrors(array_key_first($bad));
            }
        }
        $this->assertDatabaseCount('RisetEntry', 0);
        $id = $this->postJson('/api/admin/riset-entries', $this->research())->assertCreated()->json('id');
        $this->putJson('/api/admin/riset-entries/'.$id, ['funding' => '100a'])->assertUnprocessable();
        $this->assertDatabaseHas('RisetEntry', ['id' => $id, 'funding' => 1000000]);
    }

    public function test_pbl_counts_remain_strings_and_contact_rules_allow_real_formats(): void
    {
        $data = ['prodi' => 'D3 Teknik Informatika', 'proyek' => 'Proyek 2026', 'sumber' => 'Internal',
            'jumlahMahasiswa' => '03', 'jumlahProdi' => '2', 'mahasiswa' => 'Wisnu; Daffa', 'published' => false];
        $this->postJson('/api/admin/pbl', [...$data, 'jumlahMahasiswa' => '3 orang'])->assertUnprocessable()->assertJsonValidationErrors('jumlahMahasiswa');
        $this->postJson('/api/admin/pbl', $data)->assertCreated()->assertJsonPath('jumlahMahasiswa', '03');
        $settings = ['institution' => 'PNM', 'email' => 'p3m@pnm.ac.id', 'instagram' => '@p3m_pnm', 'address' => 'Madiun'];
        $this->putJson('/api/admin/settings', [...$settings, 'phone' => 'telepon123'])->assertUnprocessable()->assertJsonValidationErrors('phone');
        $this->putJson('/api/admin/settings', [...$settings, 'phone' => '(0351) 452970'])->assertSuccessful();
        $this->postJson('/api/admin/accounts', ['name' => 'Wisnu123', 'email' => 'operator@example.test', 'role' => 'ADMIN'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
    }

    public function test_staff_identifiers_keep_leading_zeros_and_invalid_detail_email_is_rejected(): void
    {
        $data = ['role' => 'Ketua P3M', 'name' => 'Dr. Wisnu, M.T.', 'initial' => 'W',
            'details' => json_encode([['NIDN', '0012345678'], ['Email', 'nama@pnm.ac.id']]), 'published' => false];
        $this->postJson('/api/admin/staff', $data)->assertCreated()->assertJsonPath('details', $data['details']);
        $this->postJson('/api/admin/staff', [...$data, 'details' => '[["NIDN","001A"]]'])->assertUnprocessable()->assertJsonValidationErrors('details');
        $this->postJson('/api/admin/staff', [...$data, 'details' => '[["Email","bukan-email"]]'])->assertUnprocessable()->assertJsonValidationErrors('details');
        $this->postJson('/api/admin/staff', [...$data, 'details' => '"invalid"'])->assertUnprocessable();
    }

    public function test_excel_validation_reports_invalid_cells_and_preserves_valid_values(): void
    {
        $definition = CmsExcel::definition($this->admin, 'riset-entries', ['scope' => ['category' => 'penelitian-internal']]);
        $rows = [];
        foreach ([['leader' => 'Wisnu123'], ['funding' => '1e6'], []] as $i => $extra) {
            $rows[] = ['number' => $i + 2, 'values' => array_map(fn ($v) => $v === null ? '' : (is_bool($v) ? 'Tidak' : (string) $v), $this->research($extra))];
        }
        $result = CmsExcel::prepare($this->admin, $definition, $rows);
        $this->assertSame(2, $result['errorCount']);
        $this->assertSame([2, 3], array_column($result['errors'], 'row'));
        $this->assertCount(1, $result['rows']);
        $this->assertSame(1000000, $result['rows'][0]['values']['funding']);
        $this->assertStringContainsString('Nama hanya', $definition['columns']['leader']['help']);
        $this->assertDatabaseCount('RisetEntry', 0);
        $inline = CmsExcel::definition($this->admin, 'rows', ['columns' => [['key' => 'c0', 'label' => 'NIP'], ['key' => 'c1', 'label' => 'Jumlah']]]);
        $result = CmsExcel::prepare($this->admin, $inline, [
            ['number' => 2, 'values' => ['c0' => '001234567890', 'c1' => '5']],
            ['number' => 3, 'values' => ['c0' => '001A', 'c1' => '5x']],
        ]);
        $this->assertSame('001234567890', $result['rows'][0]['values']['c0']);
        $this->assertGreaterThan(0, $result['errorCount']);
    }

    public function test_managed_collections_require_actual_integers_and_dynamic_tables_use_headers(): void
    {
        $tkt = DB::table('managed_pages')->where('path', '/informasi/tkt')->first();
        $tktDoc = ManagedContent::decode($tkt->draft);
        $tktDoc['collections']['collection_tkt_tingkat'] = ManagedContent::catalog()['collections']['collection_tkt_tingkat']['default'];
        $valid = ManagedContent::document($tktDoc, $tkt);
        $this->assertSame(1, $valid['collections']->collection_tkt_tingkat[0]['tingkat']);
        foreach (['1e2', 1.5, -1, '2'] as $bad) {
            try {
                $tktDoc['collections']['collection_tkt_tingkat'][0]['tingkat'] = $bad;
                ManagedContent::document($tktDoc, $tkt);
                $this->fail('Invalid numeric collection accepted.');
            } catch (ValidationException) {
                $this->assertTrue(true);
            }
        }
        $page = DB::table('managed_pages')->where('path', '/profil')->first();
        $doc = ManagedContent::decode($page->draft);
        $doc['blocks'] = [['id' => 'test-table', 'type' => 'table', 'title' => 'Data', 'text' => '', 'url' => '', 'alt' => '',
            'items' => [], 'headers' => ['Nama dosen', 'Jumlah'], 'rows' => [['Wisnu', '3x']]]];
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version, 'action' => 'save', 'document' => $doc])
            ->assertUnprocessable()->assertJsonValidationErrors('blocks.rows.0.1');
    }

    public function test_existing_default_values_fit_the_declared_field_policies(): void
    {
        $defaults = json_decode(file_get_contents(database_path('cms-default-content.json')), true)['tables'];
        $schema = json_decode(file_get_contents(database_path('content-schema.json')), true);
        $errors = [];
        foreach (CmsContent::TABLES as $resource => $table) {
            foreach ($defaults[$table] ?? [] as $row) {
                try {
                    FieldRules::values($resource, array_intersect_key($row, $schema[$resource] ?? []), $schema[$resource] ?? []);
                } catch (ValidationException $exception) {
                    foreach ($exception->errors() as $key => $messages) {
                        $errors[] = $table.'.'.$key.': '.($row[$key] ?? '');
                    }
                }
            }
        }
        $this->assertSame([], $errors, implode("\n", array_slice($errors, 0, 12)));
    }
}
