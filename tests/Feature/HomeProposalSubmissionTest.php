<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\CmsReset;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeProposalSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private const TITLE = 'f_fd095e662366d1';

    private const DESCRIPTION = 'f_c1d8d581292cf4';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $this->login('SUPERADMIN');
    }

    private function login(string $role): void
    {
        $admin = Admin::factory()->create(['role' => $role]);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
    }

    private function correction(): object
    {
        return require database_path('migrations/2026_10_24_025517_correct_home_proposal_submission_defaults.php');
    }

    private function placeholders(): void
    {
        DB::table('TautanPengusulan')->insert([
            ['id' => 'cmukklcdj000200tu05gksr4f', 'label' => 'tes', 'href' => 'https://docs.google.com/forms/u/0/', 'order' => 0, 'published' => true],
            ['id' => 'cmukkm2ri000500tuuasl5ncs', 'label' => 'tes2', 'href' => 'https://docs.google.com/forms/u/0/', 'order' => 0, 'published' => true],
        ]);
    }

    public function test_default_copy_and_reset_links_match_the_source_section(): void
    {
        $fields = ManagedContent::catalog()['fields'];
        $this->assertSame('PPM Internal 2026', $fields[self::TITLE]['default']);
        $this->assertSame('', $fields[self::DESCRIPTION]['default']);
        $rows = CmsReset::defaults()['tables']['TautanPengusulan'];
        $this->assertSame(['Link Usulan Penelitian batch 2', 'Link Usulan PkM batch 2'], array_column($rows, 'label'));
        $this->assertSame(['https://forms.gle/ZGNH8XtjqfEwX6S38', 'https://forms.gle/asL8mudfPu96B2yU8'], array_column($rows, 'href'));
        $this->assertSame([0, 1], array_column($rows, 'order'));
        $home = DB::table('managed_pages')->where('path', '/')->first();
        $this->get('/admin/halaman/'.$home->id)->assertInertia(fn (Assert $page) => $page->where('fields', function ($items) {
            $copy = collect($items)->where('group', 'Pengusulan proposal')->keyBy('key');

            return $copy->has(self::TITLE) && $copy->has(self::DESCRIPTION)
                && ! $copy->has('f_930702d7dd7769') && ! $copy->has('f_44b6134e7bd899');
        }));
    }

    public function test_migration_replaces_only_placeholder_links_and_old_default_copy(): void
    {
        $this->placeholders();
        $home = DB::table('managed_pages')->where('path', '/')->first();
        $document = ManagedContent::decode($home->draft);
        $document['fields'][self::TITLE] = 'Pengusulan proposal sedang dibuka';
        $document['fields'][self::DESCRIPTION] = 'Ketentuan dan jadwal lengkap ada di';
        $document['fields']['f_b3973ad0cd14bb'] = 'Agenda milik kampus';
        DB::table('managed_pages')->where('id', $home->id)->update(['draft' => json_encode($document), 'published' => json_encode($document)]);
        $profile = DB::table('managed_pages')->where('path', '/profil')->first();
        $this->correction()->up();
        $after = DB::table('managed_pages')->where('id', $home->id)->first();
        $changed = ManagedContent::decode($after->published);
        $this->assertSame('PPM Internal 2026', $changed['fields'][self::TITLE]);
        $this->assertSame('', $changed['fields'][self::DESCRIPTION]);
        $this->assertSame('Agenda milik kampus', $changed['fields']['f_b3973ad0cd14bb']);
        $this->assertSame(2, (int) $after->version);
        $this->assertEquals($profile, DB::table('managed_pages')->where('id', $profile->id)->first());
        $this->get('/')->assertInertia(fn (Assert $page) => $page->has('tautanPengusulan', 2)
            ->where('tautanPengusulan.0.label', 'Link Usulan Penelitian batch 2')
            ->where('tautanPengusulan.1.href', 'https://forms.gle/asL8mudfPu96B2yU8'));
        $this->assertSame([0, 1], DB::table('TautanPengusulan')->orderBy('order')->pluck('order')->all());
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 1, 'action' => 'save', 'document' => $document])->assertConflict();
        $this->correction()->up();
        $this->assertEquals($after, DB::table('managed_pages')->where('id', $home->id)->first());
    }

    public function test_migration_preserves_custom_content_deleted_links_and_closed_publication(): void
    {
        $this->placeholders();
        DB::table('TautanPengusulan')->where('label', 'tes')->update(['label' => 'Usulan 2027', 'href' => 'https://example.org/form', 'published' => false]);
        DB::table('TautanPengusulan')->where('label', 'tes2')->update(['deletedAt' => now()]);
        $home = DB::table('managed_pages')->where('path', '/')->first();
        $doc = ManagedContent::decode($home->draft);
        $doc['fields'][self::TITLE] = 'PPM Internal 2027';
        $doc['fields'][self::DESCRIPTION] = 'Periode sudah ditutup.';
        DB::table('managed_pages')->where('id', $home->id)->update(['draft' => json_encode($doc), 'published' => null]);
        $before = DB::table('TautanPengusulan')->orderBy('id')->get()->all();
        $pageBefore = DB::table('managed_pages')->where('id', $home->id)->first();
        $this->correction()->up();
        $this->assertEquals($before, DB::table('TautanPengusulan')->orderBy('id')->get()->all());
        $this->assertEquals($pageBefore, DB::table('managed_pages')->where('id', $home->id)->first());
        DB::table('TautanPengusulan')->delete();
        $this->correction()->up();
        $this->assertDatabaseCount('TautanPengusulan', 0);
    }

    public function test_heading_and_description_can_be_created_edited_cleared_previewed_and_published(): void
    {
        $home = DB::table('managed_pages')->where('path', '/')->first();
        $doc = ManagedContent::decode($home->draft);
        $doc['fields'][self::TITLE] = 'PPM Internal 2027';
        $doc['fields'][self::DESCRIPTION] = "Keterangan resmi dari P3M.\nPeriksa ketentuan sebelum mengisi.";
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 1, 'action' => 'save', 'document' => $doc])->assertOk();
        $this->get('/?cms_preview=1')->assertInertia(fn (Assert $page) => $page->where('cms.fields.'.self::TITLE, 'PPM Internal 2027')->where('cms.fields.'.self::DESCRIPTION, $doc['fields'][self::DESCRIPTION]));
        $this->get('/')->assertInertia(fn (Assert $page) => $page->missing('cms.fields.'.self::TITLE));
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 2, 'action' => 'publish', 'document' => $doc])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('cms.fields.'.self::TITLE, 'PPM Internal 2027'));
        $doc['fields'][self::TITLE] = '';
        $doc['fields'][self::DESCRIPTION] = '';
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 3, 'action' => 'publish', 'document' => $doc])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('cms.fields.'.self::TITLE, '')->where('cms.fields.'.self::DESCRIPTION, ''));
        unset($doc['fields'][self::TITLE], $doc['fields'][self::DESCRIPTION]);
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 4, 'action' => 'publish', 'document' => $doc])->assertOk();
        $this->assertDatabaseHas('ActivityLog', ['resource' => 'managed-pages']);
    }

    public function test_link_crud_order_visibility_and_recovery_use_the_existing_rules(): void
    {
        $first = $this->postJson('/api/admin/tautan-pengusulan', ['label' => 'Penelitian', 'href' => 'https://forms.gle/ZGNH8XtjqfEwX6S38', 'published' => true])->assertCreated()->json('id');
        $second = $this->postJson('/api/admin/tautan-pengusulan', ['label' => 'PkM', 'href' => 'https://forms.gle/asL8mudfPu96B2yU8', 'published' => true])->assertCreated()->json('id');
        $this->putJson('/api/admin/tautan-pengusulan/'.$second, ['label' => 'PkM periode baru', 'order' => 0])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('tautanPengusulan.0.label', 'PkM periode baru'));
        $this->putJson('/api/admin/tautan-pengusulan/'.$second, ['published' => false])->assertOk();
        $this->deleteJson('/api/admin/tautan-pengusulan/'.$first)->assertOk();
        $this->get('/')->assertInertia(fn (Assert $page) => $page->has('tautanPengusulan', 0));
        $this->patchJson('/api/admin/tautan-pengusulan/'.$first)->assertOk();
        $this->get('/')->assertInertia(fn (Assert $page) => $page->has('tautanPengusulan', 1)->where('tautanPengusulan.0.label', 'Penelitian'));
        $this->assertDatabaseHas('ActivityLog', ['resource' => 'tautan-pengusulan', 'action' => 'restore']);
        foreach (['javascript:alert(1)', '/halaman-yang-tidak-ada', '//example.org/form'] as $href) {
            $this->putJson('/api/admin/tautan-pengusulan/'.$first, ['href' => $href])->assertUnprocessable();
        }
    }

    public function test_regular_admin_can_manage_links_but_cannot_change_page_copy_or_delete_permanently(): void
    {
        $this->login('ADMIN');
        $id = $this->postJson('/api/admin/tautan-pengusulan', ['label' => 'Usulan', 'href' => 'https://example.org/form'])->assertCreated()->json('id');
        $this->putJson('/api/admin/tautan-pengusulan/'.$id, ['published' => true])->assertOk();
        $this->deleteJson('/api/admin/tautan-pengusulan/'.$id)->assertOk();
        $this->deleteJson('/api/admin/tautan-pengusulan/'.$id.'?permanent=1')->assertForbidden();
        $this->patchJson('/api/admin/tautan-pengusulan/'.$id)->assertOk();
        $home = DB::table('managed_pages')->where('path', '/')->first();
        $doc = ManagedContent::decode($home->draft);
        $doc['fields'][self::TITLE] = 'Tidak diizinkan';
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 1, 'action' => 'publish', 'document' => $doc])->assertForbidden();
    }
}
