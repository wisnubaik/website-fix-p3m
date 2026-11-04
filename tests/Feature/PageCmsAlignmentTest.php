<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PageCmsAlignmentTest extends TestCase
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

    public function test_each_editor_covers_its_existing_fields_collections_and_data_sources(): void
    {
        $catalog = ManagedContent::catalog();
        $count = 0;
        foreach ($catalog['pages'] as $path => $definition) {
            if (in_array($path, ['/', '/profil', '@global'], true)) {
                continue;
            }
            $count++;
            $sections = $definition['editorSections'];
            foreach (['fields', 'collections'] as $type) {
                $mapped = array_merge(...array_column($sections, $type));
                $this->assertEqualsCanonicalizing($definition[$type], $mapped, $path.' '.$type);
                $this->assertCount(count(array_unique($mapped)), $mapped);
            }
            $this->assertEqualsCanonicalizing($definition['editors'], array_unique(array_merge(...array_column($sections, 'editors'))));
            $id = DB::table('managed_pages')->where('path', $path)->value('id');
            $this->get('/admin/halaman/'.$id)->assertInertia(fn (Assert $view) => $view->where('editorSections', $sections)->where('editors', $definition['editors']));
        }
        $this->assertSame(23, $count);
        $this->assertContains('dokumen-informasi', $catalog['pages']['/informasi/kegiatan']['editors']);
    }

    public function test_copy_preview_and_publish_do_not_change_other_pages_or_data(): void
    {
        $home = DB::table('managed_pages')->where('path', '/')->first();
        foreach (ManagedContent::catalog()['pages'] as $path => $definition) {
            if (! isset($definition['editorSections'])) {
                continue;
            }
            $page = DB::table('managed_pages')->where('path', $path)->first();
            $document = ManagedContent::decode($page->draft);
            $key = $definition['fields'][0];
            $document['fields'][$key] = 'Judul uji '.$path;
            $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version, 'action' => 'save', 'document' => $document])->assertOk();
            $this->assertSame($page->published, DB::table('managed_pages')->where('id', $page->id)->value('published'));
            $this->get($path.'?cms_preview=1')->assertInertia(fn (Assert $view) => $view->where('cms.fields.'.$key, $document['fields'][$key]));
            $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version + 1, 'action' => 'publish', 'document' => $document])->assertOk();
            $this->get($path)->assertInertia(fn (Assert $view) => $view->where('cms.fields.'.$key, $document['fields'][$key]));
        }
        $this->assertEquals($home, DB::table('managed_pages')->where('path', '/')->first());
        $this->assertDatabaseCount('RisetEntry', 0);
        $this->assertDatabaseCount('Staff', 0);
    }

    public function test_documents_update_only_their_page_and_reject_wrong_schedule_placement(): void
    {
        foreach (['kegiatan', 'laporan-keuangan', 'luaran', 'mitra', 'sinta', 'tkt', 'monev', 'semhas', 'ki', 'panduan', 'asesmen', 'repository'] as $section) {
            $category = match ($section) {
                'monev' => 'Indikator Penilaian', 'semhas' => 'Dokumen Seminar Hasil', default => null,
            };
            $id = $this->postJson('/api/admin/documents', ['section' => $section, 'groupTitle' => 'Kelompok '.$section, 'name' => 'Dokumen '.$section, 'kind' => 'pdf', 'href' => 'https://example.com/uji.pdf', 'order' => 0, 'published' => true, 'category' => $category])->assertCreated()->json('id');
            $this->putJson('/api/admin/documents/'.$id, ['name' => 'Revisi '.$section])->assertOk();
            $prefix = in_array($section, ['monev', 'semhas', 'ki', 'panduan', 'asesmen']) ? '/layanan/' : '/informasi/';
            $path = $section === 'repository' ? '/repository' : $prefix.$section;
            $this->get($path)->assertInertia(fn (Assert $view) => $view->has('sections', 1)->where('sections.0.items.0.name', 'Revisi '.$section)->where('sections.0.items.0.cat', $category));
        }
        $id = DB::table('DocumentItem')->where('section', 'semhas')->value('id');
        $this->putJson('/api/admin/documents/'.$id, ['category' => 'Indikator Penilaian'])->assertUnprocessable();
        $this->assertDatabaseHas('DocumentItem', ['id' => $id, 'category' => 'Dokumen Seminar Hasil']);
    }

    public function test_staff_details_round_trip_as_label_value_rows(): void
    {
        $data = ['name' => 'Tim Uji', 'role' => 'Koordinator', 'initial' => 'TU', 'details' => json_encode([['NIDN', '12345'], ['Email', 'tim@example.com']]), 'order' => 0, 'published' => true];
        $id = $this->postJson('/api/admin/staff', $data)->assertCreated()->json('id');
        $details = [['NIDN', '12345'], ['Email', 'baru@example.com'], ['Bidang', 'Penelitian terapan']];
        $this->putJson('/api/admin/staff/'.$id, ['details' => json_encode($details)])->assertOk();
        $this->get('/hubungi')->assertInertia(fn (Assert $view) => $view->where('staff.0.details', $details)->where('staff.0.name', 'Tim Uji'));
        $this->putJson('/api/admin/staff/'.$id, ['details' => '{"nama":"salah"}'])->assertUnprocessable();
        $this->assertDatabaseHas('Staff', ['id' => $id, 'details' => json_encode($details)]);
    }

    public function test_tkt_rejects_duplicate_or_invisible_levels_and_accepts_matching_ranges(): void
    {
        $catalog = ManagedContent::catalog();
        $page = DB::table('managed_pages')->where('path', '/informasi/tkt')->first();
        $document = ManagedContent::decode($page->draft);
        foreach ($catalog['pages']['/informasi/tkt']['collections'] as $key) {
            $document['collections'][$key] = $catalog['collections'][$key]['default'];
        }
        $bad = $document;
        $bad['collections']['collection_tkt_tingkat'][1]['tingkat'] = 1;
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'save', 'document' => $bad])->assertUnprocessable();
        $bad = $document;
        $bad['collections']['collection_tkt_tahap'][0]['dari'] = 2;
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'save', 'document' => $bad])->assertUnprocessable();
        $document['collections']['collection_tkt_tingkat'][0]['judul'] = 'Prinsip dasar yang telah dikaji';
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'publish', 'document' => $document])->assertOk();
        $this->get('/informasi/tkt')->assertInertia(fn (Assert $view) => $view->where('cms.collections.collection_tkt_tingkat.0.judul', 'Prinsip dasar yang telah dikaji'));
    }
}
