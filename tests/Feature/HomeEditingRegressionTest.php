<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeEditingRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
    }

    public function test_home_program_study_can_be_created_without_selecting_a_level(): void
    {
        $this->postJson('/api/admin/documents', [
            'section' => 'home-prodi', 'kind' => 'link', 'category' => 'dokumen',
            'groupTitle' => 'Program studi', 'name' => 'Teknik Informatika',
            'href' => 'https://ti.pnm.ac.id/', 'published' => true,
        ])->assertCreated();
        $this->assertDatabaseHas('DocumentItem', ['section' => 'home-prodi', 'name' => 'Teknik Informatika']);
    }

    public function test_optional_hero_emphasis_matches_case_and_can_be_cleared_without_losing_title(): void
    {
        $title = 'Pusat Penelitian dan Pengabdian Kepada Masyarakat';
        $this->putJson('/api/admin/hero', [
            'badge' => 'P3M', 'titleText' => $title, 'titleItalicWord' => ' kepada Masyarakat ',
            'lead' => 'Keterangan', 'ctaPrimaryLabel' => 'Profil', 'ctaPrimaryHref' => '/profil',
            'ctaSecondaryLabel' => 'Beranda', 'ctaSecondaryHref' => '/',
        ])->assertSuccessful()->assertJsonPath('titleItalicWord', 'Kepada Masyarakat');
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('hero.titleText', $title)->where('hero.titleItalicWord', 'Kepada Masyarakat'));
        $this->putJson('/api/admin/hero', ['titleItalicWord' => 'tidak ada'])->assertUnprocessable()->assertJsonValidationErrors('titleItalicWord');
        $this->assertDatabaseHas('HeroContent', ['titleText' => $title, 'titleItalicWord' => 'Kepada Masyarakat']);
        foreach (['', '   ', "\u{00A0}"] as $blank) {
            $this->putJson('/api/admin/hero', ['titleItalicWord' => $blank])->assertOk()->assertJsonPath('titleItalicWord', '');
            $this->get('/')->assertInertia(fn (Assert $page) => $page->where('hero.titleText', $title)->where('hero.titleItalicWord', ''));
        }
    }

    public function test_title_only_and_blank_text_blocks_survive_draft_preview_and_publication(): void
    {
        $page = DB::table('managed_pages')->where('path', '/')->first();
        $doc = ManagedContent::decode($page->draft);
        $doc['blocks'] = [[
            'id' => 'heading-only', 'type' => 'text', 'title' => 'Judul tambahan', 'text' => '',
            'richText' => [['type' => 'paragraph', 'runs' => [['text' => " \u{00A0} "]]]],
            'url' => '', 'alt' => '', 'items' => [], 'headers' => [], 'rows' => [],
        ]];
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version, 'action' => 'save', 'document' => $doc])->assertOk();
        $this->get('/?cms_preview=1')->assertInertia(fn (Assert $view) => $view->where('cms.document.blocks.0.title', 'Judul tambahan'));
        $version = DB::table('managed_pages')->where('id', $page->id)->value('version');
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $version, 'action' => 'publish', 'document' => $doc])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->where('cms.document.blocks.0.title', 'Judul tambahan'));
        $doc['blocks'][0]['title'] = '';
        $doc['blocks'][0]['richText'] = [];
        $version = DB::table('managed_pages')->where('id', $page->id)->value('version');
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $version, 'action' => 'publish', 'document' => $doc])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->where('cms.document.blocks.0.title', '')->where('cms.document.blocks.0.text', ''));
    }
}
