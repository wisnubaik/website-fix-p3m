<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ContentListItem', function (Blueprint $table) {
            $table->string('label', 180)->nullable();
        });
        DB::table('ContentListItem')->where('section', 'home-agenda')->update(['label' => 'Agenda berjalan 2026']);
        $home = DB::table('managed_pages')->where('path', '/')->value('published');
        $fields = json_decode($home ?? '{}', true)['fields'] ?? [];
        $prefix = $fields['f_ee29ea1ea3c9c7'] ?? 'Didanai';
        $year = $fields['home_tahun_12185'] ?? '2026';
        foreach (DB::table('StatEntry')->where('group', 'pendanaan-resmi-2026')->get(['id', 'label']) as $row) {
            DB::table('StatEntry')->where('id', $row->id)->update(['label' => trim($prefix.' '.$row->label.' '.$year)]);
        }
    }

    public function down(): void
    {
        Schema::table('ContentListItem', function (Blueprint $table) {
            $table->dropColumn('label');
        });
    }
};
