<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('p3m:prune-activity-log {--dry-run : Hanya hitung, tanpa menghapus}', function () {
    $count = \App\Support\ActivityLogs::prune((bool) $this->option('dry-run'));
    $this->info($this->option('dry-run') ? "{$count} catatan melewati masa simpan. Belum dihapus." : "{$count} catatan lama dihapus.");
})->purpose('Membersihkan riwayat aktivitas yang melewati masa simpan');

Schedule::command('p3m:prune-activity-log')->dailyAt('02:00')->timezone('Asia/Jakarta')->withoutOverlapping();
