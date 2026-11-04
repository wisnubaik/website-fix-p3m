<?php

namespace App\Http\Middleware;

use App\Support\DisplayText;
use App\Support\ManagedContent;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if ($response instanceof JsonResponse && ($request->is('api/admin/*') || $response->headers->has('X-Inertia'))) {
            $data = $response->getData();
            if ($response->headers->has('X-Inertia') && isset($data->props)) {
                $data->props = DisplayText::values($data->props);
            } else {
                $data = DisplayText::values($data);
            }
            $response->setData($data);
        }
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $embeddedPreview = $response->isSuccessful() && $request->boolean('cms_preview')
            && ! $request->is('admin', 'admin/*', 'api/*', 'uploads/*')
            && ManagedContent::canPreview($request) && ManagedContent::page($request->getPathInfo()) !== null;
        $response->headers->set('X-Frame-Options', $embeddedPreview ? 'SAMEORIGIN' : 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Content-Security-Policy', ($response->headers->has('Content-Security-Policy') ? $response->headers->get('Content-Security-Policy').'; ' : '').'frame-ancestors '.($embeddedPreview ? "'self'" : "'none'")."; base-uri 'self'; object-src 'none'; form-action 'self'");
        if ($request->is('admin', 'admin/*', 'api/admin/*', 'uploads/*')) {
            $response->headers->set('Cache-Control', 'private, no-store');
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }
}
