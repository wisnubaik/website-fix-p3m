<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $rows = DB::table('DocumentItem')->where('section', 'home-prodi')->lockForUpdate()->get();
            foreach ($rows as $row) {
                $group = trim((string) $row->groupTitle);
                $level = null;
                if (preg_match('/^Program D[-– ]?(IV|III|II|I)$/iu', $group, $match)) {
                    $level = strtoupper($match[1]);
                } elseif ($group === '' || mb_strtolower($group) === 'program studi') {
                    if (preg_match('/^D[-– ]?(IV|III|II|I|[1-4])\b/iu', $row->name, $match)) {
                        $level = ['1' => 'I', '2' => 'II', '3' => 'III', '4' => 'IV'][$match[1]] ?? strtoupper($match[1]);
                    }
                }
                if ($level !== null) {
                    DB::table('DocumentItem')->where('id', $row->id)->update(['groupTitle' => 'Diploma '.$level]);
                }
            }
        });
    }

    public function down(): void
    {
        // Keep administrator-assigned levels and existing program data.
    }
};
