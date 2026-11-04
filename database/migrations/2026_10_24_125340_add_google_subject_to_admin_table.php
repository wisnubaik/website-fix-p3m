<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Admin', function (Blueprint $table) {
            $table->string('googleSubject', 255)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('Admin', function (Blueprint $table) {
            $table->dropUnique(['googleSubject']);
            $table->dropColumn('googleSubject');
        });
    }
};
