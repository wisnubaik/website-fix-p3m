<?php

namespace App\Http\Middleware;

use App\Support\ManagedContent;
use App\Support\PublicLinks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $metadata = json_decode(file_get_contents(database_path('page-metadata.json')), true, 512, JSON_THROW_ON_ERROR);
        $pageMeta = $metadata[$request->getPathInfo()] ?? null;

        $cms = ManagedContent::shared($request);
        if ($cms && $cms['document']) {
            $pageMeta = ['title' => $cms['document']['title'], 'description' => $cms['document']['description'], 'path' => $request->getPathInfo()];
        }

        return [
            ...parent::share($request),
            'cms' => $cms,
            'cmsGeneration' => fn () => $request->is('admin', 'admin/*') ? (int) DB::table('cms_reset_state')->where('id', 'content')->value('generation') : 0,
            'cmsRoutes' => fn () => $request->is('admin', 'admin/*') ? PublicLinks::options() : [],
            'auth' => ['user' => fn () => $request->user()?->only('id', 'name', 'email', 'role', 'mustChangePassword')],
            'site' => fn () => DB::table('SiteSettings')->where('id', 'settings')
                ->first(['institution', 'officeTitle', 'officeDescription', 'email', 'phone', 'fax', 'instagram', 'address', 'mapsUrl', 'poBox', 'logoUrl']),
            'flash' => ['success' => fn () => $request->session()->get('success')],
            'seo' => $pageMeta ? [...$pageMeta, 'url' => rtrim(config('app.url'), '/').$request->getPathInfo(), 'image' => rtrim(config('app.url'), '/').'/logo/p3m-pnm.png'] : null,
        ];
    }
}
