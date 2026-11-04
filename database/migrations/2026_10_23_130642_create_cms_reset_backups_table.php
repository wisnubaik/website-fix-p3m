<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_reset_state', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->unsignedBigInteger('generation')->default(0);
        });
        DB::table('cms_reset_state')->insert(['id' => 'content', 'generation' => 0]);
        Schema::create('cms_reset_backups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('scope', 190);
            $table->string('label');
            $table->string('action', 20);
            $table->string('actor');
            $table->longText('snapshot');
            $table->timestamp('created_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_reset_backups');
        Schema::dropIfExists('cms_reset_state');
    }
};
