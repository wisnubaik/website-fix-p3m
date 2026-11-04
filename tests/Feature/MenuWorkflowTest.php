<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class MenuWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $this->login();
    }

    private function login(string $role = 'SUPERADMIN'): void
    {
        $admin = Admin::factory()->create(['role' => $role]);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
    }

    private function page(): array
    {
        return $this->postJson('/api/admin/managed-pages', ['title' => 'Layanan baru', 'path' => '/layanan-baru', 'template' => 'information'])->assertCreated()->json('page');
    }

    private function item(string $pageId): array
    {
        return ['id' => (string) Str::uuid(), 'label' => 'Layanan baru', 'pageId' => $pageId, 'href' => '', 'visible' => true, 'children' => []];
    }

    public function test_new_page_can_be_saved_in_menu_draft_before_publishing_and_status_refresh_is_read_only(): void
    {
        $page = $this->page();
        $published = DB::table('site_navigation')->where('id', 'main')->value('published');
        $item = $this->item($page['id']);
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'save', 'items' => [$item]])->assertOk()->assertJsonPath('navigation.version', 2);
        $this->assertSame($published, DB::table('site_navigation')->where('id', 'main')->value('published'));
        $this->putJson('/api/admin/site-menu', ['version' => 2, 'action' => 'publish', 'items' => [$item]])->assertUnprocessable()->assertJsonValidationErrors('items')->assertSee('Simpan draf menu terlebih dahulu');
        $menuBefore = DB::table('site_navigation')->where('id', 'main')->first();
        $pages = $this->getJson('/api/admin/site-menu')->assertOk()->json('pages');
        $this->assertFalse(collect($pages)->firstWhere('id', $page['id'])['published']);
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['version' => 1, 'action' => 'publish', 'document' => $page['document']])->assertOk();
        $pages = $this->getJson('/api/admin/site-menu')->assertOk()->json('pages');
        $this->assertTrue(collect($pages)->firstWhere('id', $page['id'])['published']);
        $this->assertEquals($menuBefore, DB::table('site_navigation')->where('id', 'main')->first());
        $this->putJson('/api/admin/site-menu', ['version' => 2, 'action' => 'publish', 'items' => [$item]])->assertOk()->assertJsonPath('navigation.hasChanges', false);
    }

    public function test_missing_destination_has_a_different_error_from_a_draft_destination(): void
    {
        $item = $this->item((string) Str::uuid());
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'save', 'items' => [$item]])->assertUnprocessable()->assertSee('tidak tersedia')->assertDontSee('masih draf');
    }

    public function test_hidden_parent_can_contain_an_unpublished_page(): void
    {
        $page = $this->page();
        $parent = $this->item('');
        $parent['visible'] = false;
        $parent['children'] = [$this->item($page['id'])];
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'publish', 'items' => [$parent]])->assertOk();
        $this->assertNull(DB::table('managed_pages')->where('id', $page['id'])->value('published'));
    }

    public function test_menu_limits_are_explained_and_removing_an_item_allows_another_to_be_added(): void
    {
        $profile = DB::table('managed_pages')->where('path', '/profil')->value('id');
        $items = array_map(fn () => $this->item($profile), range(1, 20));
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'save', 'items' => $items])->assertOk();
        $items[] = $this->item($profile);
        $this->putJson('/api/admin/site-menu', ['version' => 2, 'action' => 'save', 'items' => $items])->assertUnprocessable()->assertSee('Maksimal 20 menu utama');
        array_shift($items);
        $this->putJson('/api/admin/site-menu', ['version' => 2, 'action' => 'save', 'items' => $items])->assertOk();
        $this->putJson('/api/admin/site-menu', ['version' => 3, 'action' => 'save', 'items' => []])->assertOk()->assertJsonCount(0, 'navigation.items');
    }

    public function test_restoring_menu_only_replaces_its_draft_and_stale_saves_are_rejected(): void
    {
        $page = $this->page();
        $pagesBefore = DB::table('managed_pages')->orderBy('id')->get()->toJson();
        $published = DB::table('site_navigation')->where('id', 'main')->value('published');
        $item = $this->item($page['id']);
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'save', 'items' => [$item]])->assertOk();
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'discard', 'items' => [$item]])->assertConflict();
        $this->putJson('/api/admin/site-menu', ['version' => 2, 'action' => 'discard', 'items' => [$item]])->assertOk()->assertJsonPath('navigation.items', ManagedContent::decode($published));
        $this->assertSame($published, DB::table('site_navigation')->where('id', 'main')->value('published'));
        $this->assertSame($pagesBefore, DB::table('managed_pages')->orderBy('id')->get()->toJson());
        $this->assertDatabaseHas('ActivityLog', ['resource' => 'site-navigation', 'action' => 'discard']);
    }

    public function test_page_status_refresh_and_menu_mutations_remain_superadmin_only(): void
    {
        $this->login('ADMIN');
        $this->getJson('/api/admin/site-menu')->assertForbidden();
        $this->putJson('/api/admin/site-menu', ['version' => 1, 'action' => 'save', 'items' => []])->assertForbidden();
    }
}
