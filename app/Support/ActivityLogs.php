<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ActivityLogs
{
    public static function months(): int
    {
        return max(1, (int) config('activity-log.retention_months', 12));
    }

    public static function query(Request $request): Builder
    {
        $rules = ['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d', 'account' => 'nullable|string|max:254', 'action' => 'nullable|string|max:100'];
        if ($request->filled('from') && $request->filled('to')) {
            $rules['to'] .= '|after_or_equal:from';
        }
        $data = $request->validate($rules);
        $query = DB::table('ActivityLog');
        if ($request->user()->role !== 'SUPERADMIN') {
            $query->where(fn ($q) => $q->where('adminId', $request->user()->id)
                ->orWhere(fn ($q) => $q->whereNull('adminId')->where('username', $request->user()->email)));
        }
        if (! empty($data['from'])) {
            $query->where('createdAt', '>=', $data['from'].' 00:00:00');
        }
        if (! empty($data['to'])) {
            $query->where('createdAt', '<', \Carbon\Carbon::parse($data['to'])->addDay()->startOfDay());
        }
        foreach (['account' => 'username', 'action' => 'action'] as $key => $column) {
            if (! empty($data[$key])) {
                $query->where($column, $data[$key]);
            }
        }
        return $query;
    }

    public static function csvCell(mixed $value): string
    {
        $text = (string) ($value ?? '');
        return preg_match('/^[\s]*[=+@-]|^[\t\r\n]/u', $text) ? "'".$text : $text;
    }

    public static function prune(bool $dryRun = false): int
    {
        $cutoff = now()->subMonthsNoOverflow(self::months());
        $query = fn () => DB::table('ActivityLog')->where('createdAt', '<', $cutoff);
        if ($dryRun) {
            return $query()->count();
        }
        $deleted = 0;
        for ($batch = 0; $batch < 20; $batch++) {
            $ids = $query()->orderBy('createdAt')->orderBy('id')->limit(500)->pluck('id');
            if ($ids->isEmpty()) {
                break;
            }
            $deleted += $query()->whereIn('id', $ids)->delete();
        }
        if ($deleted > 0) {
            Audit::record(null, 'prune', 'activity_log', "Pembersihan terjadwal: {$deleted} catatan sebelum ".$cutoff->toDateTimeString());
        }
        return $deleted;
    }
}
