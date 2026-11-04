<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_excel_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('admin_id');
            $table->string('resource', 80);
            $table->longText('definition');
            $table->longText('payload');
            $table->text('result')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('created_at');
        });
        Schema::create('cms_excel_locks', function (Blueprint $table) {
            $table->string('id')->primary();
        });
        DB::table('cms_excel_locks')->insert(['id' => 'import']);
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_excel_imports');
        Schema::dropIfExists('cms_excel_locks');
    }
};
