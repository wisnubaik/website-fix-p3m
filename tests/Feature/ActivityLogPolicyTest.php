<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ActivityLogs;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityLogPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function loginAdmin(string $role = 'ADMIN'): Admin
    {
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $admin = Admin::factory()->create(['role' => $role, 'passwordHash' => Hash::make('Old-Quartz!97513')]);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => now()->timestamp + 43200]);
        return $admin;
    }

    private function row(string $id, Admin $admin, mixed $date): void
    {
        DB::table('ActivityLog')->insert(['id' => $id, 'adminId' => $admin->id, 'username' => $admin->email, 'action' => 'update', 'resource' => 'profil', 'detail' => '=1+1', 'createdAt' => $date]);
    }

    public function test_admin_cannot_view_or_export_another_accounts_history(): void
    {
        $admin = $this->loginAdmin();
        $other = Admin::factory()->create();
        $this->row('own', $admin, now());
        $this->row('other', $other, now());
        $this->get('/admin/log')->assertInertia(fn (Assert $page) => $page->has('logs', 1)->where('logs.0.id', 'own'));
        $csv = $this->get('/admin/log/export')->assertOk()->streamedContent();
        $this->assertStringContainsString($admin->email, $csv);
        $this->assertStringNotContainsString($other->email, $csv);
        $this->assertStringContainsString("'=1+1", $csv);
        $this->get('/admin/log?account='.urlencode($other->email))->assertInertia(fn (Assert $page) => $page->has('logs', 0));
    }

    public function test_log_is_paginated_at_fifty_records(): void
    {
        $admin = $this->loginAdmin('SUPERADMIN');
        for ($i = 0; $i < 51; $i++) {
            $this->row('row-'.$i, $admin, now());
        }
        $this->get('/admin/log')->assertInertia(fn (Assert $page) => $page->has('logs', 50)->where('pagination.total', 51)->where('pagination.last', 2));
    }

    public function test_csv_protects_formula_prefixes(): void
    {
        foreach (['=SUM(A1)', '+1', '-2', '@SUM(A1)', "\t=1", '  =1'] as $value) {
            $this->assertSame("'".$value, ActivityLogs::csvCell($value));
        }
        $this->assertSame('Biasa', ActivityLogs::csvCell('Biasa'));
    }

    public function test_filters_and_date_validation_apply_to_exports(): void
    {
        $admin = $this->loginAdmin('SUPERADMIN');
        $this->row('older', $admin, '2026-01-01 12:00:00');
        $this->row('selected', $admin, '2026-02-01 23:59:59');
        $this->get('/admin/log?from=2026-02-01&to=2026-02-01&action=update')->assertInertia(fn (Assert $page) => $page->has('logs', 1)->where('logs.0.id', 'selected'));
        $this->getJson('/admin/log/export?from=2026-03-01&to=2026-02-01')->assertUnprocessable();
    }

    public function test_pruning_preserves_retention_boundary_and_dry_run_changes_nothing(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 29)->startOfDay());
        config(['activity-log.retention_months' => 12]);
        $admin = Admin::factory()->create();
        $cutoff = now()->subMonthsNoOverflow(12);
        $this->row('expired', $admin, $cutoff->copy()->subSecond());
        $this->row('boundary', $admin, $cutoff);
        $this->assertSame(1, ActivityLogs::prune(true));
        $this->assertDatabaseHas('ActivityLog', ['id' => 'expired']);
        $this->assertSame(1, ActivityLogs::prune());
        $this->assertDatabaseMissing('ActivityLog', ['id' => 'expired']);
        $this->assertDatabaseHas('ActivityLog', ['id' => 'boundary']);
        $this->assertDatabaseHas('ActivityLog', ['action' => 'prune']);
    }

    public function test_password_confirmation_is_required_and_checked_on_server(): void
    {
        $admin = $this->loginAdmin();
        $body = ['currentPassword' => 'Old-Quartz!97513', 'newPassword' => 'Fresh-Cobalt!86214'];
        $this->putJson('/api/admin/account', $body)->assertUnprocessable();
        $this->putJson('/api/admin/account', [...$body, 'newPasswordConfirmation' => 'Different!68420'])->assertUnprocessable();
        $this->assertTrue(Hash::check('Old-Quartz!97513', $admin->fresh()->passwordHash));
        $this->putJson('/api/admin/account', [...$body, 'newPasswordConfirmation' => $body['newPassword']])->assertOk();
        $this->assertTrue(Hash::check($body['newPassword'], $admin->fresh()->passwordHash));
    }
}
