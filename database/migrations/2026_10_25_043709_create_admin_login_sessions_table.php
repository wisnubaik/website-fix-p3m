<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_login_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('admin_id')->index();
            $table->unsignedInteger('version');
            $table->string('method', 16);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500);
            $table->unsignedBigInteger('created_at');
            $table->unsignedBigInteger('last_active_at');
            $table->unsignedBigInteger('expires_at')->index();
            $table->unsignedBigInteger('revoked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_login_sessions');
    }
};
