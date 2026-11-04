<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $period = DB::table('AcaraPeriode')->where('acara', 'semhas')->where('tahun', 2026)->first();
            if (! $period) {
                $id = (string) Str::uuid();
                DB::table('AcaraPeriode')->insert([
                    'id' => $id, 'acara' => 'semhas', 'tahun' => 2026,
                    'judul' => 'Seminar Hasil 2026',
                    'tanggalMulai' => '2026-10-12', 'tanggalSelesai' => '2026-10-19',
                    'tempat' => 'Kampus 1 dan Kampus 2 Politeknik Negeri Madiun',
                    'keterangan' => 'Seminar hasil penelitian dan pengabdian kepada masyarakat tahun 2026. Pelaksanaan dibagi menurut jurusan, lokasi, dan jenis kegiatan sesuai Jadwal Semhas 2026 rev.2.',
                    'timeline' => '[]', 'published' => true, 'deletedAt' => null, 'updatedAt' => now(),
                ]);
                $period = DB::table('AcaraPeriode')->where('id', $id)->first();
            }
            if (! $period->deletedAt) {
                $defaults = [
                    'Penelitian' => 'Seminar hasil penelitian tahun 2026 untuk Jurusan Administrasi Bisnis, Akuntansi, dan Teknik. Jadwal pada sumber mencakup 12, 14, 15, dan 19 Oktober 2026; lokasi serta waktu mengikuti pembagian peserta. Pengelompokan ini berdasarkan jenis kegiatan, bukan skema pendanaan.',
                    'Pengabdian kepada Masyarakat' => 'Seminar hasil pengabdian kepada masyarakat tahun 2026 untuk Jurusan Administrasi Bisnis, Akuntansi, dan Teknik. Jadwal pada sumber mencakup 13, 14, 16, dan 19 Oktober 2026; lokasi serta waktu mengikuti pembagian peserta. Pengelompokan ini berdasarkan jenis kegiatan, bukan skema pendanaan.',
                ];
                $order = (int) DB::table('AcaraSkema')->where('periodeId', $period->id)->max('order') + 1;
                foreach ($defaults as $name => $description) {
                    $existing = DB::table('AcaraSkema')->where('periodeId', $period->id)->where('nama', $name)->first();
                    if (! $existing) {
                        DB::table('AcaraSkema')->insert([
                            'id' => (string) Str::uuid(), 'acara' => 'semhas', 'periodeId' => $period->id,
                            'nama' => $name, 'keterangan' => $description, 'order' => $order++,
                            'published' => true, 'deletedAt' => null, 'createdAt' => now(), 'updatedAt' => now(),
                        ]);
                    } elseif (! $existing->deletedAt && trim((string) $existing->keterangan) === '') {
                        DB::table('AcaraSkema')->where('id', $existing->id)->update(['keterangan' => $description, 'updatedAt' => now()]);
                    }
                }
            }
            $legacy = DB::table('AcaraSkema')->where('acara', 'semhas')->where('nama', 'Data lama (belum dipilah)')->whereNull('deletedAt')->get();
            foreach ($legacy as $scheme) {
                $owner = DB::table('AcaraPeriode')->where('id', $scheme->periodeId)->whereNull('deletedAt')->first();
                if (! $owner) {
                    continue;
                }
                $year = (int) $owner->tahun;
                $name = $year === 2026 ? 'Informasi umum Seminar Hasil 2026' : 'Arsip Seminar Hasil'.($year ? ' '.$year : '');
                if (DB::table('AcaraSkema')->where('periodeId', $owner->id)->where('nama', $name)->exists()) {
                    continue;
                }
                $changes = ['nama' => $name, 'updatedAt' => now()];
                if (trim((string) $scheme->keterangan) === '' || $scheme->keterangan === 'Data dipindahkan dari jadwal sebelumnya. Ubah nama skema setelah pengelompokannya dikonfirmasi.') {
                    $changes['keterangan'] = 'Dokumen dan informasi seminar hasil'.($year ? ' tahun '.$year : '').' yang tersimpan sebelumnya. Data pada bagian ini belum dikelompokkan menjadi Penelitian atau Pengabdian kepada Masyarakat.';
                }
                DB::table('AcaraSkema')->where('id', $scheme->id)->update($changes);
            }
        });
    }

    public function down(): void
    {
        // Preserve administrator edits and linked documents or schedules.
    }
};
