<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\CmsReset;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CmsResetTest extends TestCase
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

    private function page(string $path): object
    {
        return DB::table('managed_pages')->where('path', $path)->first();
    }

    private function preview(string $scope, ?string $backupId = null): array
    {
        $this->withHeader('X-CMS-Generation', (string) DB::table('cms_reset_state')->where('id', 'content')->value('generation'));

        return $this->postJson('/api/admin/cms-reset/preview', ['scope' => $scope, 'backupId' => $backupId])->assertOk()->json();
    }

    private function runReset(string $scope, ?string $backupId = null): string
    {
        $preview = $this->preview($scope, $backupId);
        $result = $this->postJson('/api/admin/cms-reset/execute', [...$preview, 'confirmation' => $preview['phrase']])->assertOk()->json();

        return $result['backupId'];
    }

    private function initialContent(): void
    {
        foreach (CmsReset::defaults()['tables'] as $table => $rows) {
            foreach (array_chunk($rows, 50) as $chunk) {
                DB::table($table)->insert($chunk);
            }
        }
    }

    public function test_schedule_defaults_keep_uniform_columns_and_combined_semhas_sessions(): void
    {
        $rows = CmsReset::defaults()['tables']['MonevSlot'];
        $columns = array_keys($rows[0]);
        sort($columns);
        foreach ($rows as $row) {
            $actual = array_keys($row);
            sort($actual);
            $this->assertSame($columns, $actual, 'Mixed columns would break batch inserts during reset.');
        }
        $semhas = collect($rows)->where('acara', 'semhas')->filter(fn ($row) => str_starts_with($row['tanggal'], '2026-'));
        $this->assertCount(133, $semhas);
        $this->assertCount(16, $semhas->filter(fn ($row) => ! empty($row['catatan'])));
        $this->assertCount(125, $semhas->unique(fn ($row) => $row['tanggal'].'|'.$row['mulai'].'|'.$row['selesai'].'|'.$row['nama']));
    }

    public function test_installation_does_not_reset_content_and_only_superadmin_can_access_actions(): void
    {
        $this->assertDatabaseCount('Announcement', 0);
        $this->assertDatabaseCount('cms_reset_backups', 0);
        $this->login('ADMIN');
        $this->get('/admin/reset-konten')->assertForbidden();
        $this->postJson('/api/admin/cms-reset/preview', ['scope' => 'all'])->assertForbidden();
        $this->postJson('/api/admin/cms-reset/execute', ['scope' => 'all'])->assertForbidden();
        $admin = $this->login();
        $this->get('/admin/reset-konten')->assertInertia(fn (Assert $view) => $view->component('Admin/Reset')->has('resetPages', 26)->has('backups.data', 0));
        $admin->update(['mustChangePassword' => true]);
        $this->postJson('/api/admin/cms-reset/preview', ['scope' => 'all'])->assertForbidden();
    }

    public function test_single_page_reset_restores_its_data_and_does_not_touch_other_pages_menu_or_accounts(): void
    {
        $admin = $this->login();
        $this->initialContent();
        $announcement = (array) DB::table('Announcement')->first();
        $announcement['title'] = 'Pengumuman milik admin';
        DB::table('Announcement')->where('id', $announcement['id'])->update($announcement);
        $profile = $this->page('/profil');
        DB::table('managed_pages')->where('id', $profile->id)->update(['published' => null, 'draft' => json_encode(['title' => 'Profil yang diubah'])]);
        DB::table('ContentListItem')->where('section', 'profil-visi')->update(['text' => 'Visi diubah']);
        DB::table('ProfileTableContent')->update(['version' => 15]);
        $menu = (array) DB::table('site_navigation')->first();
        $before = CmsReset::capture($profile->id);
        $backup = $this->runReset($profile->id);
        $this->assertSame($before, CmsReset::backup($backup));
        $this->assertDatabaseHas('Announcement', $announcement);
        $this->assertSame($menu, (array) DB::table('site_navigation')->first());
        $this->assertDatabaseHas('Admin', ['id' => $admin->id, 'isActive' => 1]);
        $this->assertNotNull($this->page('/profil')->published);
        $this->assertSame(16, DB::table('ProfileTableContent')->min('version'));
        $this->assertFalse(DB::table('ContentListItem')->where('text', 'Visi diubah')->exists());
        $this->assertDatabaseHas('ActivityLog', ['resource' => 'cms-reset', 'action' => 'reset']);
        $this->runReset($profile->id, $backup);
        $this->assertNull($this->page('/profil')->published);
        $this->assertDatabaseHas('ContentListItem', ['section' => 'profil-visi', 'text' => 'Visi diubah']);
        $this->assertSame(17, DB::table('ProfileTableContent')->min('version'));
        $this->assertDatabaseCount('cms_reset_backups', 2);
    }

    public function test_global_reset_and_restore_preserve_internal_records_accounts_uploads_and_logs(): void
    {
        $admin = $this->login();
        $this->initialContent();
        $stamp = now()->format('Y-m-d H:i:s');
        DB::table('ArchiveBlock')->insert(['id' => 'internal', 'page' => 'internal', 'blockType' => 'text', 'body' => 'Jangan berubah', 'createdAt' => $stamp, 'updatedAt' => $stamp]);
        DB::table('UploadAsset')->insert(['id' => 'asset', 'name' => 'saved.pdf', 'size' => 1, 'sha256' => str_repeat('0', 64), 'visibility' => 'public', 'actorId' => $admin->id, 'createdAt' => $stamp]);
        DB::table('ActivityLog')->insert(['id' => 'old-log', 'adminId' => $admin->id, 'username' => $admin->email, 'action' => 'old', 'resource' => 'old', 'createdAt' => $stamp]);
        $protected = [];
        foreach (['Admin', 'ArchiveBlock', 'UploadAsset'] as $table) {
            $protected[$table] = DB::table($table)->get()->toArray();
        }
        $custom = $this->postJson('/api/admin/managed-pages', ['title' => 'Halaman kampus', 'path' => '/uji-kampus', 'template' => 'news'])->assertCreated()->json('page');
        $this->putJson('/api/admin/managed-pages/'.$custom['id'], ['version' => 1, 'action' => 'publish', 'document' => $custom['document']])->assertOk();
        DB::table('SiteSettings')->update(['institution' => 'Nama yang diubah']);
        DB::table('Announcement')->delete();
        $before = CmsReset::capture('all');
        $backup = $this->runReset('all');
        $this->assertSame($before, CmsReset::backup($backup));
        $this->assertNotNull($this->page('/uji-kampus')->deleted_at);
        $this->assertNull($this->page('/uji-kampus')->published);
        $this->assertDatabaseCount('Announcement', count(CmsReset::defaults()['tables']['Announcement']));
        $this->runReset('all', $backup);
        $this->assertNull($this->page('/uji-kampus')->deleted_at);
        $this->assertNotNull($this->page('/uji-kampus')->published);
        $this->assertDatabaseHas('SiteSettings', ['institution' => 'Nama yang diubah']);
        $this->assertDatabaseCount('Announcement', 0);
        foreach ($protected as $table => $rows) {
            $this->assertEquals($rows, DB::table($table)->get()->toArray());
        }
        $this->assertDatabaseHas('ActivityLog', ['id' => 'old-log', 'action' => 'old']);
        $this->assertDatabaseCount('cms_reset_backups', 2);
    }

    public function test_changed_data_or_missing_confirmation_cannot_run_reset(): void
    {
        $this->login();
        $preview = $this->preview('all');
        $this->postJson('/api/admin/cms-reset/execute', [...$preview, 'confirmation' => 'RESET'])->assertUnprocessable();
        DB::table('managed_pages')->where('path', '/profil')->increment('version');
        $this->postJson('/api/admin/cms-reset/execute', [...$preview, 'confirmation' => 'RESET SITUS'])->assertConflict();
        $this->assertDatabaseCount('cms_reset_backups', 0);
        $this->assertDatabaseCount('Announcement', 0);
        $this->postJson('/api/admin/cms-reset/preview', ['scope' => 'Admin'])->assertNotFound();
    }

    public function test_menu_only_reset_preserves_page_content_and_status_and_can_be_undone(): void
    {
        $this->login();
        $profile = $this->page('/profil');
        DB::table('managed_pages')->where('id', $profile->id)->update(['published' => null]);
        DB::table('site_navigation')->update(['draft' => '[]', 'published' => '[]']);
        $backup = $this->runReset('menu');
        $this->assertNull($this->page('/profil')->published);
        $this->assertNotEmpty(ManagedContent::decode(DB::table('site_navigation')->value('published')));
        $this->runReset('menu', $backup);
        $this->assertSame('[]', DB::table('site_navigation')->value('published'));
    }

    public function test_stale_tabs_cannot_save_after_reset_but_accounts_keep_working(): void
    {
        $this->login();
        $profile = $this->page('/profil');
        $this->runReset($profile->id);
        $this->withHeader('X-CMS-Generation', '0');
        $this->postJson('/api/admin/riset-grup', ['nama' => 'Stale'])->assertConflict();
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'discard'])->assertConflict();
        $this->post('/admin/riset-entries', [])->assertStatus(409);
        $this->getJson('/api/admin/account')->assertOk();
        $this->withHeader('X-CMS-Generation', '1');
        $this->postJson('/api/admin/riset-grup', [])->assertUnprocessable();
    }

    public function test_research_page_reset_is_scoped_to_its_category_and_shared_contact_is_preserved(): void
    {
        $this->login();
        $this->initialContent();
        DB::table('RisetEntry')->where('category', 'pkm-internal')->update(['title' => 'Data PkM tetap']);
        DB::table('RisetEntry')->where('category', 'penelitian-internal')->update(['title' => 'Data reset']);
        $this->runReset($this->page('/penelitian/internal')->id);
        $this->assertDatabaseHas('RisetEntry', ['category' => 'pkm-internal', 'title' => 'Data PkM tetap']);
        $this->assertFalse(DB::table('RisetEntry')->where('title', 'Data reset')->exists());
        DB::table('SiteSettings')->update(['email' => 'tetap@example.com']);
        $this->runReset($this->page('/hubungi')->id);
        $this->assertDatabaseHas('SiteSettings', ['email' => 'tetap@example.com']);
    }

    public function test_custom_page_reset_uses_its_template_and_keeps_it_as_draft(): void
    {
        $this->login();
        $custom = $this->postJson('/api/admin/managed-pages', ['title' => 'Program baru', 'path' => '/program-baru', 'template' => 'service'])->assertCreated()->json('page');
        $doc = $custom['document'];
        $doc['blocks'][0]['text'] = 'Isi halaman';
        $this->putJson('/api/admin/managed-pages/'.$custom['id'], ['version' => 1, 'action' => 'publish', 'document' => $doc])->assertOk();
        $backup = $this->runReset($custom['id']);
        $page = $this->page('/program-baru');
        $this->assertNull($page->published);
        $this->assertSame('Program baru', ManagedContent::decode($page->draft)['title']);
        $this->assertSame('', ManagedContent::decode($page->draft)['blocks'][0]['text']);
        $this->runReset($custom['id'], $backup);
        $this->assertSame('Isi halaman', ManagedContent::decode($this->page('/program-baru')->published)['blocks'][0]['text']);
    }

    public function test_failed_reset_rolls_back_backup_content_and_generation(): void
    {
        $this->login();
        $this->initialContent();
        DB::table('DocumentItem')->where('id', 'revision-profil-image-1')->update(['section' => 'repository']);
        $before = CmsReset::capture('all');
        $preview = $this->preview($this->page('/profil')->id);
        $this->postJson('/api/admin/cms-reset/execute', [...$preview, 'confirmation' => 'RESET'])->assertConflict();
        $this->assertSame($before, CmsReset::capture('all'));
        $this->assertDatabaseCount('cms_reset_backups', 0);
        $this->assertDatabaseHas('cms_reset_state', ['generation' => 0]);
    }

    public function test_reset_invalidates_uncommitted_excel_imports(): void
    {
        $admin = $this->login();
        DB::table('cms_excel_imports')->insert(['id' => (string) Str::uuid(), 'admin_id' => $admin->id, 'resource' => 'riset-grup', 'definition' => '{}', 'payload' => '[]', 'expires_at' => now()->addHour(), 'created_at' => now()]);
        $this->runReset('menu');
        $this->assertDatabaseCount('cms_excel_imports', 0);
    }

    public function test_failure_after_content_writes_rolls_back_every_change_and_the_backup(): void
    {
        $this->login();
        $this->initialContent();
        DB::table('SiteSettings')->update(['institution' => 'Belum reset']);
        $before = CmsReset::capture('all');
        $preview = $this->preview('all');
        DB::listen(function ($query): void {
            if (str_starts_with(strtolower($query->sql), 'insert into') && str_contains($query->sql, 'ActivityLog')) {
                throw new \RuntimeException('Simulasi kegagalan penyimpanan log.');
            }
        });
        $this->postJson('/api/admin/cms-reset/execute', [...$preview, 'confirmation' => 'RESET SITUS'])->assertStatus(500);
        $this->assertSame($before, CmsReset::capture('all'));
        $this->assertDatabaseCount('cms_reset_backups', 0);
        $this->assertDatabaseHas('cms_reset_state', ['generation' => 0]);
    }

    public function test_a_custom_page_can_be_restored_even_after_permanent_deletion(): void
    {
        $this->login();
        $page = $this->postJson('/api/admin/managed-pages', ['title' => 'Halaman sementara', 'path' => '/sementara', 'template' => 'news'])->assertCreated()->json('page');
        $backup = $this->runReset($page['id']);
        DB::table('managed_pages')->where('id', $page['id'])->delete();
        $undo = $this->runReset($page['id'], $backup);
        $this->assertDatabaseHas('managed_pages', ['id' => $page['id'], 'path' => '/sementara', 'deleted_at' => null]);
        $this->runReset($page['id'], $undo);
        $this->assertNotNull($this->page('/sementara')->deleted_at);
    }

    public function test_corrupt_backup_is_rejected_without_writing_data(): void
    {
        $this->login();
        $backup = $this->runReset('menu');
        DB::table('cms_reset_backups')->where('id', $backup)->update(['snapshot' => 'rusak']);
        $this->withHeader('X-CMS-Generation', '1');
        $this->postJson('/api/admin/cms-reset/preview', ['scope' => 'menu', 'backupId' => $backup])->assertUnprocessable();
        $this->assertDatabaseCount('cms_reset_backups', 1);
        $this->assertDatabaseHas('cms_reset_state', ['generation' => 1]);
    }

    public function test_every_builtin_page_remains_readable_after_global_reset(): void
    {
        $this->login();
        $this->runReset('all');
        foreach (array_keys(CmsReset::defaults()['pages']) as $path) {
            if ($path !== '@global') {
                $this->get($path)->assertOk();
            }
        }
        foreach (DB::table('managed_pages')->get() as $page) {
            $this->get('/admin/halaman/'.$page->id)->assertOk();
            $this->assertIsArray(CmsReset::scopes($page->id));
        }
    }
}
