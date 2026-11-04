<?php

use App\Support\CmsContent;
use App\Support\CmsOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (CmsContent::TABLES as $table) {
            if (! Schema::hasTable($table) || ! CmsOrder::enabled($table)) {
                continue;
            }
            DB::transaction(function () use ($table) {
                CmsOrder::lock($table);
                $columns = Schema::getColumnListing($table);
                $fields = array_values(array_intersect(CmsOrder::scopeFields($table), $columns));
                $scopes = $fields === [] ? [[]] : DB::table($table)->whereNull('deletedAt')->select($fields)->distinct()->get()->map(fn ($row) => (array) $row)->all();
                foreach ($scopes as $scope) {
                    $query = DB::table($table)->whereNull('deletedAt');
                    foreach ($scope as $key => $value) {
                        $query->where($key, $value);
                    }
                    foreach ($query->orderBy('order')->orderBy('id')->pluck('id') as $order => $id) {
                        DB::table($table)->where('id', $id)->where('order', '!=', $order)->update(['order' => $order, ...(in_array('updatedAt', $columns, true) ? ['updatedAt' => now()] : [])]);
                    }
                }
            }, 5);
        }
    }

    public function down(): void
    {
        // Previously duplicated positions cannot be reconstructed safely.
    }
};
