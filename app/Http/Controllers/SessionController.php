<?php

namespace App\Http\Controllers;

use App\Support\AdminSessions;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        return response()->json(AdminSessions::status($request));
    }

    public function index(Request $request): JsonResponse
    {
        $sessions = DB::table('admin_login_sessions')->where('admin_id', $request->user()->id)
            ->where('version', $request->user()->sessionVersion)->whereNull('revoked_at')
            ->where('expires_at', '>', now()->timestamp)
            ->where('last_active_at', '>', now()->timestamp - AdminSessions::IDLE_SECONDS)
            ->orderByDesc('last_active_at')->get()->map(fn ($row) => [
                'id' => $row->id, 'current' => $row->id === $request->session()->get('admin_session_id'),
                'browser' => $row->user_agent, 'ip' => $row->ip_address, 'method' => $row->method,
                'lastActiveAt' => date(DATE_ATOM, $row->last_active_at),
            ]);

        return response()->json(['sessions' => $sessions]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $changed = DB::table('admin_login_sessions')->where('id', $id)
            ->where('admin_id', $request->user()->id)->whereNull('revoked_at')
            ->update(['revoked_at' => now()->timestamp]);
        abort_unless($changed, 404);
        Audit::record($request->user(), 'logout_session', 'account', 'Satu sesi perangkat dicabut');
        $current = $id === $request->session()->get('admin_session_id');
        if ($current) {
            AdminSessions::end($request);
        }

        return response()->json(['ok' => true, 'current' => $current]);
    }
}
