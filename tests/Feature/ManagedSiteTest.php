<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ManagedSiteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
    }

    private function login(string $role = 'SUPERADMIN'): Admin
    {
        $admin = Admin::factory()->create(['role' => $role]);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);

        return $admin;
    }

    private function guest(): void
    {
        Auth::forgetGuards();
        $this->flushSession();
    }

    private function createPage(): array
    {
        return $this->postJson('/api/admin/managed-pages', ['title' => 'Kerja sama industri', 'path' => '/informasi/kerja-sama', 'template' => 'information'])->assertCreated()->json('page');
    }

    public function test_draft_preview_publication_and_revisions_are_separate(): void
    {
        $this->login();
        $page = $this->createPage();
        $document = $page['document'];
        $document['blocks'][0]['text'] = 'Draf kerja sama yang belum boleh terlihat.';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'save', 'document' => $document])->assertOk()->assertJsonPath('page.version', 2);
        $this->get('/informasi/kerja-sama')->assertNotFound();
        $this->get('/informasi/kerja-sama?cms_preview=1')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow')->assertInertia(fn (Assert $view) => $view->where('cms.preview', true)->where('pageDocument.blocks.0.text', $document['blocks'][0]['text']));
        $this->guest();
        $this->get('/informasi/kerja-sama?cms_preview=1')->assertForbidden();
        $this->get('/informasi/kerja-sama')->assertNotFound();
        $this->login();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 2, 'action' => 'publish', 'document' => $document])->assertOk();
        $this->guest();
        $this->get('/informasi/kerja-sama')->assertOk()->assertInertia(fn (Assert $view) => $view->where('pageDocument.blocks.0.text', $document['blocks'][0]['text'])->where('cms.preview', false));
        $this->get('/sitemap.xml')->assertSee('/informasi/kerja-sama');
        $this->login();
        $document['title'] = 'Belum terbit';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 3, 'action' => 'save', 'document' => $document])->assertOk();
        $this->get('/informasi/kerja-sama')->assertInertia(fn (Assert $view) => $view->where('seo.title', 'Kerja sama industri'));
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 3, 'action' => 'publish', 'document' => $document])->assertConflict();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 4, 'action' => 'discard'])->assertOk()->assertJsonPath('page.document.title', 'Kerja sama industri');
        $revisionId = DB::table('managed_page_revisions')->where('page_id', $page['id'])->orderByDesc('id')->value('id');
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 5, 'action' => 'restore', 'revisionId' => $revisionId])->assertOk()->assertJsonPath('page.document.title', 'Belum terbit');
        $this->assertDatabaseHas('ActivityLog', ['resource' => 'managed-pages', 'action' => 'publish']);
    }

    public function test_admin_cannot_change_page_or_menu_and_password_gate_stays_active(): void
    {
        $this->login('ADMIN');
        $page = DB::table('managed_pages')->where('path', '/profil')->first();
        $this->get('/admin/halaman')->assertOk();
        $this->get('/admin/halaman/'.$page->id)->assertOk();
        $this->postJson('/api/admin/managed-pages', [])->assertForbidden();
        $this->putJson('/api/admin/managed-pages/'.$page->id, [])->assertForbidden();
        $this->putJson('/api/admin/site-menu', [])->assertForbidden();
        $this->get('/profil?cms_preview=1')->assertForbidden();
        $this->get('/admin/menu')->assertForbidden();
        $admin = $this->login();
        $admin->update(['mustChangePassword' => true]);
        $this->postJson('/api/admin/managed-pages', [])->assertForbidden();
        $this->get('/admin/halaman')->assertRedirect('/admin/akun');
        $this->get('/profil?cms_preview=1')->assertForbidden();
    }

    public function test_original_navigation_can_be_saved_and_menu_drafts_do_not_leak(): void
    {
        $this->login();
        $items = ManagedContent::decode(DB::table('site_navigation')->where('id', 'main')->value('draft'));
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'publish', 'items' => $items])->assertOk();
        $page = $this->createPage();
        $items[] = ['id' => (string) Str::uuid(), 'label' => 'Kerja sama baru', 'pageId' => $page['id'], 'href' => '', 'visible' => true, 'children' => []];
        $this->putJson('/api/admin/site-menu', ['version' => 2, 'action' => 'save', 'items' => $items])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->has('cms.menu', count($items) - 1));
        $this->putJson('/api/admin/site-menu', ['version' => 3, 'action' => 'publish', 'items' => $items])->assertUnprocessable();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'publish', 'document' => $page['document']])->assertOk();
        $this->putJson('/api/admin/site-menu', ['version' => 3, 'action' => 'publish', 'items' => $items])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->has('cms.menu', count($items)));
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 2, 'action' => 'unpublish'])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->has('cms.menu', count($items) - 1));
        $this->get('/sitemap.xml')->assertDontSee('/informasi/kerja-sama');
        $this->putJson('/api/admin/site-menu', ['version' => 2, 'action' => 'save', 'items' => $items])->assertConflict();
    }

    public function test_invalid_urls_reserved_paths_and_foreign_content_fields_are_rejected(): void
    {
        $this->login();
        foreach (['/admin/test', '/api/test', '/uploads/test', '/profil', '/sitemap.xml', '/storage/photo', '//bad', '/informasi/../admin'] as $path) {
            $this->postJson('/api/admin/managed-pages', ['title' => 'Uji', 'path' => $path, 'template' => 'information'])->assertUnprocessable();
        }
        $page = $this->createPage();
        $document = $page['document'];
        $document['blocks'][0]['url'] = 'javascript:alert(1)';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'publish', 'document' => $document])->assertUnprocessable();
        $document['blocks'][0]['url'] = '/admin/arsip/secret.pdf';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'publish', 'document' => $document])->assertUnprocessable();
        $document['blocks'][0]['url'] = '';
        $document['fields']['unknown'] = 'Inject';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'publish', 'document' => $document])->assertUnprocessable();
        $profile = DB::table('managed_pages')->where('path', '/profil')->first();
        $this->putJson('/api/admin/managed-pages/'.$profile->id, ['version' => 1, 'action' => 'delete'])->assertUnprocessable();
        $this->assertDatabaseHas('managed_pages', ['path' => '/profil', 'deleted_at' => null]);
    }

    public function test_builtin_copy_and_structured_lists_publish_without_touching_source_data(): void
    {
        $this->login();
        $page = DB::table('managed_pages')->where('path', '/informasi/sinta')->first();
        $document = ManagedContent::decode($page->draft);
        $catalog = ManagedContent::catalog();
        $field = $catalog['pages'][$page->path]['fields'][0];
        $document['fields'][$field] = 'Judul yang diperbarui';
        $list = $catalog['collections']['collection_sinta_tautan']['default'];
        $list[] = ['label' => 'Tautan baru', 'href' => 'https://example.com', 'keterangan' => 'Informasi tambahan'];
        $document['collections']['collection_sinta_tautan'] = $list;
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'publish', 'document' => $document])->assertOk();
        $this->get('/informasi/sinta')->assertInertia(fn (Assert $view) => $view->where('cms.fields.'.$field, 'Judul yang diperbarui')->has('cms.collections.collection_sinta_tautan', count($list)));
        $document['collections']['collection_sinta_tautan'][0]['href'] = '//evil.test';
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 2, 'action' => 'save', 'document' => $document])->assertUnprocessable();
        $this->assertDatabaseCount('Admin', 1);
    }

    public function test_draft_upload_is_not_public_until_the_page_is_published(): void
    {
        $this->login();
        $page = $this->createPage();
        $name = Str::uuid().'.png';
        DB::table('UploadAsset')->insert(['id' => (string) Str::uuid(), 'name' => $name, 'size' => 1, 'sha256' => str_repeat('0', 64), 'visibility' => 'public', 'actorId' => auth()->id(), 'createdAt' => now()]);
        $url = '/uploads/'.$name;
        $document = $page['document'];
        $document['blocks'][0]['type'] = 'image';
        $document['blocks'][0]['url'] = $url;
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'save', 'document' => $document])->assertOk();
        $this->assertFalse(ManagedContent::referencesPublishedAsset($url));
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 2, 'action' => 'publish', 'document' => $document])->assertOk();
        $this->assertTrue(ManagedContent::referencesPublishedAsset($url));
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 3, 'action' => 'unpublish'])->assertOk();
        $this->assertFalse(ManagedContent::referencesPublishedAsset($url));
    }

    public function test_archived_custom_pages_can_be_recovered_without_publishing_them(): void
    {
        $this->login();
        $page = $this->createPage();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'delete'])->assertOk();
        $this->get('/informasi/kerja-sama')->assertNotFound();
        $this->get('/admin/halaman/'.$page['id'])->assertNotFound();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 2, 'action' => 'recover'])->assertOk()->assertJsonPath('page.published', false);
        $this->get('/admin/halaman/'.$page['id'])->assertOk();
        $this->get('/informasi/kerja-sama')->assertNotFound();
    }

    public function test_every_builtin_public_page_has_a_working_content_editor(): void
    {
        $this->login();
        $catalog = ManagedContent::catalog();
        foreach ($catalog['pages'] as $path => $definition) {
            $page = DB::table('managed_pages')->where('path', $path)->first();
            $this->get('/admin/halaman/'.$page->id)->assertOk()->assertInertia(fn (Assert $view) => $view->component('Admin/Pages/Edit')->where('managedPage.path', $path));
            $field = collect($definition['fields'])->first(fn ($key) => $catalog['fields'][$key]['type'] === 'text');
            $this->assertNotNull($field, 'Missing content fields for '.$path);
            $document = ManagedContent::decode($page->draft);
            $document['fields'][$field] = 'Perubahan halaman '.$path;
            $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'publish', 'document' => $document])->assertOk();
            $this->get($path === '@global' ? '/' : $path)->assertOk()->assertInertia(fn (Assert $view) => $view->where('cms.fields.'.$field, 'Perubahan halaman '.$path));
        }
    }

    public function test_data_editors_only_list_the_selected_group_and_schedule(): void
    {
        $this->login();
        foreach (['rekap-batch-1-penelitian', 'rekap-batch-1-pkm'] as $group) {
            $this->postJson('/api/admin/stat-entries', ['group' => $group, 'label' => 'Diajukan', 'value' => 12, 'order' => 0, 'published' => true])->assertCreated();
        }
        $this->getJson('/api/admin/stat-entries?group=rekap-batch-1-penelitian')->assertOk()->assertJsonCount(1)->assertJsonPath('0.group', 'rekap-batch-1-penelitian');
        $period = $this->postJson('/api/admin/acara-periode', ['acara' => 'monev', 'tahun' => 2026, 'judul' => 'Monev 2026', 'tanggalMulai' => '2026-10-13'])->assertCreated()->json('id');
        $scheme = $this->postJson('/api/admin/acara-skema', ['acara' => 'monev', 'periodeId' => $period, 'nama' => 'Internal'])->assertCreated()->json('id');
        foreach (['adbis', 'teknik'] as $jurusan) {
            $this->postJson('/api/admin/monev-slot', ['periodeId' => $period, 'skemaId' => $scheme, 'acara' => 'monev', 'jurusan' => $jurusan, 'sesi' => 'penelitian', 'tanggal' => '2026-10-13', 'mulai' => '08:00', 'selesai' => '09:00', 'nama' => 'Pemakalah uji', 'prodi' => 'Prodi uji', 'order' => 0, 'published' => true])->assertCreated();
        }
        $this->getJson('/api/admin/monev-slot?acara=monev&jurusan=teknik&sesi=penelitian')->assertOk()->assertJsonCount(1)->assertJsonPath('0.jurusan', 'teknik');
    }
}
