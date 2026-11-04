<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class EventStructure
{
    /** Upgrade old content and reset snapshots without guessing the original scheme. */
    public static function upgradeTables(array $tables): array
    {
        if (! isset($tables['AcaraPeriode']) && ! isset($tables['MonevSlot'])) {
            return $tables;
        }
        $periods = $tables['AcaraPeriode'] ?? [];
        $schemes = $tables['AcaraSkema'] ?? [];
        foreach ($periods as &$period) {
            $period['tahun'] ??= (int) substr($period['tanggalMulai'], 0, 4) ?: null;
            if (! $period['tahun'] && preg_match('/\b(19|20)\d{2}\b/', $period['judul'], $match)) {
                $period['tahun'] = (int) $match[0];
            }
            if (! $period['tahun']) {
                $dates = array_column(array_filter($tables['MonevSlot'] ?? [], fn ($slot) => $slot['acara'] === $period['acara'] && ! empty($slot['tanggal'])), 'tanggal');
                sort($dates);
                $period['tahun'] = $dates ? (int) substr($dates[0], 0, 4) : 0;
            }
            $period += ['timeline' => '[]', 'deletedAt' => null];
        }
        unset($period);
        $generated = [];
        $findPeriod = function (string $event, int $year, ?string $date, bool $visible) use (&$periods, &$generated): array {
            foreach ($periods as &$period) {
                if ($period['acara'] === $event && $period['tahun'] === $year) {
                    if (isset($generated[$period['id']])) {
                        $period['published'] = $period['published'] || $visible;
                        if ($date) {
                            $dates = array_values(array_filter([$period['tanggalMulai'], $period['tanggalSelesai'], $date]));
                            sort($dates);
                            $period['tanggalMulai'] = $dates[0];
                            $period['tanggalSelesai'] = end($dates) === $dates[0] ? null : end($dates);
                        }
                    }

                    return $period;
                }
            }
            unset($period);
            $period = ['id' => 'legacy-'.$event.'-'.$year, 'acara' => $event, 'tahun' => $year,
                'judul' => ($event === 'monev' ? 'Monev' : 'Seminar Hasil').' '.($year ?: '(tahun belum diisi)'),
                'tanggalMulai' => $date ?? '', 'tanggalSelesai' => null, 'tempat' => null, 'keterangan' => null,
                'timeline' => '[]', 'updatedAt' => '2026-10-24 00:00:00', 'deletedAt' => null, 'published' => $visible];
            $periods[] = $period;
            $generated[$period['id']] = true;

            return $period;
        };
        $findScheme = function (array $period) use (&$schemes): string {
            $id = 'legacy-scheme-'.$period['id'];
            if (! collect($schemes)->contains('id', $id)) {
                $schemes[] = ['id' => $id, 'acara' => $period['acara'], 'periodeId' => $period['id'],
                    'nama' => $period['acara'] === 'monev' && (int) $period['tahun'] === 2026 ? 'Kompetitif Internal (DIPA)' : ($period['acara'] === 'semhas' ? 'Arsip Seminar Hasil '.$period['tahun'] : 'Data lama (belum dipilah)'), 'keterangan' => $period['acara'] === 'monev' && (int) $period['tahun'] === 2026 ? null : ($period['acara'] === 'semhas' ? 'Dokumen dan informasi seminar hasil tahun '.$period['tahun'].' yang tersimpan sebelumnya. Data belum dikelompokkan menjadi Penelitian atau Pengabdian kepada Masyarakat.' : 'Data dipindahkan dari jadwal sebelumnya. Ubah nama skema setelah pengelompokannya dikonfirmasi.'),
                    'order' => 0, 'published' => true, 'deletedAt' => null,
                    'createdAt' => $period['updatedAt'], 'updatedAt' => $period['updatedAt']];
            }

            return $id;
        };
        foreach (['MonevSlot', 'DocumentItem'] as $table) {
            if (! isset($tables[$table])) {
                continue;
            }
            foreach ($tables[$table] as &$row) {
                $row += ['periodeId' => null, 'skemaId' => null];
                if ($row['skemaId']) {
                    continue;
                }
                $event = $table === 'MonevSlot' ? $row['acara'] : $row['section'];
                if (! in_array($event, ['monev', 'semhas'], true)) {
                    continue;
                }
                if ($table === 'DocumentItem' && $event === 'monev' && ($row['category'] ?? '') !== 'Monev 2026') {
                    continue;
                }
                $date = $row['tanggal'] ?? null;
                $year = (int) ($table === 'MonevSlot' ? substr($date ?? '', 0, 4) : ($row['year'] ?? 0));
                $existing = collect($periods)->firstWhere('acara', $event);
                $year = $year ?: ($existing['tahun'] ?? 0);
                $period = $findPeriod($event, $year, $date, (bool) ($row['published'] ?? false) && empty($row['deletedAt']));
                $row['periodeId'] = $period['id'];
                $row['skemaId'] = $findScheme($period);
            }
            unset($row);
        }
        $tables['AcaraPeriode'] = $periods;
        $tables['AcaraSkema'] = $schemes;

        return $tables;
    }

    private static function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }

    public static function validate(string $resource, array $row, array $existing = []): void
    {
        FieldRules::textTree($row);
        if ($resource === 'acara-periode') {
            $year = $row['tahun'] ?? 0;
            if ($year < 1900 || $year > 2099) {
                self::fail('tahun', 'Isi tahun periode dengan empat digit, misalnya 2026.');
            }
            if (DB::table('AcaraPeriode')->where('acara', $row['acara'])->where('tahun', $year)->when($existing, fn ($q) => $q->where('id', '!=', $existing['id']))->exists()) {
                self::fail('tahun', 'Periode tahun ini sudah ada. Pilih periode tersebut, atau pulihkan dari Sampah jika pernah dihapus.');
            }
            if ($existing && ($existing['acara'] !== $row['acara'] || (int) $existing['tahun'] !== $year) && DB::table('AcaraSkema')->where('periodeId', $existing['id'])->exists()) {
                self::fail('tahun', 'Periode sudah memiliki skema. Buat periode baru untuk acara atau tahun berbeda agar data lama tetap sesuai.');
            }
            foreach (['tanggalMulai', 'tanggalSelesai'] as $key) {
                if (! empty($row[$key]) && (int) substr($row[$key], 0, 4) !== $year) {
                    self::fail($key, 'Tanggal harus berada pada tahun periode yang dipilih.');
                }
            }
            $timeline = json_decode($row['timeline'] ?? '[]', true);
            if (! is_array($timeline) || ! array_is_list($timeline)) {
                self::fail('timeline', 'Timeline tidak valid. Isi melalui daftar tahapan.');
            }
            FieldRules::textTree($timeline, 'timeline');
            Validator::make(['timeline' => $timeline], [
                'timeline' => 'array|max:50', 'timeline.*' => 'array:judul,tanggalMulai,tanggalSelesai',
                'timeline.*.judul' => 'required|string|max:180', 'timeline.*.tanggalMulai' => 'required|date_format:Y-m-d',
                'timeline.*.tanggalSelesai' => 'nullable|date_format:Y-m-d',
            ])->validate();
            foreach ($timeline as $step) {
                if ((int) substr($step['tanggalMulai'], 0, 4) !== $year || (! empty($step['tanggalSelesai']) && ((int) substr($step['tanggalSelesai'], 0, 4) !== $year || $step['tanggalSelesai'] < $step['tanggalMulai']))) {
                    self::fail('timeline', 'Tanggal tahapan harus berada pada tahun periode, dan tanggal selesai tidak boleh mendahului tanggal mulai.');
                }
            }

            return;
        }
        $scopedDocument = $resource === 'documents' && (in_array($row['section'] ?? '', ['monev', 'semhas'], true));
        if (! in_array($resource, ['acara-skema', 'monev-slot'], true) && ! $scopedDocument) {
            if ($resource === 'documents' && (! empty($row['periodeId']) || ! empty($row['skemaId']))) {
                self::fail('periodeId', 'Periode dan skema hanya digunakan untuk dokumen Monev atau Semhas.');
            }

            return;
        }
        if ($scopedDocument && $row['section'] === 'monev' && empty($row['periodeId']) && empty($row['skemaId']) && in_array($row['category'] ?? '', ['', 'Indikator Penilaian', 'Monitoring dan Evaluasi'], true)) {
            return;
        }
        $event = $scopedDocument ? $row['section'] : ($row['acara'] ?? 'monev');
        $period = DB::table('AcaraPeriode')->where('id', $row['periodeId'] ?? '')->where('acara', $event)->whereNull('deletedAt')->lockForUpdate()->first();
        if (! $period) {
            self::fail('periodeId', 'Buat atau pilih periode yang masih tersedia untuk acara ini terlebih dahulu.');
        }
        if ($resource === 'acara-skema') {
            if (mb_strlen($row['nama'] ?? '') > 180) {
                self::fail('nama', 'Nama skema maksimal 180 karakter.');
            }
            if ($existing && ($existing['periodeId'] !== $row['periodeId'] || $existing['acara'] !== $event)) {
                self::fail('periodeId', 'Induk skema tidak dapat dipindahkan. Buat skema baru pada periode tujuan.');
            }
            if (DB::table('AcaraSkema')->where('periodeId', $period->id)->where('nama', $row['nama'])->when($existing, fn ($q) => $q->where('id', '!=', $existing['id']))->exists()) {
                self::fail('nama', 'Nama skema sudah ada pada periode ini, termasuk yang berada di Sampah.');
            }

            return;
        }
        $scheme = DB::table('AcaraSkema')->where('id', $row['skemaId'] ?? '')->where('periodeId', $period->id)->where('acara', $event)->whereNull('deletedAt')->lockForUpdate()->first();
        if (! $scheme) {
            self::fail('skemaId', 'Pilih skema yang berada di dalam periode tersebut.');
        }
        if ($resource === 'monev-slot' && ! $existing && empty($row['tanggal'])) {
            self::fail('tanggal', 'Isi tanggal paparan untuk menempatkan jadwal pada hari yang benar.');
        }
        $year = $scopedDocument ? ($row['year'] ?? '') : substr($row['tanggal'] ?? '', 0, 4);
        if ($year !== '' && (int) $year !== (int) $period->tahun) {
            self::fail($scopedDocument ? 'year' : 'tanggal', 'Tahun data harus sesuai dengan periode yang dipilih.');
        }
    }

    public static function guardDelete(string $resource, string $id): void
    {
        if ($resource === 'acara-periode' && DB::table('AcaraSkema')->where('periodeId', $id)->exists()) {
            self::fail('periode', 'Periode masih memiliki skema, termasuk di Sampah. Sembunyikan periode untuk menarik seluruh isinya dari publik tanpa menghapus data.');
        }
        if ($resource === 'acara-skema' && (DB::table('MonevSlot')->where('skemaId', $id)->exists() || DB::table('DocumentItem')->where('skemaId', $id)->exists())) {
            self::fail('skema', 'Skema masih memiliki jadwal atau dokumen, termasuk di Sampah. Sembunyikan skema, atau pindahkan datanya sebelum menghapus.');
        }
    }

    public static function publicData(string $event): array
    {
        $periods = DB::table('AcaraPeriode')->where('acara', $event)->whereNull('deletedAt')->where('published', true)->orderByDesc('tahun')->get();
        $schemes = DB::table('AcaraSkema')->where('acara', $event)->whereIn('periodeId', $periods->pluck('id'))->whereNull('deletedAt')->where('published', true)->orderBy('order')->orderBy('id')->get();
        $slots = DB::table('MonevSlot')->where('acara', $event)->whereIn('skemaId', $schemes->pluck('id'))->whereNull('deletedAt')->where('published', true)->orderBy('tanggal')->orderBy('order')->orderBy('id')->get();
        $documents = DB::table('DocumentItem')->where('section', $event)->whereIn('skemaId', $schemes->pluck('id'))->whereNull('deletedAt')->where('published', true)->orderBy('order')->orderBy('id')->get();
        $names = ['adbis' => 'Administrasi Bisnis', 'akuntansi' => 'Akuntansi', 'teknik' => 'Teknik'];

        return $periods->map(fn ($period) => [...(array) $period, 'timeline' => json_decode($period->timeline ?? '[]', true), 'schemes' => $schemes->where('periodeId', $period->id)->map(function ($scheme) use ($slots, $documents, $names) {
            $schedule = $slots->where('skemaId', $scheme->id)->where('periodeId', $scheme->periodeId)->groupBy('jurusan')->map(fn ($rows, $department) => [
                'id' => $department, 'jurusan' => $names[$department] ?? $department,
                'penelitian' => $rows->where('sesi', 'penelitian')->values()->all(), 'pkm' => $rows->where('sesi', 'pkm')->values()->all(),
            ])->values()->all();
            $sections = $documents->where('skemaId', $scheme->id)->where('periodeId', $scheme->periodeId)->where('category', '!=', 'Jadwal paralel')->groupBy('groupTitle')->map(fn ($rows, $title) => ['title' => $title, 'items' => $rows->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'kind' => $row->kind, 'year' => $row->year, 'href' => $row->href])->values()->all()])->values()->all();

            $parallel = $documents->where('skemaId', $scheme->id)->where('periodeId', $scheme->periodeId)->where('category', 'Jadwal paralel')->where('groupTitle', 'Teknik')->where('kind', 'pdf')->filter(fn ($row) => ! empty($row->href))->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'kind' => $row->kind, 'href' => $row->href])->values()->all();

            return [...(array) $scheme, 'parallelDocuments' => $parallel, 'schedule' => $schedule, 'sections' => $sections];
        })->values()->all()])->values()->all();
    }
}
