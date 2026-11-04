<?php

namespace App\Http\Middleware;

use App\Support\CmsContent;
use Closure;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class GuardCmsGeneration
{
    public function handle(Request $request, Closure $next): Response
    {
        $resource = $request->segment(3);
        $contentApi = $request->is('api/admin/*') && in_array($resource, [...array_keys(CmsContent::TABLES), 'managed-pages', 'site-menu', 'profile-tables', 'reorder', 'excel', 'cms-reset'], true);
        if ($request->isMethodSafe() || (! $contentApi && ! $request->is('admin/riset-entries', 'admin/riset-entries/*'))) {
            return $next($request);
        }

        return DB::transaction(function () use ($request, $next) {
            $state = DB::table('cms_reset_state')->where('id', 'content')->lockForUpdate()->first();
            $generation = $request->header('X-CMS-Generation', '0');
            abort_unless(ctype_digit((string) $generation) && (int) $generation === (int) $state->generation, 409, 'Konten situs baru saja direset atau dipulihkan. Muat ulang halaman sebelum mengubah data.');

            $response = $next($request);
            if ($response->getStatusCode() >= 400) {
                throw new HttpResponseException($response);
            }

            return $response;
        });
    }
}
