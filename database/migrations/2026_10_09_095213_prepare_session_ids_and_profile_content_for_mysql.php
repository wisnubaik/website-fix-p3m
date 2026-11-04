<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->string('user_id')->nullable()->change();
        });
        Schema::table('ProfileTableContent', function (Blueprint $table) {
            $table->longText('content')->change();
        });
    }

    public function down(): void
    {
        // Keep the wider types: narrowing would corrupt string admin IDs or truncate profile content.
    }
};
