<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\RisetEntry;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ResearchPageRevisionTest extends TestCase
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

    public function test_six_editors_show_the_full_card_label_and_preserve_existing_unit_customization(): void
    {
        foreach (array_keys(RisetEntry::CATEGORIES) as $category) {
            $path = '/'.str_replace('-', '/', $category);
            $definition = ManagedContent::definition($path);
            $legacy = $definition['editorFieldLabels']['x_riset_count_label']['legacyField'];
            $page = DB::table('managed_pages')->where('path', $path)->first();
            $this->get('/admin/halaman/'.$page->id)->assertInertia(fn (Assert $view) => $view
                ->where('fields', function ($fields) use ($category, $legacy) {
                    $fields = collect($fields)->keyBy('key');
                    $expected = str_starts_with($category, 'pkm-') ? 'Jumlah judul pengabdian' : 'Jumlah judul penelitian';

                    return $fields['x_riset_count_label']['default'] === $expected
                        && ! $fields->has($legacy) && ! $fields->has('f_a9ab1fcbf2bb07');
                }));
            $document = ManagedContent::decode($page->draft);
            $document['fields'][$legacy] = 'kegiatan pilihan '.$category;
            $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version, 'action' => 'save', 'document' => $document])->assertOk();
            $this->get('/admin/halaman/'.$page->id)->assertInertia(fn (Assert $view) => $view
                ->where('fields', fn ($fields) => collect($fields)->firstWhere('key', 'x_riset_count_label')['default'] === 'Jumlah kegiatan pilihan '.$category));
            $this->assertSame($page->published, DB::table('managed_pages')->where('id', $page->id)->value('published'));
        }
    }

    public function test_card_label_drafts_and_publication_stay_on_their_own_page_without_changing_research_data(): void
    {
        foreach (array_keys(RisetEntry::CATEGORIES) as $category) {
            RisetEntry::factory()->create(['category' => $category, 'title' => 'Data '.$category]);
        }
        $dataBefore = DB::table('RisetEntry')->orderBy('id')->get()->toJson();
        $homeBefore = DB::table('managed_pages')->where('path', '/')->first();
        $expected = [];
        foreach (array_keys(RisetEntry::CATEGORIES) as $category) {
            $path = '/'.str_replace('-', '/', $category);
            $page = DB::table('managed_pages')->where('path', $path)->first();
            $document = ManagedContent::decode($page->draft);
            $label = 'Jumlah kegiatan '.$category;
            $document['fields']['x_riset_count_label'] = $label;
            $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version, 'action' => 'save', 'document' => $document])->assertOk();
            $this->get($path.'?cms_preview=1')->assertInertia(fn (Assert $view) => $view->where('cms.fields.x_riset_count_label', $label));
            $this->get($path)->assertInertia(fn (Assert $view) => $view->missing('cms.fields.x_riset_count_label'));
            $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version + 1, 'action' => 'publish', 'document' => $document])->assertOk();
            $expected[$path] = $label;
            foreach ($expected as $publishedPath => $publishedLabel) {
                $this->get($publishedPath)->assertInertia(fn (Assert $view) => $view->where('cms.fields.x_riset_count_label', $publishedLabel));
            }
        }
        $this->assertSame($dataBefore, DB::table('RisetEntry')->orderBy('id')->get()->toJson());
        $this->assertEquals($homeBefore, DB::table('managed_pages')->where('path', '/')->first());
    }

    public function test_each_research_page_only_receives_its_published_entries_in_the_correct_order(): void
    {
        foreach (array_keys(RisetEntry::CATEGORIES) as $category) {
            RisetEntry::factory()->create(['category' => $category, 'year' => '2025', 'title' => 'Lama '.$category]);
            RisetEntry::factory()->create(['category' => $category, 'year' => '2026', 'title' => 'Baru '.$category, 'funding' => 9000000]);
            RisetEntry::factory()->create(['category' => $category, 'published' => false]);
            RisetEntry::factory()->create(['category' => $category, 'deletedAt' => now()]);
        }
        foreach (array_keys(RisetEntry::CATEGORIES) as $category) {
            $this->get('/'.str_replace('-', '/', $category))->assertInertia(fn (Assert $view) => $view
                ->where('category', $category)->has('entries', 2)
                ->where('entries.0.title', 'Baru '.$category)->where('entries.0.funding', 9000000)
                ->where('entries.1.title', 'Lama '.$category));
        }
    }
}
