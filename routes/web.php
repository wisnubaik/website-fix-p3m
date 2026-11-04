<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminAccountController;
use App\Http\Controllers\AdminResearchController;
use App\Http\Controllers\ArchiveAssetController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CmsController;
use App\Http\Controllers\CmsResetController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\ExcelImportController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\ManagedPageController;
use App\Http\Controllers\ProfileTableController;
use App\Http\Controllers\ResearchController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SiteMenuController;
use App\Http\Controllers\SiteMetadataController;
use App\Http\Controllers\UploadController;
use App\Http\Middleware\GuardCmsGeneration;
use App\Support\CmsContent;
use App\Support\PublicLinks;
use Illuminate\Support\Facades\Route;

Route::get('/', [ResearchController::class, 'home'])->name('home');
Route::get('/sitemap.xml', [SiteMetadataController::class, 'sitemap']);
Route::get('/robots.txt', [SiteMetadataController::class, 'robots']);
Route::get('/hubungi', [ContentController::class, 'standalone'])->defaults('page', 'hubungi')->name('contact');
Route::get('/informasi/{page}', [ContentController::class, 'information'])
    ->whereIn('page', ['kegiatan', 'laporan-keuangan', 'luaran', 'mitra', 'pengumuman', 'sinta', 'tkt']);
Route::get('/layanan/{page}', [ContentController::class, 'service'])
    ->whereIn('page', ['asesmen', 'ki', 'monev', 'panduan', 'semhas']);
Route::get('/profil', [ContentController::class, 'standalone'])->defaults('page', 'profil');
Route::get('/repository', [ContentController::class, 'standalone'])->defaults('page', 'repository');
Route::get('/riset-grup', [ContentController::class, 'standalone'])->defaults('page', 'riset-grup');
Route::get('/{hub}', [ResearchController::class, 'hub'])->whereIn('hub', ['penelitian', 'pkm'])->name('research.hub');
Route::get('/{hub}/{scheme}', [ResearchController::class, 'show'])
    ->whereIn('hub', ['penelitian', 'pkm'])->whereIn('scheme', ['internal', 'eksternal', 'unggulan'])->name('research.show');

Route::get('/admin/login', [AuthController::class, 'create'])->name('login');
Route::post('/admin/login', [AuthController::class, 'store'])->name('login.store');
Route::middleware('throttle:20,1')->prefix('admin/login/google')->group(function () {
    Route::get('/', [GoogleAuthController::class, 'redirect'])->name('login.google');
    Route::get('/callback', [GoogleAuthController::class, 'callback'])->name('login.google.callback');
    Route::post('/confirm', [GoogleAuthController::class, 'confirm'])->name('login.google.confirm');
    Route::post('/cancel', [GoogleAuthController::class, 'cancel'])->name('login.google.cancel');
});
Route::middleware(['auth', 'admin.session', GuardCmsGeneration::class])->prefix('admin')->group(function () {
    Route::get('/arsip/{path}', [ArchiveAssetController::class, 'show'])->where('path', '.*');
    Route::get('/', [AdminResearchController::class, 'dashboard'])->name('admin.dashboard');
    Route::post('/logout', [AuthController::class, 'destroy'])->name('logout');
    Route::get('/akun', [AccountController::class, 'edit'])->name('account.edit');
    Route::put('/akun/password', [AccountController::class, 'update'])->name('account.update');
    Route::get('/riset-entries', [AdminResearchController::class, 'index'])->name('research.index');
    Route::post('/riset-entries', [AdminResearchController::class, 'store'])->name('research.store');
    Route::put('/riset-entries/{entry}', [AdminResearchController::class, 'update'])->name('research.update');
    Route::delete('/riset-entries/{entry}', [AdminResearchController::class, 'destroy'])->name('research.destroy');
    Route::post('/riset-entries/{id}/restore', [AdminResearchController::class, 'restore'])->name('research.restore');
    Route::get('/halaman', [ManagedPageController::class, 'index']);
    Route::get('/halaman/{id}', [ManagedPageController::class, 'edit']);
    Route::get('/reset-konten', [CmsResetController::class, 'index']);
    Route::get('/menu', [SiteMenuController::class, 'edit']);
    Route::get('/log/export', [CmsController::class, 'exportLog'])->middleware('throttle:5,1');
    Route::get('/log', [CmsController::class, 'log']);
    Route::get('/statistik', fn () => redirect('/admin'));
    Route::get('/{page}', [CmsController::class, 'page'])->whereIn('page', [...CmsContent::PAGES, 'kelola-akun']);
});

