<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('managed_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('path', 190)->unique();
            $table->boolean('builtin')->default(false);
            $table->string('template', 30);
            $table->json('draft');
            $table->json('published')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->timestamp('published_at')->nullable();
            $table->softDeletes();
        });
        Schema::create('managed_page_revisions', function (Blueprint $table) {
            $table->id();
            $table->uuid('page_id')->index();
            $table->json('document');
            $table->timestamp('created_at');
        });
        Schema::create('site_navigation', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->json('draft');
            $table->json('published');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        $catalog = json_decode(file_get_contents(database_path('managed-site-catalog.json')), true, 512, JSON_THROW_ON_ERROR);
        $ids = [];
        foreach ($catalog['pages'] as $path => $page) {
            $id = $ids[$path] = (string) Str::uuid();
            $document = json_encode(['title' => $page['title'], 'description' => $page['description'], 'fields' => (object) [], 'collections' => (object) [], 'blocks' => [], 'placement' => 'after'], JSON_THROW_ON_ERROR);
            DB::table('managed_pages')->insert(['id' => $id, 'path' => $path, 'builtin' => true, 'template' => 'existing', 'draft' => $document, 'published' => $document, 'version' => 1, 'created_at' => now(), 'updated_at' => now(), 'published_at' => now()]);
        }
        $convert = function (array $item) use (&$convert, $ids): array {
            return ['id' => (string) Str::uuid(), 'label' => $item['label'], 'pageId' => $ids[$item['href'] ?? ''] ?? '', 'href' => isset($ids[$item['href'] ?? '']) ? '' : ($item['href'] ?? ''), 'visible' => true, 'children' => array_map($convert, $item['children'] ?? [])];
        };
        $menu = json_encode(array_map($convert, $catalog['menu']), JSON_THROW_ON_ERROR);
        DB::table('site_navigation')->insert(['id' => 'main', 'draft' => $menu, 'published' => $menu, 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::dropIfExists('managed_page_revisions');
        Schema::dropIfExists('site_navigation');
        Schema::dropIfExists('managed_pages');
    }
};
