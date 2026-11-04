<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\AdminSessions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminSessionSecurityTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Orion!River-47-Lantern';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
    }

    private function login(array $attributes = []): Admin
    {
        $admin = Admin::factory()->create($attributes);
        $this->post('/admin/login', ['email' => $admin->email, 'password' => self::PASSWORD])->assertRedirect();

        return $admin;
    }

    private function otherSession(Admin $admin): string
    {
        $id = (string) Str::uuid();
        DB::table('admin_login_sessions')->insert([
            'id' => $id, 'admin_id' => $admin->id, 'version' => $admin->sessionVersion,
            'method' => 'google', 'user_agent' => 'Another browser', 'ip_address' => '127.0.0.2',
            'created_at' => now()->timestamp, 'last_active_at' => now()->timestamp,
            'expires_at' => now()->timestamp + 28800,
        ]);

        return $id;
    }

    public function test_active_login_page_and_google_button_keep_the_existing_account(): void
    {
        $admin = $this->login();
        $sessionId = session('admin_session_id');
        $this->get('/admin/login')->assertRedirect('/admin');
        $this->get('/admin/login/google')->assertRedirect('/admin');
        $other = Admin::factory()->create();
        $this->post('/admin/login', ['email' => $other->email, 'password' => self::PASSWORD])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin);
        $this->assertSame($sessionId, session('admin_session_id'));
        $this->assertDatabaseCount('admin_login_sessions', 1);
    }

    public function test_stale_login_page_clears_invalid_authentication(): void
    {
        $admin = $this->login();
        $admin->increment('sessionVersion');
        Auth::forgetGuards();
        $this->get('/admin/login')->assertOk();
        $this->assertGuest();
        $this->assertNull(session('admin_session_id'));
    }

    public function test_idle_timeout_is_not_extended_by_polling_and_expired_sessions_cannot_be_revived(): void
    {
        $this->login();
        $id = session('admin_session_id');
        $created = DB::table('admin_login_sessions')->where('id', $id)->value('last_active_at');
        $this->travel(29)->minutes();
        $this->getJson('/api/admin/account/session')->assertOk()->assertJsonPath('secondsRemaining', 60);
        $this->assertSame($created, DB::table('admin_login_sessions')->where('id', $id)->value('last_active_at'));
        $this->travel(1)->minutes();
        $this->postJson('/api/admin/account/session/extend')->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_explicit_extension_and_normal_activity_keep_idle_session_but_not_beyond_eight_hours(): void
    {
        $this->login();
        $expires = session('admin_expires_at');
        $this->travel(29)->minutes();
        $this->postJson('/api/admin/account/session/extend')->assertOk()->assertJsonPath('secondsRemaining', 1800);
        $this->assertSame($expires, session('admin_expires_at'));
        $this->travel(29)->minutes();
        $this->getJson('/api/admin/account')->assertOk();
        $this->getJson('/api/admin/account/session')->assertJsonPath('secondsRemaining', 1800);
        $this->travelTo(now()->setTimestamp($expires));
        DB::table('admin_login_sessions')->update(['last_active_at' => now()->timestamp]);
        $this->postJson('/api/admin/account/session/extend')->assertUnauthorized();
    }

    public function test_each_account_only_lists_and_revokes_its_own_sessions(): void
    {
        $admin = $this->login();
        $current = session('admin_session_id');
        $otherId = $this->otherSession($admin);
        $foreignId = $this->otherSession(Admin::factory()->create());
        $this->getJson('/api/admin/account/sessions')->assertOk()->assertJsonCount(2, 'sessions')
            ->assertJsonFragment(['id' => $current, 'current' => true])->assertJsonMissing(['id' => $foreignId]);
        $this->deleteJson('/api/admin/account/sessions/'.$foreignId)->assertNotFound();
        $this->deleteJson('/api/admin/account/sessions/'.$otherId)->assertOk()->assertJsonPath('current', false);
        $this->getJson('/api/admin/account/session')->assertOk();
        $this->withSession(['admin_session_id' => $otherId])->getJson('/api/admin/account/session')->assertUnauthorized();
        $this->assertNotNull(DB::table('admin_login_sessions')->where('id', $otherId)->value('revoked_at'));
    }

    public function test_revoking_current_session_and_logout_all_end_access(): void
    {
        $admin = $this->login();
        $id = session('admin_session_id');
        $this->deleteJson('/api/admin/account/sessions/'.$id)->assertOk()->assertJsonPath('current', true);
        $this->getJson('/api/admin/account')->assertUnauthorized();
        $this->post('/admin/login', ['email' => $admin->email, 'password' => self::PASSWORD])->assertRedirect('/admin');
        $version = $admin->sessionVersion;
        $this->postJson('/api/admin/account/logout-all')->assertOk();
        $this->assertSame($version + 1, $admin->fresh()->sessionVersion);
        $this->get('/admin')->assertRedirect('/admin/login');
    }

    public function test_wrong_tab_identity_cannot_modify_account(): void
    {
        $admin = $this->login(['googleSubject' => 'google-original']);
        $this->withHeader('X-CMS-Actor', 'different-admin')->postJson('/api/admin/account/google/disconnect', ['password' => self::PASSWORD])
            ->assertStatus(409)->assertJsonPath('code', 'ACCOUNT_CHANGED');
        $this->assertSame('google-original', $admin->fresh()->googleSubject);
    }

    public function test_google_disconnect_requires_password_and_revokes_all_sessions(): void
    {
        $admin = $this->login(['googleSubject' => 'google-original']);
        $this->getJson('/api/admin/account')->assertJsonPath('googleConnected', true)->assertJsonMissingPath('googleSubject');
        $this->postJson('/api/admin/account/google/disconnect', ['password' => 'wrong'])->assertUnprocessable();
        $this->assertSame('google-original', $admin->fresh()->googleSubject);
        $this->postJson('/api/admin/account/google/disconnect', ['password' => self::PASSWORD])->assertOk();
        $this->assertNull($admin->fresh()->googleSubject);
        $this->assertSame(1, $admin->fresh()->sessionVersion);
        $this->assertGuest();
        $this->assertDatabaseHas('ActivityLog', ['adminId' => $admin->id, 'action' => 'google_disconnected']);
    }

    public function test_google_disconnect_password_attempts_are_limited(): void
    {
        $admin = $this->login(['googleSubject' => 'google-original']);
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/admin/account/google/disconnect', ['password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/admin/account/google/disconnect', ['password' => self::PASSWORD])->assertStatus(429);
        $this->assertSame('google-original', $admin->fresh()->googleSubject);
    }

    public function test_account_recovery_requires_superadmin_password_and_does_not_change_roles(): void
    {
        $this->login(['role' => 'SUPERADMIN']);
        $target = Admin::factory()->create(['googleSubject' => 'google-target']);
        $request = ['action' => 'recoverAccount', 'confirmEmail' => $target->email, 'password' => 'wrong'];
        $this->patchJson('/api/admin/accounts/'.$target->id, $request)->assertUnprocessable();
        $this->assertSame('google-target', $target->fresh()->googleSubject);
        $response = $this->patchJson('/api/admin/accounts/'.$target->id, [...$request, 'password' => self::PASSWORD])->assertOk();
        $this->assertDatabaseHas('Admin', ['id' => $target->id, 'googleSubject' => null, 'mustChangePassword' => true, 'sessionVersion' => 1, 'role' => 'ADMIN']);
        $this->assertTrue(password_verify($response->json('temporaryPassword'), $target->fresh()->passwordHash));
    }

    public function test_regular_admin_cannot_recover_another_account(): void
    {
        $this->login(['role' => 'ADMIN']);
        $target = Admin::factory()->create(['googleSubject' => 'google-target']);
        $this->patchJson('/api/admin/accounts/'.$target->id, ['action' => 'recoverAccount', 'confirmEmail' => $target->email, 'password' => self::PASSWORD])->assertForbidden();
        $this->assertSame('google-target', $target->fresh()->googleSubject);
    }

    public function test_shared_ip_failures_do_not_lock_out_an_unrelated_account(): void
    {
        $locked = Admin::factory()->create();
        for ($i = 0; $i < 5; $i++) {
            $this->post('/admin/login', ['email' => $locked->email, 'password' => 'wrong'])->assertSessionHasErrors();
        }
        $this->login();
        $this->assertAuthenticated();
    }

    public function test_ip_limit_still_stops_distributed_email_guesses(): void
    {
        for ($i = 0; $i < 50; $i++) {
            $this->post('/admin/login', ['email' => 'unknown'.$i.'@example.test', 'password' => 'wrong'])->assertSessionHasErrors();
        }
        $admin = Admin::factory()->create();
        $this->post('/admin/login', ['email' => $admin->email, 'password' => self::PASSWORD])->assertSessionHasErrors();
        $this->assertGuest();
    }

    public function test_legacy_sessions_are_registered_and_old_absolute_limit_is_shortened(): void
    {
        $admin = Admin::factory()->create();
        $this->actingAs($admin)->withSession(['admin_version' => 0, 'admin_expires_at' => now()->timestamp + 43200]);
        $this->getJson('/api/admin/account/session')->assertOk()->assertJsonPath('absoluteSecondsRemaining', AdminSessions::ABSOLUTE_SECONDS);
        $this->assertDatabaseCount('admin_login_sessions', 1);
    }

    public function test_normal_password_reset_preserves_google_and_recovery_protects_last_superadmin(): void
    {
        $actor = $this->login(['role' => 'SUPERADMIN']);
        $target = Admin::factory()->create(['googleSubject' => 'google-target']);
        $this->patchJson('/api/admin/accounts/'.$target->id, ['action' => 'resetPassword'])->assertOk();
        $this->assertSame('google-target', $target->fresh()->googleSubject);
        $this->patchJson('/api/admin/accounts/'.$actor->id, ['action' => 'recoverAccount', 'confirmEmail' => $actor->email, 'password' => self::PASSWORD])->assertForbidden();
        $this->assertFalse($actor->fresh()->mustChangePassword);
    }

    public function test_active_temporary_session_ends_when_temporary_password_expires(): void
    {
        $this->login(['mustChangePassword' => true, 'tempPasswordExpiresAt' => now()->addMinute()]);
        $this->get('/admin/login')->assertRedirect('/admin/akun');
        $this->get('/admin/login/google')->assertRedirect('/admin/akun');
        $this->travel(2)->minutes();
        $this->getJson('/api/admin/account')->assertUnauthorized();
    }

    public function test_logout_revokes_registry_and_login_after_revocation_creates_a_different_session(): void
    {
        $admin = $this->login();
        $id = session('admin_session_id');
        $this->post('/admin/logout')->assertRedirect('/admin/login');
        $this->assertNotNull(DB::table('admin_login_sessions')->where('id', $id)->value('revoked_at'));
        $this->post('/admin/login', ['email' => $admin->email, 'password' => self::PASSWORD])->assertRedirect('/admin');
        $this->assertNotSame($id, session('admin_session_id'));
        $this->getJson('/api/admin/account/session')->assertOk();
    }
    public function test_draft_preview_rejects_idle_and_revoked_sessions(): void
    {
        $admin = $this->login(['role' => 'SUPERADMIN']);
        $request = \Illuminate\Http\Request::create('/profil?cms_preview=1');
        $request->setLaravelSession(app('session.store'));
        $request->setUserResolver(fn () => $admin);
        $this->assertTrue(\App\Support\ManagedContent::canPreview($request));
        $id = session('admin_session_id');
        DB::table('admin_login_sessions')->where('id', $id)->update(['last_active_at' => now()->timestamp - 1801]);
        $this->assertFalse(\App\Support\ManagedContent::canPreview($request));
        DB::table('admin_login_sessions')->where('id', $id)->update(['last_active_at' => now()->timestamp, 'revoked_at' => now()->timestamp]);
        $this->assertFalse(\App\Support\ManagedContent::canPreview($request));
    }

}
