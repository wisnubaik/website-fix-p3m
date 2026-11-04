<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\RisetEntry;
use App\Support\LegacyImport;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use SQLite3;
use Tests\TestCase;

class MigrationFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
    }

    private function adminSession(?Admin $admin = null): Admin
    {
        $admin ??= Admin::factory()->create();
        $this->actingAs($admin)->withSession(['admin_session_id' => null, 'admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);

        return $admin;
    }

    private function entryData(array $overrides = []): array
    {
        return array_merge([
            'category' => 'penelitian-internal', 'year' => '2026', 'title' => 'Riset terapan',
            'leader' => 'Peneliti', 'member1' => '', 'member2' => '', 'funding' => 12000000, 'order' => 0, 'published' => true,
        ], $overrides);
    }

    public function test_public_pages_only_expose_published_undeleted_research(): void
    {
        RisetEntry::factory()->create(['title' => 'Terbit']);
        RisetEntry::factory()->create(['title' => 'Draft rahasia', 'published' => false]);
        RisetEntry::factory()->create(['title' => 'Sampah rahasia'])->delete();
        RisetEntry::factory()->create(['category' => 'pkm-internal']);
        $this->get('/penelitian/internal')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Research/Show')->has('entries', 1)->where('entries.0.title', 'Terbit')
            ->missing('entries.0.deletedAt')->missing('entries.0.id'));
    }

    public function test_all_six_categories_and_empty_results_render(): void
    {
        foreach (array_keys(RisetEntry::CATEGORIES) as $category) {
            $this->get('/'.str_replace('-', '/', $category))->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component('Research/Show')->has('entries', 0));
        }
        $this->get('/penelitian/unknown')->assertNotFound();
        $this->get('/penelitian')->assertOk();
        $this->get('/pkm')->assertOk();
        $this->get('/')->assertOk();
    }

    public function test_anonymous_users_cannot_read_or_mutate_admin_content(): void
    {
        $this->get('/admin/riset-entries')->assertRedirect('/admin/login');
        $this->post('/admin/riset-entries', $this->entryData())->assertRedirect('/admin/login');
        $this->assertDatabaseCount('RisetEntry', 0);
    }

    public function test_bcryptjs_hash_can_login_without_changing_the_hash(): void
    {
        $hash = str_replace('$2y$', '$2b$', Hash::make('Orion!River-47-Lantern'));
        $admin = Admin::factory()->create(['email' => 'operator@example.test', 'passwordHash' => $hash]);
        $this->post('/admin/login', ['email' => 'OPERATOR@example.test', 'password' => 'Orion!River-47-Lantern'])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin);
        $this->assertSame($hash, $admin->fresh()->passwordHash);
        $this->get('/admin')->assertOk()->assertInertia(fn (Assert $page) => $page->missing('auth.user.passwordHash'));
        $this->assertDatabaseHas('ActivityLog', ['action' => 'login', 'adminId' => $admin->id]);
    }

    public function test_failed_login_is_limited_even_if_a_later_password_is_correct(): void
    {
        $admin = Admin::factory()->create();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/admin/login', ['email' => $admin->email, 'password' => 'wrong'])->assertSessionHasErrors('email');
        }
        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'Orion!River-47-Lantern'])
            ->assertSessionHasErrors(['email' => 'Terlalu banyak percobaan. Coba kembali dalam 900 detik.']);
        $this->assertGuest();
    }

    public function test_inactive_and_expired_temporary_accounts_cannot_login(): void
    {
        foreach ([
            ['isActive' => false],
            ['mustChangePassword' => true, 'tempPasswordExpiresAt' => now()->subMinute()],
        ] as $attributes) {
            $admin = Admin::factory()->create($attributes);
            $this->post('/admin/login', ['email' => $admin->email, 'password' => 'Orion!River-47-Lantern'])->assertSessionHasErrors('email');
            $this->assertGuest();
        }
    }

    public function test_invalid_role_and_version_or_expired_session_are_rejected(): void
    {
        $admin = $this->adminSession();
        $this->withSession(['admin_session_id' => null, 'admin_version' => $admin->sessionVersion + 1])->get('/admin')->assertRedirect('/admin/login');
        $this->adminSession($admin);
        $this->withSession(['admin_expires_at' => time() - 1])->get('/admin')->assertRedirect('/admin/login');
        $admin->update(['role' => 'INVALID']);
        $this->adminSession($admin);
        $this->get('/admin')->assertRedirect('/admin/login');
    }

    public function test_password_change_is_mandatory_before_editing_content(): void
    {
        $this->adminSession(Admin::factory()->create(['mustChangePassword' => true]));
        $this->get('/admin')->assertRedirect('/admin/akun');
        $this->post('/admin/riset-entries', $this->entryData())->assertRedirect('/admin/akun');
        $this->get('/admin/akun')->assertOk();
        $this->assertDatabaseCount('RisetEntry', 0);
    }

    public function test_password_change_requires_current_password_and_revokes_other_session_versions(): void
    {
        $admin = $this->adminSession(Admin::factory()->create(['role' => 'SUPERADMIN', 'mustChangePassword' => true]));
        $password = 'Cedar!Pond-79-Moonlight';
        $this->put('/admin/akun/password', ['current_password' => 'wrong', 'password' => $password, 'password_confirmation' => $password])
            ->assertSessionHasErrors('current_password');
        $this->put('/admin/akun/password', ['current_password' => 'Orion!River-47-Lantern', 'password' => $password, 'password_confirmation' => $password])
            ->assertRedirect('/admin');
        $admin->refresh();
        $this->assertTrue(password_verify($password, $admin->passwordHash));
        $this->assertFalse($admin->mustChangePassword);
        $this->assertSame(1, $admin->sessionVersion);
        $this->assertNull($admin->tempPasswordExpiresAt);
        $this->assertSame(1, session('admin_version'));
    }

    public function test_common_and_overlong_passwords_are_rejected(): void
    {
        $this->adminSession(Admin::factory()->create(['role' => 'SUPERADMIN']));
        foreach (['Bismillah123!', str_repeat('é', 37), 'aaaaaaaaaaaa'] as $password) {
            $this->put('/admin/akun/password', ['current_password' => 'Orion!River-47-Lantern', 'password' => $password, 'password_confirmation' => $password])
                ->assertSessionHasErrors('password');
        }
    }

    public function test_logout_revokes_access(): void
    {
        $this->adminSession();
        $this->post('/admin/logout')->assertRedirect('/admin/login');
        $this->assertGuest();
        $this->get('/admin')->assertRedirect('/admin/login');
    }

    public function test_both_roles_can_create_research_and_changes_are_audited(): void
    {
        foreach (['ADMIN', 'SUPERADMIN'] as $role) {
            $admin = $this->adminSession(Admin::factory()->create(['role' => $role]));
            $this->post('/admin/riset-entries', $this->entryData())->assertSessionHasNoErrors()->assertRedirect();
            $this->assertDatabaseHas('ActivityLog', ['action' => 'create', 'resource' => 'riset-entries', 'adminId' => $admin->id]);
        }
        $this->assertDatabaseCount('RisetEntry', 2);
    }

    public function test_research_mutation_rejects_invalid_values_and_unapproved_fields(): void
    {
        $this->adminSession();
        foreach ([
            ['funding' => -1], ['funding' => 1.25], ['year' => 'not-year'], ['category' => 'unknown'], ['title' => ''],
            ['deletedAt' => '2026-01-01'], ['id' => 'overwrite'], ['published' => 'yes'],
        ] as $changes) {
            $this->post('/admin/riset-entries', $this->entryData($changes))->assertSessionHasErrors();
        }
        $this->assertDatabaseCount('RisetEntry', 0);
    }

    public function test_edit_unpublish_delete_and_restore_affect_public_data(): void
    {
        $this->adminSession();
        $entry = RisetEntry::factory()->create();
        $this->put('/admin/riset-entries/'.$entry->id, $this->entryData(['published' => false]))->assertSessionHasNoErrors();
        $this->get('/penelitian/internal')->assertInertia(fn (Assert $page) => $page->has('entries', 0));
        $this->put('/admin/riset-entries/'.$entry->id, $this->entryData(['funding' => 25000000]))->assertSessionHasNoErrors();
        $this->get('/penelitian/internal')->assertInertia(fn (Assert $page) => $page->where('entries.0.funding', 25000000));
        $this->delete('/admin/riset-entries/'.$entry->id)->assertRedirect();
        $this->assertSoftDeleted('RisetEntry', ['id' => $entry->id], null, 'deletedAt');
        $this->get('/penelitian/internal')->assertInertia(fn (Assert $page) => $page->has('entries', 0));
        $this->post('/admin/riset-entries/'.$entry->id.'/restore')->assertRedirect();
        $this->get('/penelitian/internal')->assertInertia(fn (Assert $page) => $page->has('entries', 1));
        $this->assertDatabaseHas('ActivityLog', ['action' => 'restore', 'detail' => $entry->id]);
    }

    public function test_missing_or_deleted_records_cannot_be_updated(): void
    {
        $this->adminSession();
        $this->put('/admin/riset-entries/missing', $this->entryData())->assertNotFound();
        $entry = RisetEntry::factory()->create();
        $entry->delete();
        $this->put('/admin/riset-entries/'.$entry->id, $this->entryData())->assertNotFound();
    }

    public function test_imported_prisma_ids_can_be_edited_and_deleted(): void
    {
        $this->adminSession();
        $entry = RisetEntry::factory()->create(['id' => 'cmflegacy0001research']);
        $this->put('/admin/riset-entries/'.$entry->id, $this->entryData(['title' => 'Judul diperbarui']))->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame('Judul diperbarui', $entry->fresh()->title);
        $this->delete('/admin/riset-entries/'.$entry->id)->assertRedirect();
        $this->assertSoftDeleted('RisetEntry', ['id' => $entry->id], null, 'deletedAt');
    }

    public function test_admin_list_is_paginated_and_searchable(): void
    {
        $this->adminSession();
        RisetEntry::factory()->count(23)->create();
        RisetEntry::factory()->create(['title' => 'PencarianUnik']);
        $this->get('/admin/riset-entries')->assertInertia(fn (Assert $page) => $page->has('entries.data', 20)->where('entries.total', 24));
        $this->get('/admin/riset-entries?q=PencarianUnik')->assertInertia(fn (Assert $page) => $page->where('entries.total', 1));
    }

    public function test_private_files_and_old_2fa_endpoints_are_not_public(): void
    {
        $this->get('/admin/arsip/private.pdf')->assertRedirect('/admin/login');
        foreach (['/uploads/private.pdf', '/api/admin/2fa/enroll'] as $path) {
            $this->get($path)->assertNotFound();
        }
    }

    public function test_admin_pages_have_private_cache_and_noindex_headers(): void
    {
        $this->get('/admin/login')->assertHeader('X-Robots-Tag', 'noindex, nofollow')->assertHeader('X-Frame-Options', 'DENY');
        $this->assertStringContainsString('no-store', $this->get('/admin/login')->headers->get('Cache-Control'));
    }

    private function legacyFixture(bool $invalid = false): string
    {
        $filename = tempnam(sys_get_temp_dir(), 'p3m-test-');
        $source = new SQLite3($filename);
        $schema = json_decode(file_get_contents(database_path('legacy-schema.json')), true);
        foreach ($schema as $table) {
            $columns = array_map(fn ($field) => '"'.$field['name'].'" TEXT', $table['fields']);
            $source->exec('CREATE TABLE "'.$table['name'].'" ('.implode(',', $columns).')');
        }
        $source->exec("INSERT INTO RisetEntry (id, category, year, title, leader, funding, \"order\", createdAt, updatedAt, published) VALUES ('legacy-id', 'pkm-eksternal', '2019', '', 'Peneliti', 0, 0, 1750000000123, 1750000000123, 1)");
        if ($invalid) {
            $source->exec("INSERT INTO KiKarya (id) VALUES ('invalid')");
        }
        $source->close();

        return $filename;
    }

    public function test_legacy_import_preserves_empty_titles_zero_funding_and_millisecond_dates(): void
    {
        $file = $this->legacyFixture();
        $before = hash_file('sha256', $file);
        try {
            $report = app(LegacyImport::class)->run($file);
            $this->assertCount(31, $report);
            $this->assertSame(1, $report['RisetEntry']['count']);
            $this->assertSame($before, hash_file('sha256', $file));
            $this->assertDatabaseHas('RisetEntry', ['id' => 'legacy-id', 'title' => '', 'funding' => 0, 'createdAt' => '2025-06-15 15:06:40.123']);
            $this->assertDatabaseCount('AdminSession', 0);
        } finally {
            unlink($file);
        }
    }

    public function test_import_refuses_to_overwrite_existing_data(): void
    {
        $file = $this->legacyFixture();
        RisetEntry::factory()->create();
        try {
            app(LegacyImport::class)->run($file);
            $this->fail('Import should refuse populated tables.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('sudah terisi', $error->getMessage());
            $this->assertDatabaseCount('RisetEntry', 1);
        } finally {
            unlink($file);
        }
    }

    public function test_failed_import_rolls_back_all_tables(): void
    {
        $file = $this->legacyFixture(true);
        try {
            app(LegacyImport::class)->run($file);
            $this->fail('Invalid rows should fail.');
        } catch (QueryException) {
            $this->assertDatabaseCount('RisetEntry', 0);
            $this->assertDatabaseCount('KiKarya', 0);
        } finally {
            unlink($file);
        }
    }
}
