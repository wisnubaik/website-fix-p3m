<?php

use App\Support\CmsOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            CmsOrder::lock('TautanPengusulan');
            $defaults = [
                ['cmukklcdj000200tu05gksr4f', 'tes', 'Link Usulan Penelitian batch 2', 'https://forms.gle/ZGNH8XtjqfEwX6S38'],
                ['cmukkm2ri000500tuuasl5ncs', 'tes2', 'Link Usulan PkM batch 2', 'https://forms.gle/asL8mudfPu96B2yU8'],
            ];
            $changed = false;
            foreach ($defaults as [$id, $oldLabel, $label, $href]) {
                $count = DB::table('TautanPengusulan')->where('id', $id)->where('label', $oldLabel)
                    ->where('href', 'https://docs.google.com/forms/u/0/')->whereNull('deletedAt')
                    ->update(['label' => $label, 'href' => $href]);
                $changed = $changed || $count > 0;
            }
            if ($changed) {
                CmsOrder::normalize('TautanPengusulan', []);
            }
            $page = DB::table('managed_pages')->where('path', '/')->lockForUpdate()->first();
            if (! $page) {
                return;
            }
            $changes = [];
            foreach (['draft', 'published'] as $column) {
                if ($page->{$column} === null) {
                    continue;
                }
                $document = json_decode($page->{$column}, true, flags: JSON_THROW_ON_ERROR);
                $before = $document;
                foreach ([
                    'f_fd095e662366d1' => ['Pengusulan proposal sedang dibuka', 'PPM Internal 2026'],
                    'f_c1d8d581292cf4' => ['Ketentuan dan jadwal lengkap ada di', ''],
                ] as $key => [$old, $new]) {
                    if (($document['fields'][$key] ?? null) === $old) {
                        $document['fields'][$key] = $new;
                    }
                }
                if ($before !== $document) {
                    $changes[$column] = json_encode($document, JSON_THROW_ON_ERROR);
                }
            }
            if ($changes) {
                DB::table('managed_pages')->where('id', $page->id)->update([...$changes, 'version' => $page->version + 1, 'updated_at' => now()]);
            }
        });
    }

    public function down(): void
    {
        // Keep corrected public links; rolling back must not restore test data or overwrite later edits.
    }
};
