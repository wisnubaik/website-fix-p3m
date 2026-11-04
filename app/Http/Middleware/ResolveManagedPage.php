<?php

namespace App\Http\Middleware;

use App\Support\ManagedContent;
use Closure;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveManagedPage
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('admin', 'admin/*', 'api/*', 'uploads/*')) {
            return $next($request);
        }
        $preview = $request->boolean('cms_preview');
        if ($preview && ! ManagedContent::canPreview($request)) {
            $response = Inertia::render('Public/PreviewUnavailable', ['publicPath' => $request->getPathInfo()])->toResponse($request);
            $response->setStatusCode(403);
            $response->headers->set('Cache-Control', 'private, no-store');
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');

            return $response;
        }
        $page = ManagedContent::page($request->getPathInfo());
        abort_if($page && ! $preview && $page->published === null, 404);
        $response = $next($request);
        if ($preview) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
            $response->headers->set('Cache-Control', 'private, no-store');
        }

        return $response;
    }
}
