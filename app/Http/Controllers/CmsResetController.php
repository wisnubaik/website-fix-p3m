<?php

namespace App\Http\Controllers;

use App\Support\CmsReset;
use App\Support\ManagedContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CmsResetController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $pages = DB::table('managed_pages')->whereNull('deleted_at')->orderBy('path')->get(['id', 'path', 'draft', 'builtin'])->map(fn ($page) => ['id' => $page->id, 'path' => $page->path, 'title' => ManagedContent::decode($page->draft)['title'], 'builtin' => (bool) $page->builtin]);
        $backups = DB::table('cms_reset_backups')->select(['id', 'scope', 'label', 'action', 'actor', 'created_at'])->orderByDesc('created_at')->orderByDesc('id')->paginate(10)->withQueryString();

        return Inertia::render('Admin/Reset', ['resetPages' => $pages, 'backups' => $backups, 'initialScope' => $request->query('scope', ''), 'baseline' => CmsReset::defaults()['version'], 'completedBackup' => DB::table('cms_reset_backups')->where('id', (string) $request->query('completed', ''))->value('id')]);
    }

    public function preview(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $data = $request->validate(['scope' => ['required', 'string', 'max:190'], 'backupId' => ['nullable', 'uuid']]);

        return response()->json(CmsReset::preview($data['scope'], $data['backupId'] ?? null));
    }

    public function execute(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $data = $request->validate(['scope' => ['required', 'string', 'max:190'], 'backupId' => ['nullable', 'uuid'], 'fingerprint' => ['required', 'string', 'size:64'], 'confirmation' => ['required', 'string']]);
        $preview = CmsReset::preview($data['scope'], $data['backupId'] ?? null);
        $request->validate(['confirmation' => ['required', Rule::in([$preview['phrase']])]]);
        $backupId = CmsReset::execute($request->user(), $preview['scope'], $data['fingerprint'], $data['backupId'] ?? null);

        return response()->json(['backupId' => $backupId, 'generation' => DB::table('cms_reset_state')->where('id', 'content')->value('generation'), 'message' => 'Selesai. Kondisi sebelum tindakan tersimpan dalam riwayat cadangan.']);
    }
}
