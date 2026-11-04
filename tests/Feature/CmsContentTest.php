<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\CmsContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CmsContentTest extends TestCase
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

    private function document(array $changes = []): array
    {
        return [...['section' => 'panduan', 'groupTitle' => 'Panduan', 'name' => 'Dokumen uji', 'kind' => 'pdf', 'href' => 'https://example.com/uji.pdf', 'order' => 0, 'published' => true], ...$changes];
    }

    public function test_empty_public_sections_never_fall_back_to_drafts(): void
    {
        DB::table('DocumentItem')->insert(['id' => 'draft', ...$this->document(['published' => false]), 'createdAt' => now(), 'updatedAt' => now()]);
        $this->get('/layanan/panduan')->assertOk()->assertInertia(fn (Assert $page) => $page->has('sections', 0));
    }

    public function test_metadata_and_archived_assets_keep_their_public_and_private_boundaries(): void
    {
        $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml')->assertSee('/informasi/tkt', false)->assertDontSee('/admin', false);
        $this->get('/robots.txt')->assertOk()->assertSee('Disallow: /admin', false);
        $this->get('/informasi/tkt')->assertInertia(fn (Assert $page) => $page->where('seo.title', 'Tingkat Kesiapan Teknologi'));
        $this->get('/admin/arsip/informasi/tkt/image.png')->assertRedirect('/admin/login');
        $this->login();
        $this->get('/admin/arsip/informasi/tkt/image.png')->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->get('/admin/arsip/missing.png')->assertNotFound();
        $this->get('/admin/arsip/..%5C..%5C..%5C.env')->assertNotFound();
    }

    public function test_public_page_data_and_cms_routes_render(): void
    {
        foreach (['profil', 'repository', 'riset-grup', 'hubungi', 'informasi/kegiatan', 'informasi/laporan-keuangan', 'informasi/luaran', 'informasi/mitra', 'informasi/pengumuman', 'informasi/sinta', 'informasi/tkt', 'layanan/asesmen', 'layanan/ki', 'layanan/monev', 'layanan/panduan', 'layanan/semhas'] as $route) {
            $this->get('/'.$route)->assertOk();
        }
        $this->login();
        foreach (CmsContent::PAGES as $page) {
            $this->get('/admin/'.$page)->assertOk()->assertInertia(fn (Assert $response) => $response->component('Admin/Content')->where('page', $page));
        }
    }

    public function test_document_lifecycle_updates_publication_and_trash(): void
    {
        $this->login('ADMIN');
        $id = $this->postJson('/api/admin/documents', $this->document())->assertCreated()->assertJsonPath('published', true)->json('id');
        $this->get('/layanan/panduan')->assertInertia(fn (Assert $page) => $page->has('sections.0.items', 1));
        $this->putJson('/api/admin/documents/'.$id, ['published' => false])->assertOk();
        $this->get('/layanan/panduan')->assertInertia(fn (Assert $page) => $page->has('sections', 0));
        $this->deleteJson('/api/admin/documents/'.$id)->assertOk();
        $this->getJson('/api/admin/documents')->assertExactJson([]);
        $this->getJson('/api/admin/documents?trash=1')->assertJsonCount(1);
        $this->deleteJson('/api/admin/documents/'.$id.'?permanent=1')->assertForbidden();
        $this->patchJson('/api/admin/documents/'.$id)->assertOk();
        $this->getJson('/api/admin/documents')->assertJsonCount(1);
        $this->assertDatabaseHas('ActivityLog', ['action' => 'restore', 'resource' => 'documents', 'detail' => $id]);
    }

    public function test_roles_and_expired_sessions_are_enforced_on_api(): void
    {
        $this->getJson('/api/admin/documents')->assertUnauthorized();
        $admin = $this->login('ADMIN');
        foreach (CmsContent::SUPERADMIN as $resource) {
            $this->getJson('/api/admin/'.$resource)->assertForbidden();
        }
        $this->get('/admin/profil')->assertForbidden();
        $this->postJson('/api/admin/documents', $this->document(['section' => 'profil-media']))->assertForbidden();
        $admin->increment('sessionVersion');
        $this->postJson('/api/admin/documents', $this->document())->assertUnauthorized()->assertJsonPath('code', 'UNAUTHORIZED');
    }

    public function test_validation_blocks_unknown_fields_unsafe_urls_and_publishing_empty_links(): void
    {
        $this->login();
        foreach ([['href' => 'javascript:alert(1)'], ['href' => '//evil.test/file'], ['id' => 'overwrite'], ['published' => 'true'], ['order' => 1.5], ['year' => '2026x'], ['href' => ''], ['section' => 'unknown']] as $changes) {
            $this->postJson('/api/admin/documents', $this->document($changes))->assertUnprocessable();
        }
        $id = $this->postJson('/api/admin/documents', $this->document(['href' => '', 'published' => false]))->assertCreated()->json('id');
        $this->putJson('/api/admin/documents/'.$id, ['published' => true])->assertUnprocessable();
        $this->assertDatabaseCount('DocumentItem', 1);
    }

    public function test_reorder_is_atomic_and_cannot_change_protected_documents(): void
    {
        $this->login();
        $a = $this->postJson('/api/admin/documents', $this->document())->assertCreated()->json('id');
        $b = $this->postJson('/api/admin/documents', $this->document(['section' => 'profil-media', 'order' => 1]))->assertCreated()->json('id');
        $this->login('ADMIN');
        $this->postJson('/api/admin/reorder', ['resource' => 'documents', 'items' => [['id' => $a, 'order' => 2], ['id' => $b, 'order' => 3]]])->assertForbidden();
        $this->assertDatabaseHas('DocumentItem', ['id' => $a, 'order' => 0]);
    }

    public function test_reorder_swaps_positions_and_rejects_stale_or_different_groups(): void
    {
        $this->login();
        $a = $this->postJson('/api/admin/documents', $this->document())->json('id');
        $b = $this->postJson('/api/admin/documents', $this->document(['order' => 1]))->json('id');
        $payload = ['resource' => 'documents', 'items' => [['id' => $a, 'order' => 0], ['id' => $b, 'order' => 1]]];
        $this->postJson('/api/admin/reorder', $payload)->assertOk();
        $this->assertDatabaseHas('DocumentItem', ['id' => $a, 'order' => 1]);
        $this->assertDatabaseHas('DocumentItem', ['id' => $b, 'order' => 0]);
        $this->postJson('/api/admin/reorder', $payload)->assertConflict();
        $this->assertDatabaseHas('DocumentItem', ['id' => $a, 'order' => 1]);
        $this->putJson('/api/admin/documents/'.$b, ['groupTitle' => 'Lainnya', 'section' => 'repository'])->assertOk();
        $this->postJson('/api/admin/reorder', ['resource' => 'documents', 'items' => [['id' => $a, 'order' => 0], ['id' => $b, 'order' => 0]]])->assertUnprocessable();
        $this->assertDatabaseHas('DocumentItem', ['id' => $a, 'order' => 0]);
    }

    public function test_all_content_resources_accept_valid_inputs_and_return_boolean_fields(): void
    {
        $this->login();
        $period = $this->postJson('/api/admin/acara-periode', ['acara' => 'monev', 'tahun' => 2025, 'judul' => 'Monev 2025', 'tanggalMulai' => '2025-10-06'])->assertCreated()->json('id');
        $scheme = $this->postJson('/api/admin/acara-skema', ['acara' => 'monev', 'periodeId' => $period, 'nama' => 'Fixture'])->assertCreated()->json('id');
        $schemas = json_decode(file_get_contents(database_path('content-schema.json')), true);
        foreach ($schemas as $resource => $fields) {
            $data = [];
            foreach ($fields as $key => $field) {
                if ($field['required']) {
                    $data[$key] = match ($field['type']) {
                        'Int' => 1, 'Boolean' => true, default => 'Contoh'
                    };
                }
            }
            foreach ($data as $key => $value) {
                $data[$key] = match ($key) {
                    'href' => 'https://example.com/file',
                    'ctaPrimaryHref', 'ctaSecondaryHref' => '/profil',
                    'year', 'tahun' => '2026', 'acara' => 'monev', 'jurusan' => 'teknik', 'sesi' => 'penelitian',
                    'hub' => 'penelitian', 'kind' => 'pdf', 'email' => 'p3m@example.com',
                    'mulai' => '08:00', 'selesai' => '09:00', 'tanggal', 'tanggalMulai' => '2026-10-06',
                    'details' => '[]', 'phone', 'fax' => '(0351) 452970', 'instagram' => '@p3m_pnm', 'jumlahMahasiswa', 'jumlahProdi' => '1', default => $value,
                };
            }
            if ($resource === 'documents') {
                $data['section'] = 'panduan';
                $data['href'] = 'https://example.com/uji.pdf';
            }
            if ($resource === 'riset-entries') {
                $data['category'] = 'penelitian-internal';
            }
            if ($resource === 'acara-periode') {
                $data['tahun'] = 2026;
            }
            if (in_array($resource, ['monev-slot', 'acara-skema'], true)) {
                $data['periodeId'] = $period;
            }
            if ($resource === 'monev-slot') {
                $data['skemaId'] = $scheme;
                $data['tanggal'] = '2025-10-06';
            }
            $response = in_array($resource, ['settings', 'hero'], true)
                ? $this->putJson('/api/admin/'.$resource, $data)
                : $this->postJson('/api/admin/'.$resource, $data);
            $response->assertCreated();
            if (isset($fields['published'])) {
                $response->assertJsonPath('published', $resource !== 'acara-skema');
            }
            $this->getJson('/api/admin/'.$resource)->assertOk();
        }
    }

    public function test_profile_table_validation_and_concurrent_edits(): void
    {
        $this->login();
        $id = $this->postJson('/api/admin/documents', $this->document(['section' => 'profil-media']))->assertCreated()->json('id');
        DB::table('ProfileTableContent')->insert(['documentId' => $id, 'content' => '{"tables":[]}', 'version' => 1, 'updatedAt' => now()]);
        $record = $this->getJson('/api/admin/profile-tables')->assertOk()->json('0');
        unset($record['id']);
        $record['name'] = 'Nama baru';
        $this->putJson('/api/admin/profile-tables/'.$id, $record)->assertOk()->assertJsonPath('version', 2);
        $this->putJson('/api/admin/profile-tables/'.$id, $record)->assertConflict();
        $this->login('ADMIN');
        $this->getJson('/api/admin/profile-tables')->assertForbidden();
    }

    public function test_upload_requires_publication_and_valid_session_for_private_files(): void
    {
        $admin = $this->login();
        $file = UploadedFile::fake()->createWithContent('test.pdf', "%PDF-1.4\n".str_repeat('x', 1100));
        $url = $this->post('/api/admin/upload', ['file' => $file, 'visibility' => 'public'], ['Accept' => 'application/json'])->assertCreated()->json('url');
        try {
            $this->get($url)->assertOk();
            $this->postJson('/api/admin/documents', $this->document(['href' => $url]))->assertCreated();
            $this->app['auth']->forgetGuards();
            $this->flushSession();
            $this->get($url)->assertOk();
            DB::table('DocumentItem')->update(['published' => false]);
            $this->get($url)->assertNotFound();
        } finally {
            unlink(storage_path('app/private/uploads/'.basename($url)));
        }
    }

    public function test_executable_and_fake_office_uploads_are_rejected(): void
    {
        $this->login();
        foreach (['evil.php' => '<?php echo 1; ?>', 'fake.docx' => 'PK'.str_repeat('x', 1100)] as $name => $content) {
            $this->post('/api/admin/upload', ['file' => UploadedFile::fake()->createWithContent($name, $content)], ['Accept' => 'application/json'])->assertUnprocessable();
        }
        $this->assertDatabaseCount('UploadAsset', 0);
    }

    public function test_account_management_requires_role_and_confirms_sensitive_changes(): void
    {
        $this->login('ADMIN');
        $this->getJson('/api/admin/accounts')->assertForbidden();
        $this->postJson('/api/admin/accounts', ['name' => 'Operator', 'email' => 'operator@example.com', 'role' => 'ADMIN'])->assertForbidden();
        $actor = $this->login();
        $response = $this->postJson('/api/admin/accounts', ['name' => 'Operator', 'email' => 'operator@example.com', 'role' => 'ADMIN'])
            ->assertCreated()->assertJsonPath('account.mustChangePassword', true)->assertJsonMissingPath('account.passwordHash');
        $id = $response->json('account.id');
        $this->assertTrue(password_verify($response->json('temporaryPassword'), Admin::findOrFail($id)->passwordHash));
        $this->getJson('/api/admin/accounts')->assertJsonMissingPath('0.passwordHash')->assertJsonMissingPath('0.sessionVersion');
        $this->patchJson('/api/admin/accounts/'.$id, ['action' => 'setRole', 'role' => 'SUPERADMIN'])->assertUnprocessable();
        $this->patchJson('/api/admin/accounts/'.$id, ['action' => 'deactivate'])->assertOk();
        $this->assertFalse(Admin::findOrFail($id)->isActive);
        $this->patchJson('/api/admin/accounts/'.$id, ['action' => 'activate'])->assertOk();
        $this->deleteJson('/api/admin/accounts/'.$id)->assertUnprocessable();
    }

    public function test_last_activated_superadmin_cannot_be_removed_even_with_an_unactivated_backup(): void
    {
        $actor = $this->login();
        $actor->passwordHash = Hash::make('Correct-Confirmation-954!');
        $actor->save();
        Admin::factory()->create(['role' => 'SUPERADMIN', 'mustChangePassword' => true]);
        $confirm = ['confirmEmail' => $actor->email, 'password' => 'Correct-Confirmation-954!'];
        $this->patchJson('/api/admin/accounts/'.$actor->id, ['action' => 'deactivate', ...$confirm])
            ->assertConflict()->assertJsonPath('code', 'LAST_SUPERADMIN');
        $this->deleteJson('/api/admin/accounts/'.$actor->id, $confirm)->assertConflict();
        $this->assertTrue($actor->fresh()->isActive);
    }

    public function test_password_api_ends_current_session_and_log_is_scoped(): void
    {
        $actor = $this->login('ADMIN');
        $actor->passwordHash = Hash::make('Old-Confirmation-954!');
        $actor->save();
        DB::table('ActivityLog')->insert([
            ['id' => 'my-log', 'adminId' => $actor->id, 'username' => $actor->email, 'action' => 'update', 'resource' => 'documents', 'createdAt' => now()],
            ['id' => 'other-log', 'adminId' => 'someone-else', 'username' => 'other@example.com', 'action' => 'update', 'resource' => 'documents', 'createdAt' => now()],
        ]);
        $this->get('/admin/log')->assertInertia(fn (Assert $page) => $page->has('logs', 1)->where('logs.0.id', 'my-log'));
        $this->putJson('/api/admin/account', ['currentPassword' => 'Old-Confirmation-954!', 'newPassword' => 'Unique-Forest-Kites-758!', 'newPasswordConfirmation' => 'Unique-Forest-Kites-758!'])->assertOk();
        $this->assertGuest();
        $this->getJson('/api/admin/documents')->assertUnauthorized();
        $this->assertTrue(password_verify('Unique-Forest-Kites-758!', $actor->fresh()->passwordHash));
    }
}
