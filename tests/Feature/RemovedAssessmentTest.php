<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RemovedAssessmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_assessment_data_editor_and_api_are_removed_but_documents_remain(): void
    {
        $definition = ManagedContent::definition('/layanan/asesmen');
        $this->assertNotContains('asesmen', $definition['editors']);
        $this->assertContains('dokumen-layanan', $definition['editors']);
        $this->assertNotContains('f_ea8fdcd0e0e67f', $definition['fields']);
        $admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
        $this->getJson('/api/admin/asesmen')->assertNotFound();
        $this->postJson('/api/admin/asesmen', ['prodi' => 'TI', 'tanggal' => '2026-10-26'])->assertNotFound();
        $this->postJson('/api/admin/excel/asesmen/template')->assertNotFound();
        $this->getJson('/api/admin/documents?section=asesmen')->assertOk();
    }
}
