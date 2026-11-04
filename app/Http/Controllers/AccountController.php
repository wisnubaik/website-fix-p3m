<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Rules\AdminPassword;
use App\Support\AdminSessions;
use App\Support\Audit;
use App\Support\GoogleLogin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Content', ['page' => 'akun']);
    }

    public function show(Request $request): JsonResponse
    {
        $admin = $request->user();
        $min = AdminPassword::MIN_LENGTH;

        return response()->json([
            ...$admin->only('email', 'name', 'role', 'lastLoginAt', 'passwordChangedAt'),
            'googleConnected' => $admin->googleSubject !== null,
            'googleLoginEnabled' => GoogleLogin::enabled(),
            'setup' => $admin->mustChangePassword ? 'password' : null,
            'passwordMinLength' => $min,
            'passwordRules' => "Minimal {$min} karakter, maksimal 72 byte.",
        ]);
    }

    public function update(Request $request): RedirectResponse|JsonResponse
    {
        $admin = $request->user();
        if ($request->is('api/*')) {
            $request->merge(['current_password' => $request->input('currentPassword'), 'password' => $request->input('newPassword'), 'password_confirmation' => $request->input('newPasswordConfirmation')]);
        }
        $key = 'password:'.$admin->id;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['current_password' => 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.']);
        }
        $data = $request->validate([
            'current_password' => ['required', 'string', 'max:200'],
            'password' => ['required', 'string', 'confirmed', new AdminPassword],
        ]);
        if (! password_verify($data['current_password'], $admin->passwordHash)) {
            RateLimiter::hit($key, 900);
            throw ValidationException::withMessages(['current_password' => 'Password saat ini tidak sesuai.']);
        }
        DB::transaction(function () use ($admin, $data) {
            $admin->passwordHash = Hash::make($data['password']);
            $admin->mustChangePassword = false;
            $admin->tempPasswordExpiresAt = null;
            $admin->passwordChangedAt = now();
            $admin->sessionVersion++;
            $admin->save();
            Audit::record($admin, 'password_changed', 'account');
        });
        RateLimiter::clear($key);
        if ($request->is('api/*')) {
            AdminSessions::end($request);

            return response()->json(['ok' => true]);
        }
        $request->session()->regenerate();
        $request->session()->put('admin_version', $admin->sessionVersion);
        AdminSessions::start($request, 'password', (int) $request->session()->get('admin_expires_at'));

        return redirect()->route('admin.dashboard')->with('success', 'Password berhasil diubah. Sesi perangkat lain tidak berlaku lagi.');
    }

    public function disconnectGoogle(Request $request): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string', 'max:200']]);
        $key = 'account-google:'.$request->user()->id;
        abort_if(RateLimiter::tooManyAttempts($key, 5), 429, 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
        $verified = DB::transaction(function () use ($request, $data): bool {
            $admin = Admin::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($admin->isActive && $admin->sessionVersion === $request->session()->get('admin_version'), 403);
            if (! password_verify($data['password'], $admin->passwordHash)) {
                return false;
            }
            $admin->googleSubject = null;
            $admin->sessionVersion++;
            $admin->save();
            Audit::record($admin, 'google_disconnected', 'account', 'Koneksi Google diputus dan semua sesi dicabut');

            return true;
        });
        if (! $verified) {
            RateLimiter::hit($key, 900);
            throw ValidationException::withMessages(['password' => 'Password CMS tidak sesuai.']);
        }
        RateLimiter::clear($key);
        AdminSessions::end($request);

        return response()->json(['ok' => true]);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        DB::transaction(function () use ($request) {
            $request->user()->increment('sessionVersion');
            Audit::record($request->user(), 'logout_all', 'account');
        });
        AdminSessions::end($request);

        return response()->json(['ok' => true]);
    }
}
