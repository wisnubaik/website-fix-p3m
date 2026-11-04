<?php

namespace Tests\Feature;

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileRoadmapTest extends TestCase
{
    use RefreshDatabase;

    private function pair(): array
    {
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 28800]);
        foreach ([7 => 'Agenda penelitian', 6 => 'Indikator capaian'] as $number => $label) {
            $id = 'revision-profil-image-'.$number;
            $cell = fn ($text) => ['text' => $text, 'items' => [], 'ordered' => false];
            $table = ['title' => '', 'caption' => $label, 'intro' => '', 'note' => '', 'numeric' => false, 'headers' => ['Tahun', $label], 'rows' => [[$cell("2025\nAwal"), $cell('Isi awal')], [$cell("2026\nLanjutan"), $cell('Isi lanjutan')]]];
            DB::table('DocumentItem')->insert(['id' => $id, 'section' => 'profil-media', 'groupTitle' => 'Peta jalan', 'name' => $label, 'kind' => 'image', 'href' => '/profil/profil-'.$number.'.png', 'order' => $number, 'published' => true, 'createdAt' => now(), 'updatedAt' => now()]);
            DB::table('ProfileTableContent')->insert(['documentId' => $id, 'content' => json_encode(['tables' => [$table]]), 'version' => 1, 'updatedAt' => now()]);
        }
        $rows = collect($this->getJson('/api/admin/profile-tables')->assertOk()->json())->keyBy('id');

        return [$rows['revision-profil-image-7'], $rows['revision-profil-image-6']];
    }

    public function test_combined_save_keeps_both_documents_in_the_same_manual_order(): void
    {
        $records = $this->pair();
        foreach ($records as &$record) {
            $record['content']['tables'][0]['rows'] = array_reverse($record['content']['tables'][0]['rows']);
        }
        unset($record);
        $this->putJson('/api/admin/profile-roadmap', ['records' => $records])->assertOk()->assertJsonPath('records.0.version', 2)->assertJsonPath('records.1.version', 2);
        foreach ($records as $record) {
            $saved = json_decode(DB::table('ProfileTableContent')->where('documentId', $record['id'])->value('content'), true);
            $this->assertSame("2026\nLanjutan", $saved['tables'][0]['rows'][0][0]['text']);
        }
        $page = DB::table('managed_pages')->where('path', '/profil')->first();
        $this->get('/admin/halaman/'.$page->id)->assertInertia(fn (Assert $view) => $view->where('fields', fn ($fields) => ! collect($fields)->contains('key', 'f_926563f356c80e')));
    }

    public function test_stale_second_document_rolls_back_the_first_document(): void
    {
        $records = $this->pair();
        DB::table('ProfileTableContent')->where('documentId', $records[1]['id'])->update(['version' => 2]);
        $records[0]['content']['tables'][0]['rows'][0][1]['text'] = 'Jangan tersimpan';
        $this->putJson('/api/admin/profile-roadmap', ['records' => $records])->assertConflict();
        $this->assertDatabaseHas('ProfileTableContent', ['documentId' => $records[0]['id'], 'version' => 1]);
        $this->assertStringNotContainsString('Jangan tersimpan', DB::table('ProfileTableContent')->where('documentId', $records[0]['id'])->value('content'));
    }

    public function test_duplicate_years_and_mismatched_titles_are_rejected(): void
    {
        $records = $this->pair();
        $mismatched = $records;
        $mismatched[1]['content']['tables'][0]['rows'][0][0]['text'] = "2025\nBerbeda";
        $this->putJson('/api/admin/profile-roadmap', ['records' => $mismatched])->assertUnprocessable();
        foreach ($records as &$record) {
            $record['content']['tables'][0]['rows'][] = $record['content']['tables'][0]['rows'][0];
        }
        unset($record);
        $this->putJson('/api/admin/profile-roadmap', ['records' => $records])->assertUnprocessable();
    }

    public function test_regular_admin_cannot_save_the_roadmap(): void
    {
        $records = $this->pair();
        $admin = Admin::factory()->create(['role' => 'ADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 28800, 'admin_session_id' => null]);
        $this->putJson('/api/admin/profile-roadmap', ['records' => $records])->assertForbidden();
    }
}
