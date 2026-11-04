<?php

namespace App\Http\Middleware;

use App\Support\AdminSessions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user();
        if (! AdminSessions::valid($request, ! $request->routeIs('account.session.status'))) {
            AdminSessions::end($request);

            return $request->expectsJson()
                ? response()->json(['error' => 'Sesi Anda telah berakhir.', 'code' => 'UNAUTHORIZED'], 401)
                : redirect()->route('login');
        }
        if ($request->hasHeader('X-CMS-Actor') && $request->header('X-CMS-Actor') !== $admin->id) {
            return response()->json(['error' => 'Akun aktif berubah. Muat ulang halaman.', 'code' => 'ACCOUNT_CHANGED'], 409);
        }
        if ($admin->mustChangePassword && ! $request->routeIs('account.*', 'logout', 'logout.api')) {
            return $request->expectsJson()
                ? response()->json(['error' => 'Ganti password terlebih dahulu.'], 403)
                : redirect()->route('account.edit');
        }

        return $next($request);
    }
}
