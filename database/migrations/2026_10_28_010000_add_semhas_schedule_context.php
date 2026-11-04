<?php

use App\Support\CmsOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['tempat', 'reviewer', 'catatan'] as $column) {
            if (! Schema::hasColumn('MonevSlot', $column)) {
                Schema::table('MonevSlot', function (Blueprint $table) use ($column) {
                    $table->text($column)->nullable();
                });
            }
        }
        DB::transaction(function () {
            $period = DB::table('AcaraPeriode')->where('acara', 'semhas')->where('tahun', 2026)->whereNull('deletedAt')->first();
            if (! $period || DB::table('MonevSlot')->where('acara', 'semhas')->where(function ($query) use ($period) {
                $query->where('periodeId', $period->id)->orWhere('tanggal', 'like', '2026-%');
            })->exists()) {
                return;
            }
            $schemes = DB::table('AcaraSkema')->where('periodeId', $period->id)->whereNull('deletedAt')->get()->keyBy('nama');
            if (! isset($schemes['Penelitian'], $schemes['Pengabdian kepada Masyarakat'])) {
                return;
            }
            $rows = json_decode(file_get_contents(database_path('semhas-2026-schedule.json')), true, flags: JSON_THROW_ON_ERROR);
            $groups = [];
            foreach ($rows as &$row) {
                $row['periodeId'] = $period->id;
                $row['skemaId'] = $schemes[$row['sesi'] === 'penelitian' ? 'Penelitian' : 'Pengabdian kepada Masyarakat']->id;
                $scope = array_intersect_key($row, array_flip(CmsOrder::scopeFields('MonevSlot')));
                $groups[json_encode($scope)] = $scope;
            }
            unset($row);
            foreach (array_chunk($rows, 40) as $chunk) {
                DB::table('MonevSlot')->insert($chunk);
            }
            foreach ($groups as $scope) {
                CmsOrder::normalize('MonevSlot', $scope);
            }
        });
    }

    public function down(): void
    {
        // Preserve imported schedules and administrator edits.
    }
};
