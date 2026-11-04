<?php

use App\Support\CmsOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $period = DB::table('AcaraPeriode')->where('acara', 'semhas')->where('tahun', 2026)->whereNull('deletedAt')->lockForUpdate()->first();
            if (! $period) {
                return;
            }
            CmsOrder::lock('AcaraSkema');
            CmsOrder::lock('MonevSlot');
            CmsOrder::lock('DocumentItem');
            $schemes = DB::table('AcaraSkema')->where('periodeId', $period->id)->whereNull('deletedAt')
                ->whereIn('nama', ['Penelitian', 'Pengabdian kepada Masyarakat', 'Skema 1'])->get();
            $target = $schemes->firstWhere('nama', 'Skema 1') ?? $schemes->firstWhere('nama', 'Penelitian') ?? $schemes->first();
            if (! $target || $schemes->every(fn ($scheme) => $scheme->nama === 'Skema 1')) {
                return;
            }
            foreach ($schemes as $scheme) {
                foreach (['MonevSlot', 'DocumentItem'] as $table) {
                    $changes = ['skemaId' => $target->id, 'updatedAt' => now()];
                    if (! $scheme->published) {
                        $changes['published'] = false;
                    }
                    DB::table($table)->where('periodeId', $period->id)->where('skemaId', $scheme->id)->update($changes);
                }
                if ($scheme->id !== $target->id) {
                    DB::table('AcaraSkema')->where('id', $scheme->id)->update(['published' => false, 'deletedAt' => now(), 'updatedAt' => now()]);
                }
            }
            DB::table('AcaraSkema')->where('id', $target->id)->update([
                'nama' => 'Skema 1',
                'keterangan' => $target->nama === 'Skema 1' && trim((string) $target->keterangan) !== '' ? $target->keterangan : 'Jadwal seminar hasil penelitian dan pengabdian kepada masyarakat tahun 2026. Pilih jurusan, jenis kegiatan, dan tanggal pelaksanaan untuk melihat jadwal peserta.',
                'published' => $schemes->contains(fn ($scheme) => (bool) $scheme->published), 'updatedAt' => now(),
            ]);
            foreach (['MonevSlot', 'DocumentItem'] as $table) {
                $groups = DB::table($table)->where('periodeId', $period->id)->where('skemaId', $target->id)->get(CmsOrder::scopeFields($table));
                foreach ($groups->unique(fn ($row) => json_encode($row)) as $scope) {
                    CmsOrder::normalize($table, (array) $scope);
                }
            }
            CmsOrder::normalize('AcaraSkema', ['acara' => 'semhas', 'periodeId' => $period->id]);
        });
    }

    public function down(): void
    {
        // Keep schedules, documents, and subsequent administrator edits intact.
    }
};
