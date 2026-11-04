<?php

namespace Tests\Feature;

use App\Models\Admin;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\SocialiteManager;
use Laravel\Socialite\Two\GoogleProvider;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    private array $httpHistory = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config([
            'inertia.ssr.enabled' => false,
            'services.google' => [
                'enabled' => true, 'client_id' => 'test-client', 'client_secret' => 'test-secret',
                'redirect' => 'http://127.0.0.1:8000/admin/login/google/callback',
            ],
        ]);
    }

    private function provider(array $profile, bool $fail = false): void
    {
        Socialite::swap(new SocialiteManager($this->app));
        $handler = HandlerStack::create(new MockHandler($fail ? [
            new Response(400, [], '{"error":"invalid_grant"}'),
        ] : [
            new Response(200, [], '{"access_token":"test-access-token","token_type":"Bearer","expires_in":3600}'),
            new Response(200, [], json_encode($profile)),
        ]));
        $handler->push(Middleware::history($this->httpHistory));
        $client = new Client(['handler' => $handler]);
        Socialite::shouldReceive('buildProvider')->andReturnUsing(function () use ($client) {
            return (new GoogleProvider(app('request'), 'test-client', 'test-secret', config('services.google.redirect')))
                ->setHttpClient($client);
        });
    }

    private function start(): array
    {
        $response = $this->get('/admin/login/google')->assertRedirect();
        parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);

        return $query;
    }

    private function finishGoogle(string $state): TestResponse
    {
        return $this->get('/admin/login/google/callback?'.http_build_query(['state' => $state, 'code' => 'code-from-google']));
    }

    private function linked(array $attributes = []): Admin
    {
        return Admin::factory()->create(['email' => 'operator@gmail.com', 'googleSubject' => 'google-123', ...$attributes]);
    }

    public function test_first_link_needs_cms_password_then_later_google_login_keeps_role_and_audit(): void
    {
        $admin = Admin::factory()->create(['email' => 'operator@gmail.com', 'role' => 'SUPERADMIN']);
        $hash = $admin->passwordHash;
        $this->provider(['sub' => 'google-123', 'email' => 'OPERATOR@gmail.com', 'email_verified' => true]);
        $query = $this->start();
        $this->assertSame('S256', $query['code_challenge_method']);
        $this->assertSame('select_account', $query['prompt']);
        $this->assertSame('openid email profile', $query['scope']);
        $this->assertSame(config('services.google.redirect'), $query['redirect_uri']);
        $verifier = session('code_verifier');
        $this->assertSame(rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='), $query['code_challenge']);
        $this->finishGoogle($query['state'])->assertRedirect('/admin/login')->assertSessionHas('google_pending');
        $this->assertGuest();
        $this->assertNull($admin->fresh()->googleSubject);
        $this->get('/admin/login')->assertInertia(fn (Assert $page) => $page
            ->where('googlePendingEmail', 'operator@gmail.com')->missing('googleSubject')->missing('google_pending'));
        $this->post('/admin/login/google/confirm', ['password' => 'wrong'])->assertSessionHasErrors('google');
        $this->assertGuest();
        $oldSessionId = session()->getId();
        $this->post('/admin/login/google/confirm', ['password' => 'Orion!River-47-Lantern'])
            ->assertRedirect('/admin')->assertSessionMissing('google_pending')
            ->assertSessionHas('admin_version', $admin->sessionVersion);
        $this->assertNotSame($oldSessionId, session()->getId());
        $this->assertAuthenticatedAs($admin);
        $this->assertDatabaseHas('Admin', ['id' => $admin->id, 'googleSubject' => 'google-123', 'passwordHash' => $hash, 'role' => 'SUPERADMIN']);
        $this->assertDatabaseCount('Admin', 1);
        $this->assertDatabaseHas('ActivityLog', ['action' => 'login', 'adminId' => $admin->id, 'detail' => 'Masuk dengan Google']);
        $this->assertDatabaseHas('ActivityLog', ['action' => 'update', 'adminId' => $admin->id, 'detail' => 'Akun Google dihubungkan']);
        $this->assertArrayNotHasKey('googleSubject', $admin->fresh()->toArray());
        parse_str((string) $this->httpHistory[0]['request']->getBody(), $tokenRequest);
        $this->assertSame($verifier, $tokenRequest['code_verifier']);
        $this->assertSame('test-secret', $tokenRequest['client_secret']);
        $this->assertSame('Bearer test-access-token', $this->httpHistory[1]['request']->getHeaderLine('Authorization'));
        $this->post('/admin/logout')->assertRedirect('/admin/login');
        $this->assertGuest();
        $this->provider(['sub' => 'google-123', 'email' => $admin->email, 'email_verified' => true]);
        $this->finishGoogle($this->start()['state'])->assertRedirect('/admin')->assertSessionMissing('google_pending');
        $this->assertAuthenticatedAs($admin);
        $this->get('/admin')->assertOk();
    }

    public static function deniedAccounts(): array
    {
        return [
            'inactive' => [['isActive' => false]],
            'wrong role' => [['role' => 'INVALID']],
            'expired temporary password' => [['mustChangePassword' => true, 'tempPasswordExpiresAt' => '2000-01-01']],
            'different Google account' => [['googleSubject' => 'another-subject']],
        ];
    }

    #[DataProvider('deniedAccounts')]
    public function test_google_cannot_bypass_existing_account_rules(array $attributes): void
    {
        $admin = $this->linked($attributes);
        $this->provider(['sub' => 'google-123', 'email' => $admin->email, 'email_verified' => true]);
        $this->finishGoogle($this->start()['state'])->assertRedirect('/admin/login')->assertSessionHasErrors('google');
        $this->assertGuest();
        $this->assertDatabaseMissing('ActivityLog', ['action' => 'login']);
    }

    public function test_unknown_or_unverified_accounts_are_not_registered_or_signed_in(): void
    {
        $this->provider(['sub' => 'unknown', 'email' => 'unknown@gmail.com', 'email_verified' => true]);
        $this->finishGoogle($this->start()['state'])->assertSessionHasErrors('google')->assertSessionMissing('google_pending');
        $this->assertGuest();
        $this->assertDatabaseCount('Admin', 0);
        $admin = $this->linked();
        $this->provider(['sub' => 'google-123', 'email' => $admin->email, 'email_verified' => false]);
        $this->finishGoogle($this->start()['state'])->assertSessionHasErrors('google')->assertSessionMissing('google_pending');
        $this->assertGuest();
    }

    public function test_matching_google_id_cannot_access_another_registered_email(): void
    {
        $this->linked();
        $other = Admin::factory()->create(['email' => 'other@gmail.com']);
        $this->provider(['sub' => 'google-123', 'email' => $other->email, 'email_verified' => true]);
        $this->finishGoogle($this->start()['state'])->assertSessionHasErrors('google')->assertSessionMissing('google_pending');
        $this->assertGuest();
        $this->assertNull($other->fresh()->googleSubject);
    }

    public function test_state_mismatch_expiry_cancellation_and_replay_never_sign_in(): void
    {
        $admin = $this->linked();
        $this->provider(['sub' => 'google-123', 'email' => $admin->email, 'email_verified' => true]);
        $query = $this->start();
        $this->finishGoogle('forged-state')->assertSessionHasErrors('google')->assertSessionMissing('code_verifier');
        $this->assertCount(0, $this->httpHistory);
        $this->finishGoogle($query['state'])->assertSessionHasErrors('google');
        $query = $this->start();
        $this->withSession(['google_started_at' => time() - 601]);
        $this->finishGoogle($query['state'])->assertSessionHasErrors('google');
        $this->start();
        $this->get('/admin/login/google/callback?error=access_denied')->assertSessionHasErrors('google');
        $this->assertCount(0, $this->httpHistory);
        $this->assertGuest();
    }

    public function test_google_network_failure_is_a_friendly_error_without_tokens(): void
    {
        $this->provider([], true);
        $this->finishGoogle($this->start()['state'])->assertRedirect('/admin/login')->assertSessionHasErrors('google')->assertSessionMissing('state');
        $this->assertGuest();
        $this->get('/admin/login')->assertDontSee('test-secret')->assertDontSee('invalid_grant');
    }

    public function test_disabled_or_incomplete_configuration_keeps_password_login_available(): void
    {
        $admin = Admin::factory()->create();
        config(['services.google.enabled' => false]);
        $this->get('/admin/login')->assertInertia(fn (Assert $page) => $page->where('googleLoginEnabled', false));
        $this->get('/admin/login/google')->assertSessionHasErrors('google');
        config(['services.google.enabled' => true, 'services.google.client_secret' => '']);
        $this->get('/admin/login/google')->assertSessionHasErrors('google');
        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'Orion!River-47-Lantern'])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin);
    }

    public function test_pending_link_expires_can_be_cancelled_and_rejects_changed_accounts(): void
    {
        $admin = Admin::factory()->create(['email' => 'operator@gmail.com']);
        $this->provider(['sub' => 'google-123', 'email' => $admin->email, 'email_verified' => true]);
        $this->finishGoogle($this->start()['state']);
        $pending = session('google_pending');
        $this->withSession(['google_pending' => [...$pending, 'expires_at' => time() - 1]]);
        $this->post('/admin/login/google/confirm', ['password' => 'Orion!River-47-Lantern'])->assertSessionHasErrors('google');
        $this->withSession(['google_pending' => $pending]);
        $this->post('/admin/login/google/cancel')->assertRedirect('/admin/login')->assertSessionMissing('google_pending');
        $this->withSession(['google_pending' => $pending]);
        $admin->update(['sessionVersion' => 1]);
        $this->post('/admin/login/google/confirm', ['password' => 'Orion!River-47-Lantern'])->assertSessionHasErrors('google');
        $this->assertGuest();
        $this->assertNull($admin->fresh()->googleSubject);
    }

    public function test_confirmation_password_bruteforce_is_limited(): void
    {
        $admin = Admin::factory()->create(['email' => 'operator@gmail.com']);
        $this->provider(['sub' => 'google-123', 'email' => $admin->email, 'email_verified' => true]);
        $this->finishGoogle($this->start()['state']);
        for ($i = 0; $i < 5; $i++) {
            $this->post('/admin/login/google/confirm', ['password' => 'wrong'])->assertSessionHasErrors('google');
        }
        $this->post('/admin/login/google/confirm', ['password' => 'Orion!River-47-Lantern'])->assertSessionHasErrors('google');
        $this->assertGuest();
        $this->assertNull($admin->fresh()->googleSubject);
    }

    public function test_google_login_still_requires_temporary_password_change_and_honors_revocation(): void
    {
        $admin = $this->linked(['mustChangePassword' => true, 'tempPasswordExpiresAt' => now()->addDay()]);
        $this->provider(['sub' => 'google-123', 'email' => $admin->email, 'email_verified' => true]);
        $this->finishGoogle($this->start()['state'])->assertRedirect('/admin/akun');
        $this->get('/admin')->assertRedirect('/admin/akun');
        $admin->update(['sessionVersion' => 2]);
        Auth::forgetGuards();
        $this->get('/admin')->assertRedirect('/admin/login');
    }

    public function test_changing_email_unlinks_google_and_revokes_old_sessions_without_changing_roles(): void
    {
        $super = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $target = $this->linked();
        $this->actingAs($super)->withSession(['admin_version' => 0, 'admin_expires_at' => time() + 43200]);
        $this->patchJson('/api/admin/accounts/'.$target->id, [
            'action' => 'updateProfile', 'name' => 'Operator', 'email' => 'new@gmail.com',
        ])->assertOk();
        $this->assertDatabaseHas('Admin', ['id' => $target->id, 'googleSubject' => null, 'sessionVersion' => 1, 'role' => 'ADMIN']);
        $this->getJson('/api/admin/accounts')->assertOk()->assertJsonMissingPath('0.googleSubject');
    }
}
