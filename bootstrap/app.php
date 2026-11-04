<?php

use App\Http\Middleware\EnsureAdminSession;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveManagedPage;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo('/admin/login');
        $middleware->redirectUsersTo('/admin');
        $middleware->trimStrings(except: ['document.blocks.*.richText.*.runs.*.text']);
        $middleware->convertEmptyStringsToNull(except: [
            fn (Request $request) => $request->is('api/admin/*'),
        ]);
        $middleware->web(append: [
            SecurityHeaders::class,
            ResolveManagedPage::class,
            HandleInertiaRequests::class,
        ]);
        $middleware->alias(['admin.session' => EnsureAdminSession::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/admin/excel/*') || $exception instanceof HttpResponseException || $exception instanceof HttpExceptionInterface || $exception instanceof ValidationException || $exception instanceof AuthenticationException || $exception instanceof AuthorizationException) {
                return null;
            }
            if ($exception instanceof Error && str_contains($exception->getMessage(), 'App\\Support\\CmsOrder')) {
                return response()->json([
                    'code' => 'EXCEL_ORDER_UNAVAILABLE',
                    'message' => 'Impor belum bisa disimpan karena komponen pengurutan data belum terpasang lengkap. Ini bukan kesalahan isi Excel. Minta pengelola teknis memasang paket perbaikan lengkap, lalu periksa ulang Excel dan konfirmasi impor.',
                ], 503);
            }

            return response()->json([
                'code' => 'EXCEL_SERVER_ERROR',
                'message' => 'Proses Excel gagal karena gangguan pada server. Muat ulang daftar untuk memeriksa hasil, lalu coba lagi. Jika tetap gagal, hubungi pengelola teknis dan sertakan waktu kejadian. Rincian teknis dicatat pada log aplikasi.',
            ], 500);
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
