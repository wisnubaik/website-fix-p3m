<?php

namespace App\Support;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;

class GoogleLogin
{
    public static function enabled(): bool
    {
        $config = config('services.google');
        $url = $config['redirect'] ?? '';
        $scheme = parse_url($url, PHP_URL_SCHEME);
        $host = parse_url($url, PHP_URL_HOST);

        return (bool) ($config['enabled'] ?? false) && filled($config['client_id'] ?? null)
            && filled($config['client_secret'] ?? null)
            && ($scheme === 'https' || (app()->environment('local', 'testing') && $scheme === 'http' && in_array($host, ['localhost', '127.0.0.1'], true)))
            && parse_url($url, PHP_URL_PATH) === '/admin/login/google/callback'
            && ! parse_url($url, PHP_URL_QUERY) && ! parse_url($url, PHP_URL_FRAGMENT);
    }

    public static function provider(): GoogleProvider
    {
        return Socialite::buildProvider(GoogleProvider::class, config('services.google'))
            ->setScopes(['openid', 'email', 'profile'])
            ->with(['prompt' => 'select_account'])
            ->enablePKCE();
    }

    public static function pending(Request $request): ?array
    {
        $pending = $request->session()->get('google_pending');
        if (! self::enabled() || ! is_array($pending) || ($pending['expires_at'] ?? 0) <= time()) {
            $request->session()->forget('google_pending');

            return null;
        }

        return $pending;
    }

    public static function clear(Request $request): void
    {
        $request->session()->forget(['google_pending', 'google_started_at', 'state', 'code_verifier']);
    }
}
