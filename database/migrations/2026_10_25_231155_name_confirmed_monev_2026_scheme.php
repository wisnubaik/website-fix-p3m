<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $periods = DB::table('AcaraPeriode')->where('acara', 'monev')->where('tahun', 2026)->pluck('id');
        $schemes = DB::table('AcaraSkema')->where('acara', 'monev')->whereIn('periodeId', $periods)->where('nama', 'Data lama (belum dipilah)')->whereNull('deletedAt')->get();
        foreach ($schemes as $scheme) {
            $description = $scheme->keterangan === 'Data dipindahkan dari jadwal sebelumnya. Ubah nama skema setelah pengelompokannya dikonfirmasi.' ? null : $scheme->keterangan;
            DB::table('AcaraSkema')->where('id', $scheme->id)->update(['nama' => 'Kompetitif Internal (DIPA)', 'keterangan' => $description, 'updatedAt' => now()]);
        }
    }

    public function down(): void
    {
        // Keep confirmed labels and subsequent administrator edits on rollback.
    }
};
