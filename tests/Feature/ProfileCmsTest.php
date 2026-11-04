<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileCmsTest extends TestCase
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

    public function test_profile_editor_lists_visible_copy_without_source_documents_or_unrelated_team_editor(): void
    {
        $page = DB::table('managed_pages')->where('path', '/profil')->first();
        $doc = ManagedContent::decode($page->draft);
        $doc['fields']['x_e9b512b596d9c1'] = 'Koordinator P3M';
        DB::table('managed_pages')->where('id', $page->id)->update(['draft' => json_encode($doc)]);
        $count = DB::table('ContentListItem')->count();
        $this->get('/admin/halaman/'.$page->id)->assertInertia(fn (Assert $view) => $view
            ->where('editors', ['profil'])
            ->where('fields', function ($fields) {
                $rows = collect($fields)->keyBy('key');

                return ! $rows->has('f_3f5310b423bbf2') && ! $rows->has('f_7d5129a9d66e57')
                    && ! $rows->has('x_a1f2e410fd7fcb') && ! $rows->has('x_8d123fa2cc559d')
                    && $rows['profil_tugas_ketua']['default'] === 'Tugas Koordinator P3M'
                    && $rows['f_f19ddc3d54f8ba']['group'] === 'Tentang P3M'
                    && $rows['f_f9e1416e79539f']['group'] === 'Banner profil';
            }));
        $this->assertSame($count, DB::table('ContentListItem')->count());
        $this->assertDatabaseCount('ProfileTableContent', 0);
        $catalog = ManagedContent::catalog();
        $this->assertSame('Banner halaman', $catalog['fields']['f_f9e1416e79539f']['group']);
    }

    public function test_profile_fields_follow_public_section_order(): void
    {
        $page = DB::table('managed_pages')->where('path', '/profil')->first();
        $this->get('/admin/halaman/'.$page->id)->assertInertia(fn (Assert $view) => $view
            ->where('fields', function ($fields) {
                $keys = collect($fields)->pluck('key')->all();
                $this->assertLessThan(array_search('f_f19ddc3d54f8ba', $keys), array_search('x_db6c74673bb95a', $keys));
                $this->assertLessThan(array_search('f_0a1b8385c95336', $keys), array_search('x_859406aed8e33b', $keys));
                $this->assertLessThan(array_search('f_5b0aced5b097d8', $keys), array_search('x_e71537b1193c7f', $keys));
                $rows = collect($fields)->keyBy('key');
                $this->assertSame('Nama pada menu bagian di bawah banner', $rows['x_d44c9cfc7f8ba6']['label']);

                return true;
            }));
    }

    public function test_upload_errors_explain_the_server_failure_in_indonesian(): void
    {
        foreach ([UPLOAD_ERR_INI_SIZE => 'batas unggahan server', UPLOAD_ERR_PARTIAL => 'terkirim sebagian', UPLOAD_ERR_CANT_WRITE => 'tidak dapat menulis'] as $code => $reason) {
            $file = new UploadedFile('/unused', 'banner.jpg', 'image/jpeg', $code, true);
            $response = $this->postJson('/api/admin/upload', ['file' => $file]);
            $response->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertStringContainsString($reason, $response->json('errors.file.0'));
        }
        $this->assertDatabaseCount('UploadAsset', 0);
    }

    public function test_profile_headings_preview_and_publish_without_rewriting_other_content(): void
    {
        $page = DB::table('managed_pages')->where('path', '/profil')->first();
        $doc = ManagedContent::decode($page->draft);
        $doc['fields']['profil_tugas_ketua'] = 'Mandat ketua, tugas dan tanggung jawab.';
        $doc['fields']['profil_tugas_sekretaris'] = 'Administrasi sekretariat';
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'save', 'document' => $doc])->assertOk();
        $this->get('/profil?cms_preview=1')->assertInertia(fn (Assert $view) => $view->where('cms.fields.profil_tugas_ketua', $doc['fields']['profil_tugas_ketua']));
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 2, 'action' => 'publish', 'document' => $doc])->assertOk();
        $this->get('/profil')->assertInertia(fn (Assert $view) => $view->where('cms.fields.profil_tugas_ketua', $doc['fields']['profil_tugas_ketua'])->where('cms.fields.profil_tugas_sekretaris', 'Administrasi sekretariat'));
    }

    public function test_every_profile_list_and_focus_area_updates_the_same_public_data(): void
    {
        foreach (['pengantar', 'visi', 'misi', 'tujuan', 'tupoksi', 'ketua', 'sekretaris'] as $name) {
            $section = 'profil-'.$name;
            $id = $this->postJson('/api/admin/content-list', ['section' => $section, 'text' => 'Isi awal', 'order' => 0, 'published' => true])->assertCreated()->json('id');
            $this->putJson('/api/admin/content-list/'.$id, ['section' => $section, 'text' => 'Isi '.$name.', dengan spasi.', 'order' => 0, 'published' => true])->assertOk();
            $this->get('/profil')->assertInertia(fn (Assert $view) => $view->where('profileLists.'.$section.'.0.text', 'Isi '.$name.', dengan spasi.'));
        }
        $id = $this->postJson('/api/admin/clusters', ['title' => 'Transportasi', 'desc' => 'Fokus awal', 'order' => 0, 'published' => true])->assertCreated()->json('id');
        $this->putJson('/api/admin/clusters/'.$id, ['title' => 'Bidang fokus diperbarui', 'desc' => 'Keterangan diperbarui.', 'order' => 0, 'published' => true])->assertOk();
        $this->get('/profil')->assertInertia(fn (Assert $view) => $view->where('focusClusters.0.title', 'Bidang fokus diperbarui')->where('focusClusters.0.desc', 'Keterangan diperbarui.'));
        $this->assertDatabaseCount('ContentListItem', 7);
        $this->assertDatabaseCount('FocusCluster', 1);
    }

    public function test_target_editor_uses_visible_note_and_preserves_target_values(): void
    {
        $id = 'revision-profil-image-9';
        $oldNote = 'Tanda “–” mengikuti dokumen sumber dan tidak berarti nol.';
        $table = ['title' => '', 'caption' => 'Target pengabdian', 'intro' => 'Pengantar yang ada', 'note' => $oldNote, 'numeric' => true,
            'headers' => ['Indikator', '2025', '2026'], 'rows' => [[['text' => 'Publikasi', 'items' => [], 'ordered' => false], 4, null]]];
        DB::table('DocumentItem')->insert(['id' => $id, 'section' => 'profil-media', 'groupTitle' => 'Target', 'name' => 'Target pengabdian', 'kind' => 'image', 'href' => '/profil/profil-9.png', 'order' => 0, 'published' => true, 'createdAt' => now(), 'updatedAt' => now()]);
        DB::table('ProfileTableContent')->insert(['documentId' => $id, 'content' => json_encode(['tables' => [$table]]), 'version' => 1, 'updatedAt' => now()]);
        $record = $this->getJson('/api/admin/profile-tables')->assertOk()->json('0');
        $this->assertSame('Tanda “-” berarti target belum dicantumkan, bukan nol.', $record['content']['tables'][0]['note']);
        $this->assertSame($oldNote, json_decode(DB::table('ProfileTableContent')->value('content'), true)['tables'][0]['note']);
        unset($record['id']);
        $record['content']['tables'][0]['note'] = 'Target kosong masih menunggu penetapan.';
        $record['content']['tables'][0]['rows'][0][1] = 8;
        $this->putJson('/api/admin/profile-tables/'.$id, $record)->assertOk();
        $this->putJson('/api/admin/profile-tables/'.$id, $record)->assertConflict();
        $this->get('/profil')->assertInertia(fn (Assert $view) => $view->where('media.0.profileTable.content', fn ($content) => json_decode($content, true)['tables'][0]['rows'][0] === [['text' => 'Publikasi', 'items' => [], 'ordered' => false], 8, null]));
        $this->assertDatabaseCount('DocumentItem', 1);
        $this->assertDatabaseCount('ProfileTableContent', 1);
    }
}
