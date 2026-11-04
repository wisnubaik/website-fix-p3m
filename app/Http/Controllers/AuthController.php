<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Support\AdminLogin;
use App\Support\AdminSessions;
use App\Support\Audit;
use App\Support\GoogleLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (AdminSessions::authenticated($request)) {
            return redirect()->route($request->user()->mustChangePassword ? 'account.edit' : 'admin.dashboard');
        }

        return Inertia::render('Auth/Login', [
            'googleLoginEnabled' => GoogleLogin::enabled(),
            'googlePendingEmail' => GoogleLogin::pending($request)['email'] ?? null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (AdminSessions::authenticated($request)) {
            return redirect()->route($request->user()->mustChangePassword ? 'account.edit' : 'admin.dashboard');
        }
        $data = $request->validate(['email' => ['required', 'string', 'email', 'max:254'], 'password' => ['required', 'string', 'max:200']]);
        $email = mb_strtolower(trim($data['email']));
        $keys = ['login:email:'.hash('sha256', $email), 'login:ip:'.hash('sha256', $request->ip())];
        foreach ($keys as $index => $key) {
            if (RateLimiter::tooManyAttempts($key, $index === 0 ? 5 : 50)) {
                throw ValidationException::withMessages(['email' => 'Terlalu banyak percobaan. Coba kembali dalam '.RateLimiter::availableIn($key).' detik.']);
            }
        }
        $admin = Admin::where('email', $email)->first();
        $valid = password_verify($data['password'], $admin?->passwordHash ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi');
        if (! $valid || ! AdminLogin::allowed($admin)) {
            foreach ($keys as $key) {
                RateLimiter::hit($key, 900);
            }
            Audit::record($admin, 'login_failed', 'auth');
            throw ValidationException::withMessages(['email' => 'Login gagal. Periksa email/password atau hubungi superadmin jika akun nonaktif/password sementara kedaluwarsa.']);
        }
        RateLimiter::clear($keys[0]);

        return AdminLogin::complete($request, $admin);
    }

    public function destroy(Request $request): RedirectResponse
    {
        Audit::record($request->user(), 'logout', 'auth');
        AdminSessions::end($request);

        return redirect()->route('login');
    }
}