Route::middleware(['auth', 'admin.session', GuardCmsGeneration::class])->prefix('api/admin')->group(function () {
    Route::post('/logout', [AuthController::class, 'destroy'])->name('logout.api');
    Route::get('/account/session', [SessionController::class, 'status'])->name('account.session.status');
    Route::post('/account/session/extend', [SessionController::class, 'status'])->middleware('throttle:10,1')->name('account.session.extend');
    Route::get('/account/sessions', [SessionController::class, 'index'])->name('account.sessions.index');
    Route::delete('/account/sessions/{id}', [SessionController::class, 'destroy'])->middleware('throttle:20,1')->name('account.sessions.destroy');
    Route::post('/account/google/disconnect', [AccountController::class, 'disconnectGoogle'])->middleware('throttle:10,1')->name('account.google.disconnect');
    Route::get('/account', [AccountController::class, 'show'])->name('account.api.show');
    Route::put('/account', [AccountController::class, 'update'])->name('account.api.update');
    Route::post('/account/logout-all', [AccountController::class, 'logoutAll'])->name('account.api.logout-all');
    Route::get('/accounts', [AdminAccountController::class, 'index']);
    Route::post('/accounts', [AdminAccountController::class, 'store']);
    Route::patch('/accounts/{id}', [AdminAccountController::class, 'update']);
    Route::delete('/accounts/{id}', [AdminAccountController::class, 'destroy']);
    Route::post('/cms-reset/preview', [CmsResetController::class, 'preview'])->middleware('throttle:30,1');
    Route::post('/cms-reset/execute', [CmsResetController::class, 'execute'])->middleware('throttle:6,1');
    Route::post('/managed-pages', [ManagedPageController::class, 'store']);
    Route::put('/managed-pages/{id}', [ManagedPageController::class, 'update']);
    Route::get('/site-menu', [SiteMenuController::class, 'show']);
    Route::post('/site-menu/attach', [SiteMenuController::class, 'attach']);
    Route::put('/site-menu', [SiteMenuController::class, 'update']);
    Route::get('/upload-inventory', [UploadController::class, 'inventory'])->middleware('throttle:10,1');
    Route::post('/upload', [UploadController::class, 'store']);
    Route::post('/reorder', [CmsController::class, 'reorder']);
    Route::get('/link-options', fn () => response()->json(PublicLinks::options()));
    Route::get('/archive', [CmsController::class, 'archive']);
    Route::post('/excel/{resource}/template', [ExcelImportController::class, 'template'])->middleware('throttle:30,1');
    Route::post('/excel/{resource}/preview', [ExcelImportController::class, 'preview'])->middleware('throttle:30,1');
    Route::post('/excel/{resource}/bulk-preview', [ExcelImportController::class, 'bulkPreview'])->middleware('throttle:30,1');
    Route::post('/excel/{resource}/commit', [ExcelImportController::class, 'commit'])->middleware('throttle:30,1');
    Route::get('/profile-tables', [ProfileTableController::class, 'index']);
    Route::put('/profile-tables/{id}', [ProfileTableController::class, 'update']);
    Route::get('/{resource}', [CmsController::class, 'index'])->whereIn('resource', array_keys(CmsContent::TABLES));
    Route::post('/{resource}', [CmsController::class, 'store'])->whereIn('resource', array_diff(array_keys(CmsContent::TABLES), ['hero', 'settings']));
    Route::put('/{resource}', [CmsController::class, 'update'])->whereIn('resource', ['hero', 'settings']);
    Route::put('/{resource}/{id}', [CmsController::class, 'update'])->whereIn('resource', array_diff(array_keys(CmsContent::TABLES), ['hero', 'settings']));
    Route::delete('/{resource}/{id}', [CmsController::class, 'destroy'])->whereIn('resource', array_keys(CmsContent::TABLES));
    Route::patch('/{resource}/{id}', [CmsController::class, 'restore'])->whereIn('resource', array_keys(CmsContent::TABLES));
});
Route::get('/uploads/{name}', [UploadController::class, 'show'])->where('name', '[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|svg|pdf|docx|xlsx|pptx)');

Route::get('/{managedPath}', [ManagedPageController::class, 'show'])->where('managedPath', '.*');
