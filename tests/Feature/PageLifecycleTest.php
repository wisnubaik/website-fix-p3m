<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PageLifecycleTest extends TestCase
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

    private function page(string $template = 'information', string $path = '/halaman-uji'): array
    {
        return $this->postJson('/api/admin/managed-pages', ['title' => 'Halaman uji', 'path' => $path, 'template' => $template])->assertCreated()->json('page');
    }

    private function item(string $id, array $children = []): array
    {
        return ['id' => (string) Str::uuid(), 'label' => 'Menu uji', 'pageId' => $id, 'href' => '', 'visible' => true, 'children' => $children];
    }

    public function test_embedded_preview_is_same_origin_only_and_does_not_relax_admin_or_public_headers(): void
    {
        $this->get('/?cms_preview=1')->assertOk()->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Content-Security-Policy', "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'");
        $this->get('/')->assertOk()->assertHeader('X-Frame-Options', 'DENY');
        $this->get('/admin/menu?cms_preview=1')->assertOk()->assertHeader('X-Frame-Options', 'DENY');
        $this->login('ADMIN');
        $this->get('/?cms_preview=1')->assertForbidden();
    }

    public function test_all_templates_start_as_editable_drafts_without_fabricated_content(): void
    {
        $this->getJson('/api/admin/site-menu')->assertOk()->assertJsonCount(4, 'templates');
        foreach (['information' => 3, 'service' => 5, 'documents' => 2, 'news' => 3] as $template => $count) {
            $page = $this->page($template, '/template-'.$template);
            $this->assertFalse($page['published']);
            $this->assertCount($count, $page['document']['blocks']);
            foreach ($page['document']['blocks'] as $block) {
                $this->assertSame('', $block['text']);
                $this->assertSame('', $block['url']);
                $this->assertSame([], $block['items']);
            }
            $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'save', 'version' => 1, 'document' => $page['document']])->assertOk();
            $this->get($page['path'])->assertNotFound();
            $this->get($page['path'].'?cms_preview=1')->assertOk();
        }
    }

    public function test_duplicate_copies_saved_draft_but_not_publication_menu_or_block_ids(): void
    {
        $page = $this->page('service');
        $document = $page['document'];
        $document['blocks'][0]['text'] = 'Isi layanan tersimpan';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'publish', 'version' => 1, 'document' => $document])->assertOk();
        $document['blocks'][0]['text'] = 'Perubahan draf terakhir';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'save', 'version' => 2, 'document' => $document])->assertOk();
        $menu = DB::table('site_navigation')->first();
        $request = ['title' => 'Salinan layanan', 'path' => '/salinan', 'template' => 'information', 'sourceId' => $page['id'], 'sourceVersion' => 2];
        $this->postJson('/api/admin/managed-pages', $request)->assertConflict();
        $request['sourceVersion'] = 3;
        $copy = $this->postJson('/api/admin/managed-pages', $request)->assertCreated()->json('page');
        $this->assertFalse($copy['published']);
        $this->assertSame('service', $copy['template']);
        $this->assertSame('Salinan layanan', $copy['document']['title']);
        $this->assertSame('Perubahan draf terakhir', $copy['document']['blocks'][0]['text']);
        $this->assertNotSame($page['document']['blocks'][0]['id'], $copy['document']['blocks'][0]['id']);
        $this->assertEquals($menu, DB::table('site_navigation')->first());
        $this->get('/halaman-uji')->assertInertia(fn (Assert $view) => $view->where('pageDocument.blocks.0.text', 'Isi layanan tersimpan'));
        $this->get('/salinan')->assertNotFound();
    }

    public function test_attach_only_changes_menu_draft_and_rejects_duplicates_and_stale_versions(): void
    {
        $page = $this->page();
        $menu = DB::table('site_navigation')->first();
        $root = ManagedContent::decode($menu->draft)[0];
        $request = ['pageId' => $page['id'], 'version' => $menu->version, 'parentId' => $root['id'], 'label' => 'Layanan tambahan'];
        $this->postJson('/api/admin/site-menu/attach', $request)->assertOk();
        $after = DB::table('site_navigation')->first();
        $this->assertSame($menu->published, $after->published);
        $children = ManagedContent::decode($after->draft)[0]['children'];
        $this->assertSame($page['id'], end($children)['pageId']);
        $this->assertNull(DB::table('managed_pages')->where('id', $page['id'])->value('published'));
        $this->postJson('/api/admin/site-menu/attach', $request)->assertConflict();
        $request['version']++;
        $this->postJson('/api/admin/site-menu/attach', $request)->assertUnprocessable();
        $this->assertEquals($after, DB::table('site_navigation')->first());
    }

    public function test_attach_rejects_missing_parents_and_full_root_or_submenu(): void
    {
        $page = $this->page();
        $request = ['pageId' => $page['id'], 'version' => 1, 'parentId' => (string) Str::uuid(), 'label' => 'Baru'];
        $this->postJson('/api/admin/site-menu/attach', $request)->assertUnprocessable();
        $profile = DB::table('managed_pages')->where('path', '/profil')->value('id');
        $roots = array_map(fn () => $this->item($profile), range(1, 20));
        $this->putJson('/api/admin/site-menu', ['action' => 'save', 'version' => 1, 'items' => $roots])->assertOk();
        $request['version'] = 2;
        $request['parentId'] = null;
        $this->postJson('/api/admin/site-menu/attach', $request)->assertUnprocessable();
        $roots[0]['children'] = array_map(fn () => $this->item($profile), range(1, 30));
        $this->putJson('/api/admin/site-menu', ['action' => 'save', 'version' => 2, 'items' => $roots])->assertOk();
        $request['version'] = 3;
        $request['parentId'] = $roots[0]['id'];
        $this->postJson('/api/admin/site-menu/attach', $request)->assertUnprocessable();
    }

    public function test_trash_recover_and_republish_preserve_content_and_menu_placement(): void
    {
        $page = $this->page();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'publish', 'version' => 1, 'document' => $page['document']])->assertOk();
        $items = [$this->item($page['id'])];
        $this->putJson('/api/admin/site-menu', ['action' => 'publish', 'version' => 1, 'items' => $items])->assertOk();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'delete', 'version' => 2])->assertOk();
        $this->get('/halaman-uji')->assertNotFound();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->has('cms.menu', 0));
        $this->putJson('/api/admin/site-menu', ['action' => 'save', 'version' => 2, 'items' => $items])->assertOk();
        $this->putJson('/api/admin/site-menu', ['action' => 'publish', 'version' => 3, 'items' => $items])->assertUnprocessable()->assertSee('Sampah');
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'recover', 'version' => 3])->assertOk()->assertJsonPath('page.published', false)->assertJsonPath('page.document', $page['document']);
        $this->get('/halaman-uji')->assertNotFound();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'publish', 'version' => 4, 'document' => $page['document']])->assertOk();
        $this->get('/halaman-uji')->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->where('cms.menu.0.href', '/halaman-uji'));
    }

    public function test_permanent_delete_requires_trash_confirmation_and_current_version(): void
    {
        $page = $this->page();
        $request = ['action' => 'purge', 'version' => 1, 'confirmPath' => $page['path']];
        $this->putJson('/api/admin/managed-pages/'.$page['id'], $request)->assertUnprocessable();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'delete', 'version' => 1])->assertOk();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], $request)->assertConflict();
        $request['version'] = 2;
        $request['confirmPath'] = '/wrong';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], $request)->assertUnprocessable();
        $this->assertDatabaseHas('managed_pages', ['id' => $page['id']]);
        $request['confirmPath'] = $page['path'];
        $this->putJson('/api/admin/managed-pages/'.$page['id'], $request)->assertOk()->assertJsonPath('deleted', true);
        $this->assertDatabaseMissing('managed_pages', ['id' => $page['id']]);
        $this->assertDatabaseHas('ActivityLog', ['action' => 'delete-permanent', 'resource' => 'managed-pages']);
    }

    public function test_permanent_delete_preserves_other_pages_children_uploads_accounts_and_unpublished_menu_edits(): void
    {
        $page = $this->page();
        $other = $this->page('documents', '/tetap-ada');
        $document = $page['document'];
        $document['blocks'][0]['text'] = 'Teks diubah';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'publish', 'version' => 1, 'document' => $document])->assertOk();
        $this->putJson('/api/admin/managed-pages/'.$other['id'], ['action' => 'publish', 'version' => 1, 'document' => $other['document']])->assertOk();
        $items = [$this->item($page['id'], [$this->item($other['id']), $this->item($page['id'])]), $this->item($page['id']), $this->item($other['id'])];
        $this->putJson('/api/admin/site-menu', ['action' => 'publish', 'version' => 1, 'items' => $items])->assertOk();
        $items[2]['label'] = 'Nama yang belum diterbitkan';
        $this->putJson('/api/admin/site-menu', ['action' => 'save', 'version' => 2, 'items' => $items])->assertOk();
        $otherBefore = DB::table('managed_pages')->where('id', $other['id'])->first();
        $accounts = DB::table('Admin')->get()->toJson();
        $assets = DB::table('UploadAsset')->get()->toJson();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'delete', 'version' => 2])->assertOk();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'purge', 'version' => 3, 'confirmPath' => $page['path']])->assertOk();
        $menu = DB::table('site_navigation')->first();
        $draft = ManagedContent::decode($menu->draft);
        $published = ManagedContent::decode($menu->published);
        $this->assertCount(2, $draft);
        $this->assertSame('', $draft[0]['pageId']);
        $this->assertCount(1, $draft[0]['children']);
        $this->assertSame($other['id'], $draft[0]['children'][0]['pageId']);
        $this->assertSame('Nama yang belum diterbitkan', $draft[1]['label']);
        $this->assertSame('Menu uji', $published[1]['label']);
        $this->assertSame(4, (int) $menu->version);
        $this->assertEquals($otherBefore, DB::table('managed_pages')->where('id', $other['id'])->first());
        $this->assertSame($accounts, DB::table('Admin')->get()->toJson());
        $this->assertSame($assets, DB::table('UploadAsset')->get()->toJson());
        $this->assertDatabaseMissing('managed_page_revisions', ['page_id' => $page['id']]);
        $this->get('/tetap-ada')->assertOk();
        $this->putJson('/api/admin/site-menu', ['action' => 'save', 'version' => 3, 'items' => $items])->assertConflict();
    }

    public function test_rich_text_survives_save_publish_and_duplicate_with_safe_links_and_empty_paragraphs(): void
    {
        $page = $this->page();
        $document = $page['document'];
        $rich = [
            ['type' => 'paragraph', 'runs' => [['text' => 'Judul ', 'bold' => true], ['text' => 'miring', 'italic' => true]]],
            ['type' => 'paragraph', 'runs' => []],
            ['type' => 'bullet', 'runs' => [['text' => 'Profil', 'url' => '/profil']]],
            ['type' => 'number', 'runs' => [['text' => '<script>alert(1)</script>']]],
        ];
        $document['blocks'][0]['richText'] = $rich;
        $document['blocks'][0]['text'] = 'Fallback yang tidak sesuai';
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'publish', 'version' => 1, 'document' => $document])->assertOk()->assertJsonPath('page.document.blocks.0.richText', fn ($value) => $value == $rich)->assertJsonPath('page.document.blocks.0.text', "Judul miring\n\nProfil\n<script>alert(1)</script>");
        $this->get('/halaman-uji')->assertInertia(fn (Assert $view) => $view->where('pageDocument.blocks.0.richText.0.runs.0.text', 'Judul ')->where('pageDocument.blocks.0.richText.0.runs.0.bold', true));
        $this->postJson('/api/admin/managed-pages', ['title' => 'Salinan', 'path' => '/salinan', 'template' => 'information', 'sourceId' => $page['id'], 'sourceVersion' => 2])->assertCreated()->assertJsonPath('page.document.blocks.0.richText', fn ($value) => $value == $rich);
    }

    public function test_rich_text_rejects_invalid_links_unknown_attributes_and_excessive_total_length(): void
    {
        $page = $this->page();
        foreach (['javascript:alert(1)', '//evil.test', '/admin/akun', '/belum-ada'] as $url) {
            $document = $page['document'];
            $document['blocks'][0]['richText'] = [['type' => 'paragraph', 'runs' => [['text' => 'Klik', 'url' => $url]]]];
            $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'save', 'version' => 1, 'document' => $document])->assertUnprocessable();
        }
        $document['blocks'][0]['richText'] = [['type' => 'paragraph', 'runs' => [['text' => 'Teks', 'onclick' => 'alert(1)']]]];
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'save', 'version' => 1, 'document' => $document])->assertUnprocessable();
        $document['blocks'][0]['richText'] = [['type' => 'paragraph', 'runs' => [['text' => str_repeat('a', 8000)], ['text' => str_repeat('b', 8000)]]]];
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'save', 'version' => 1, 'document' => $document])->assertUnprocessable();
        $this->assertDatabaseHas('managed_pages', ['id' => $page['id'], 'version' => 1]);
    }

    public function test_builtin_protection_and_existing_permissions_apply_to_new_actions(): void
    {
        $profile = DB::table('managed_pages')->where('path', '/profil')->first();
        foreach (['delete', 'purge', 'recover'] as $action) {
            $this->putJson('/api/admin/managed-pages/'.$profile->id, ['action' => $action, 'version' => 1, 'confirmPath' => '/profil'])->assertUnprocessable();
        }
        $this->postJson('/api/admin/managed-pages', ['title' => 'Salinan profil', 'path' => '/salinan-profil', 'template' => 'information', 'sourceId' => $profile->id, 'sourceVersion' => 1])->assertUnprocessable();
        $page = $this->page();
        $this->login('ADMIN');
        $this->postJson('/api/admin/site-menu/attach', ['pageId' => $page['id'], 'version' => 1, 'parentId' => null, 'label' => 'Uji'])->assertForbidden();
        $this->putJson('/api/admin/managed-pages/'.$page['id'], ['action' => 'purge', 'version' => 1, 'confirmPath' => $page['path']])->assertForbidden();
        $this->postJson('/api/admin/managed-pages', ['title' => 'Salinan', 'path' => '/salinan', 'template' => 'information', 'sourceId' => $page['id'], 'sourceVersion' => 1])->assertForbidden();
        $this->assertDatabaseHas('managed_pages', ['path' => '/profil', 'deleted_at' => null]);
    }
}
