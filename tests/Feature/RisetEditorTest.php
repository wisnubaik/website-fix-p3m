<?php

namespace Tests\Feature;

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RisetEditorTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_six_editors_hide_empty_leader_copy_and_require_a_leader(): void
    {
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 28800]);
        foreach (['penelitian', 'pkm'] as $type) {
            foreach (['internal', 'eksternal', 'unggulan'] as $scope) {
                $page = DB::table('managed_pages')->where('path', "/$type/$scope")->first();
                $this->get('/admin/halaman/'.$page->id)->assertInertia(fn (Assert $view) => $view->where('fields', fn ($fields) => ! collect($fields)->contains('key', 'f_ce83cc4749d012')));
                $this->postJson('/api/admin/riset-entries', ['category' => "$type-$scope", 'year' => '2026', 'title' => 'Judul penelitian', 'leader' => '', 'published' => true])->assertUnprocessable()->assertJsonValidationErrors('leader');
            }
        }
    }
}
