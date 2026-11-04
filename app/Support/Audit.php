<?php

namespace App\Support;

use App\Models\Admin;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Audit
{
    public static function record(?Admin $actor, string $action, string $resource, ?string $detail = null): void
    {
        DB::table('ActivityLog')->insert([
            'id' => (string) Str::uuid(), 'adminId' => $actor?->id,
            'username' => $actor?->email ?? 'anonymous', 'action' => $action,
            'resource' => $resource, 'detail' => $detail, 'createdAt' => now(),
        ]);
    }
}
