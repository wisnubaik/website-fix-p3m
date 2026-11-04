<?php

namespace App\Providers;

use App\Support\DisplayText;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Inertia\Ssr\SsrState;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        View::composer('app', function (\Illuminate\View\View $view): void {
            $page = $view->getData()['page'] ?? null;
            if (is_array($page) && isset($page['props'])) {
                $page['props'] = DisplayText::values($page['props']);
                $view->with('page', $page);
                app(SsrState::class)->setPage($page);
            }
        });
    }
}
