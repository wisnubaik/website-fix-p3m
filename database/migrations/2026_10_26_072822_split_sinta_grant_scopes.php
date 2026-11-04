<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $catalog = json_decode(file_get_contents(database_path('managed-site-catalog.json')), true);
        foreach (DB::table('managed_pages')->where('path', '/informasi/sinta')->get() as $page) {
            $update = [];
            foreach (['draft', 'published'] as $column) {
                if (! $page->{$column}) {
                    continue;
                }
                $doc = json_decode($page->{$column}, true);
                if (isset($doc['collections']['collection_sinta_ambang'])) {
                    $rows = [];
                    foreach ($doc['collections']['collection_sinta_ambang'] as $row) {
                        $scopes = match ($row['lingkup'] ?? '') {
                            'Tiga ruang lingkup' => ['Pemberdayaan Kewirausahaan Pemula', 'Pemberdayaan Kemitraan Kewirausahaan', 'Pemberdayaan Kewirausahaan oleh Mahasiswa'],
                            'Pemberdayaan Wilayah dan Desa Binaan' => ['Pemberdayaan Wilayah', 'Pemberdayaan Desa Binaan'],
                            default => null,
                        };
                        if ($scopes) {
                            foreach ($scopes as $scope) {
                                $rows[] = [...$row, 'lingkup' => $scope];
                            }
                        } else {
                            $rows[] = $row;
                        }
                    }
                    $doc['collections']['collection_sinta_ambang'] = $rows;
                }
                $old = 'SINTA Score Overall menjadi salah satu syarat ketua pengusul pada hibah DRTM. Angka di bawah mengikuti panduan hibah yang berlaku dan dapat berubah setiap tahun.';
                if (($doc['fields']['f_4dfc14df91811d'] ?? null) === $old) {
                    $doc['fields']['f_4dfc14df91811d'] = $catalog['fields']['f_4dfc14df91811d']['default'];
                }
                $update[$column] = json_encode($doc, JSON_UNESCAPED_UNICODE);
            }
            if ($update) {
                DB::table('managed_pages')->where('id', $page->id)->update($update);
            }
        }
    }

    public function down(): void {}
};
