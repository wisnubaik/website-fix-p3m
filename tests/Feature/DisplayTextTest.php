<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\DisplayText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DisplayTextTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
    }

    private function quickAccess(): array
    {
        $row = json_decode(file_get_contents(database_path('cms-default-content.json')), true)['tables']['QuickAccessLink'][0];
        $row['title'] = 'Renstra — P3M 2025–2029';
        $row['meta'] = '• PDF · 2025–2029';
        $row['href'] = 'https://example.org/file–name.pdf?token=a·b';
        DB::table('QuickAccessLink')->insert($row);

        return $row;
    }

    public function test_display_cleanup_preserves_rich_text_spacing_and_machine_values(): void
    {
        $raw = [
            'title' => 'Penelitian — P3M', 'meta' => '• PDF · 2025–2029',
            'href' => 'https://example.org/file–name.pdf?token=a·b',
            'id' => 'id—123', 'temporaryPassword' => 'pass—·', 'token' => 'secret—·',
            'fingerprint' => 'hash—·', 'confirmation' => 'Ketik — persis', 'email' => 'nama—uji@example.org',
            'options' => ['Skema — lama'], 'fields' => (object) [],
            'richText' => [['runs' => [['text' => 'Halo '], ['text' => 'dunia — P3M']]]],
        ];
        $result = DisplayText::values($raw);
        $this->assertSame('Penelitian - P3M', $result['title']);
        $this->assertSame('PDF 2025-2029', $result['meta']);
        foreach (['href', 'id', 'temporaryPassword', 'token', 'fingerprint', 'confirmation', 'email', 'options'] as $key) {
            $this->assertSame($raw[$key], $result[$key]);
        }
        $this->assertInstanceOf(\stdClass::class, $result['fields']);
        $this->assertSame('Halo ', $result['richText'][0]['runs'][0]['text']);
        $this->assertSame('dunia - P3M', $result['richText'][0]['runs'][1]['text']);
    }

    public function test_initial_page_and_inertia_navigation_clean_existing_data_without_database_rewrites(): void
    {
        $row = $this->quickAccess();
        $response = $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('quickAccess.0.meta', 'PDF 2025-2029')
            ->where('quickAccess.0.title', 'Renstra - P3M 2025-2029')
            ->where('quickAccess.0.href', $row['href']));
        $version = $response->viewData('page')['version'];
        $this->get('/', ['X-Inertia' => 'true', 'X-Inertia-Version' => $version ?? ''])
            ->assertOk()->assertJsonPath('props.quickAccess.0.meta', 'PDF 2025-2029')
            ->assertJsonPath('props.quickAccess.0.href', $row['href']);
        $this->assertDatabaseHas('QuickAccessLink', ['id' => $row['id'], 'meta' => $row['meta'], 'href' => $row['href']]);
    }

    public function test_cms_api_uses_the_same_display_style_and_keeps_link_destinations(): void
    {
        $row = $this->quickAccess();
        $admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => 0, 'admin_expires_at' => time() + 43200]);
        $this->getJson('/api/admin/quick-access')->assertOk()
            ->assertJsonPath('0.meta', 'PDF 2025-2029')->assertJsonPath('0.href', $row['href']);
        $this->get('/admin/quick-access')->assertOk();
    }

    public function test_serialized_content_is_cleaned_without_changing_json_shape_or_links(): void
    {
        $raw = ['details' => json_encode([['Bidang', 'TI · Riset'], ['Tautan', 'https://example.org/a–b']]),
            'content' => json_encode(['tables' => [['note' => 'Tahun 2025–2029', 'rows' => [['• Dosen', null, 0]]]]])];
        $result = DisplayText::values($raw);
        $details = json_decode($result['details'], true);
        $this->assertSame('TI Riset', $details[0][1]);
        $this->assertSame('https://example.org/a–b', $details[1][1]);
        $table = json_decode($result['content'], true)['tables'][0];
        $this->assertSame('Tahun 2025-2029', $table['note']);
        $this->assertSame([['Dosen', null, 0]], $table['rows']);
    }
}
