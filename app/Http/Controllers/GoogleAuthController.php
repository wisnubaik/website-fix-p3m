<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Support\AdminLogin;
use App\Support\AdminSessions;
use App\Support\Audit;
use App\Support\GoogleLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Socialite\Two\InvalidStateException;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        GoogleLogin::clear($request);
        if (AdminSessions::authenticated($request)) {
            return redirect()->route($request->user()->mustChangePassword ? 'account.edit' : 'admin.dashboard');
        }
        if (! GoogleLogin::enabled()) {
            return $this->reject($request, 'Login Google belum tersedia. Silakan masuk dengan email dan password CMS.');
        }
        $request->session()->put('google_started_at', time());

        return GoogleLogin::provider()->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if (! GoogleLogin::enabled()) {
            return $this->reject($request, 'Login Google belum tersedia. Silakan masuk dengan email dan password CMS.');
        }
        if (AdminSessions::authenticated($request)) {
            GoogleLogin::clear($request);

            return redirect()->route($request->user()->mustChangePassword ? 'account.edit' : 'admin.dashboard');
        }
        $startedAt = $request->session()->pull('google_started_at');
        if (! is_int($startedAt) || $startedAt < time() - 600 || $startedAt > time()
            || ! is_string($request->query('state')) || strlen($request->query('state')) > 256
            || ! is_string($request->query('code')) || strlen($request->query('code')) > 2048
            || $request->has('error')) {
            return $this->reject($request, 'Login Google dibatalkan atau sesi telah berakhir. Silakan coba kembali.');
        }
        try {
            $identity = GoogleLogin::provider()->user();
        } catch (InvalidStateException) {
            return $this->reject($request, 'Sesi login Google tidak sesuai. Mulai kembali dari tombol Masuk dengan Google.');
        } catch (Throwable $exception) {
            Log::warning('Google CMS login could not complete.', ['type' => get_class($exception)]);

            return $this->reject($request, 'Google belum dapat dihubungi atau proses login gagal. Coba lagi, atau gunakan email dan password CMS.');
        } finally {
            $request->session()->forget(['state', 'code_verifier']);
        }
        $subject = $identity->getId();
        $email = mb_strtolower(trim((string) $identity->getEmail()));
        if (! is_string($subject) || $subject === '' || strlen($subject) > 255
            || strlen($email) > 254 || ! filter_var($email, FILTER_VALIDATE_EMAIL)
            || ($identity->user['email_verified'] ?? false) !== true) {
            return $this->reject($request, 'Alamat email Google belum terverifikasi. Gunakan akun Google dengan email terverifikasi.');
        }

        return DB::transaction(function () use ($request, $subject, $email) {
            $admin = Admin::where('email', $email)->lockForUpdate()->first();
            if (! AdminLogin::allowed($admin)
                || ($admin->googleSubject !== null && ! hash_equals($admin->googleSubject, $subject))
                || Admin::where('googleSubject', $subject)->where('id', '!=', $admin->id)->exists()) {
                Audit::record($admin, 'login_failed', 'auth', 'Login Google ditolak');

                return $this->reject($request, 'Akun Google ini belum dapat mengakses CMS. Periksa email akun atau hubungi superadmin.');
            }
            if ($admin->googleSubject !== null) {
                return AdminLogin::complete($request, $admin, 'google');
            }
            $request->session()->regenerate();
            $request->session()->put('google_pending', [
                'admin_id' => $admin->id, 'email' => $email, 'subject' => $subject,
                'version' => $admin->sessionVersion, 'expires_at' => time() + 600,
            ]);

            return redirect()->route('login');
        });
    }

    public function confirm(Request $request): RedirectResponse
    {
        $pending = GoogleLogin::pending($request);
        if (! $pending || $request->user()) {
            return $this->reject($request, 'Konfirmasi Google sudah berakhir. Silakan mulai kembali.');
        }
        $keys = ['login:email:'.hash('sha256', $pending['email']), 'login:ip:'.hash('sha256', $request->ip())];
        foreach ($keys as $index => $key) {
            if (RateLimiter::tooManyAttempts($key, $index === 0 ? 5 : 50)) {
                return redirect()->route('login')->withErrors(['google' => 'Terlalu banyak percobaan. Coba kembali dalam '.RateLimiter::availableIn($key).' detik.']);
            }
        }
        $data = $request->validate(['password' => ['required', 'string', 'max:200']]);

        return DB::transaction(function () use ($request, $pending, $data, $keys) {
            $admin = Admin::whereKey($pending['admin_id'])->lockForUpdate()->first();
            if (! AdminLogin::allowed($admin) || $admin->sessionVersion !== $pending['version']
                || mb_strtolower($admin->email) !== $pending['email'] || $admin->googleSubject !== null
                || Admin::where('googleSubject', $pending['subject'])->exists()) {
                return $this->reject($request, 'Akun berubah sejak login dimulai. Silakan mulai kembali atau hubungi superadmin.');
            }
            if (! password_verify($data['password'], $admin->passwordHash)) {
                foreach ($keys as $key) {
                    RateLimiter::hit($key, 900);
                }
                Audit::record($admin, 'login_failed', 'auth', 'Konfirmasi penghubungan Google gagal');

                return redirect()->route('login')->withErrors(['google' => 'Password CMS tidak sesuai. Masukkan password CMS, bukan password Google.']);
            }
            $admin->googleSubject = $pending['subject'];
            $admin->save();
            Audit::record($admin, 'update', 'accounts', 'Akun Google dihubungkan');
            RateLimiter::clear($keys[0]);

            return AdminLogin::complete($request, $admin, 'google');
        });
    }

    public function cancel(Request $request): RedirectResponse
    {
        GoogleLogin::clear($request);

        return redirect()->route('login');
    }

    private function reject(Request $request, string $message): RedirectResponse
    {
        GoogleLogin::clear($request);

        return redirect()->route('login')->withErrors(['google' => $message]);
    }
}
