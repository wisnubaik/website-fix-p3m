<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminSessions
{
    public const IDLE_SECONDS = 1800;

    public const ABSOLUTE_SECONDS = 28800;

    public static function start(Request $request, string $method, ?int $expires = null): void
    {
        $admin = $request->user();
        $id = (string) Str::uuid();
        $expires = min($expires ?? PHP_INT_MAX, now()->timestamp + self::ABSOLUTE_SECONDS);
        DB::table('admin_login_sessions')->insert([
            'id' => $id, 'admin_id' => $admin->id, 'version' => $admin->sessionVersion,
            'method' => $method, 'ip_address' => $request->ip(),
            'user_agent' => mb_substr($request->userAgent() ?? '', 0, 500),
            'created_at' => now()->timestamp, 'last_active_at' => now()->timestamp,
            'expires_at' => $expires, 'revoked_at' => null,
        ]);
        $request->session()->put(['admin_session_id' => $id, 'admin_expires_at' => $expires]);
        DB::table('admin_login_sessions')->where('admin_id', $admin->id)
            ->where('expires_at', '<', now()->timestamp - 86400)->delete();
    }

    public static function valid(Request $request, bool $touch = false): bool
    {
        $admin = $request->user();
        if (! $admin || ! $admin->isActive || ! in_array($admin->role, ['ADMIN', 'SUPERADMIN'], true)
            || $request->session()->get('admin_version') !== $admin->sessionVersion
            || (int) $request->session()->get('admin_expires_at', 0) <= now()->timestamp
            || ($admin->mustChangePassword && $admin->tempPasswordExpiresAt?->isPast())) {
            return false;
        }
        if (! $request->session()->has('admin_session_id')) {
            // Existing sessions used a fixed 12-hour limit. Retain their original login time.
            $expires = (int) $request->session()->get('admin_expires_at') - 43200 + self::ABSOLUTE_SECONDS;
            if ($expires <= now()->timestamp) {
                return false;
            }
            self::start($request, 'legacy', $expires);
        }
        $query = DB::table('admin_login_sessions')->where('id', $request->session()->get('admin_session_id'))
            ->where('admin_id', $admin->id)->where('version', $admin->sessionVersion)->whereNull('revoked_at')
            ->where('expires_at', '>', now()->timestamp)
            ->where('last_active_at', '>', now()->timestamp - self::IDLE_SECONDS);
        if (! $query->exists()) {
            return false;
        }
        if ($touch) {
            $query->update(['last_active_at' => now()->timestamp]);
        }

        return true;
    }

    public static function end(Request $request): void
    {
        if ($request->user() && $request->session()->has('admin_session_id')) {
            DB::table('admin_login_sessions')->where('id', $request->session()->get('admin_session_id'))
                ->where('admin_id', $request->user()->id)->update(['revoked_at' => now()->timestamp]);
        }
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    public static function authenticated(Request $request): bool
    {
        if (! $request->user()) {
            return false;
        }
        if (self::valid($request)) {
            return true;
        }
        self::end($request);

        return false;
    }

    public static function status(Request $request): array
    {
        $row = DB::table('admin_login_sessions')->where('id', $request->session()->get('admin_session_id'))->first();

        return [
            'adminId' => $request->user()->id,
            'role' => $request->user()->role, 'setup' => $request->user()->mustChangePassword,
            'secondsRemaining' => max(0, min($row->expires_at, $row->last_active_at + self::IDLE_SECONDS) - now()->timestamp),
            'absoluteSecondsRemaining' => max(0, $row->expires_at - now()->timestamp),
            'generation' => (string) (DB::table('cms_reset_state')->where('id', 'content')->value('generation') ?? 0),
        ];
    }
}
