<?php

use App\Support\CmsOrder;
use App\Support\EventStructure;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('AcaraPeriode', function (Blueprint $table) {
            $table->dropUnique(['acara']);
            $table->integer('tahun')->default(0);
            $table->text('timeline')->nullable();
            $table->dateTime('deletedAt', 3)->nullable();
        });
        Schema::create('AcaraSkema', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('acara');
            $table->string('periodeId')->index();
            $table->string('nama', 180);
            $table->text('keterangan')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('published')->default(false);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->unique(['periodeId', 'nama']);
        });
        foreach (['MonevSlot', 'DocumentItem'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->string('periodeId')->nullable()->index();
                $table->string('skemaId')->nullable()->index();
            });
        }
        DB::transaction(function () {
            $tables = [];
            foreach (['AcaraPeriode', 'MonevSlot', 'DocumentItem'] as $name) {
                $tables[$name] = DB::table($name)->get()->map(fn ($row) => (array) $row)->all();
            }
            foreach ($tables['AcaraPeriode'] as &$row) {
                unset($row['tahun']);
            }
            unset($row);
            $upgraded = EventStructure::upgradeTables($tables);
            foreach ($upgraded['AcaraPeriode'] as $row) {
                DB::table('AcaraPeriode')->updateOrInsert(['id' => $row['id']], $row);
            }
            foreach ($upgraded['AcaraSkema'] as $row) {
                DB::table('AcaraSkema')->insert($row);
            }
            foreach (['MonevSlot', 'DocumentItem'] as $name) {
                foreach ($upgraded[$name] as $row) {
                    if ($row['skemaId']) {
                        DB::table($name)->where('id', $row['id'])->update(['periodeId' => $row['periodeId'], 'skemaId' => $row['skemaId']]);
                    }
                }
            }
            foreach (['MonevSlot', 'DocumentItem'] as $name) {
                $scopes = DB::table($name)->whereNotNull('skemaId')->select(CmsOrder::scopeFields($name))->distinct()->get();
                foreach ($scopes as $scope) {
                    CmsOrder::normalize($name, (array) $scope);
                }
            }
        });
        Schema::table('AcaraPeriode', fn (Blueprint $table) => $table->unique(['acara', 'tahun']));
    }

    public function down(): void
    {
        throw new RuntimeException('Migrasi periode tidak dibatalkan otomatis agar data tahunan dan skema tidak terhapus. Pulihkan cadangan bila memang diperlukan.');
    }
};
