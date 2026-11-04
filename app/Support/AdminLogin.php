<?php

namespace App\Support;

use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AdminLogin
{
    public static function allowed(?Admin $admin): bool
    {
        return $admin && $admin->isActive && in_array($admin->role, ['ADMIN', 'SUPERADMIN'], true)
            && ! ($admin->mustChangePassword && $admin->tempPasswordExpiresAt?->isPast());
    }

    public static function complete(Request $request, Admin $admin, string $method = 'password'): RedirectResponse
    {
        DB::transaction(function () use ($admin, $method) {
            $admin->lastLoginAt = now();
            $admin->save();
            Audit::record($admin, 'login', 'auth', $method === 'google' ? 'Masuk dengan Google' : null);
        });
        $request->session()->forget(['google_pending', 'google_started_at', 'state', 'code_verifier']);
        Auth::login($admin);
        $request->session()->regenerate();
        $request->session()->put(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => now()->timestamp + AdminSessions::ABSOLUTE_SECONDS]);

        AdminSessions::start($request, $method);

        return redirect()->route($admin->mustChangePassword ? 'account.edit' : 'admin.dashboard');
    }
}
