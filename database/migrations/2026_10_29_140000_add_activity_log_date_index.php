<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ActivityLog', function (Blueprint $table): void {
            $table->index(['createdAt', 'id'], 'activity_log_date_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('ActivityLog', function (Blueprint $table): void {
            $table->dropIndex('activity_log_date_id_index');
        });
    }
};
