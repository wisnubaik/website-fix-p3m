<?php

namespace App\Support;

use App\Models\Admin;
use App\Models\RisetEntry;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CmsContent
{
    public const TABLES = [
        'quick-access' => 'QuickAccessLink', 'winners' => 'Winner', 'riset-entries' => 'RisetEntry',
        'hero' => 'HeroContent', 'settings' => 'SiteSettings', 'asesmen' => 'AsesmenLapangan',
        'content-list' => 'ContentListItem', 'hub-cards' => 'HubCard', 'roadmap' => 'RoadmapItem',
        'pbl' => 'PblProyek', 'staff' => 'Staff', 'trend-stats' => 'TrendStat', 'documents' => 'DocumentItem',
        'ki-karya' => 'KiKarya', 'stat-entries' => 'StatEntry', 'acara-periode' => 'AcaraPeriode', 'acara-skema' => 'AcaraSkema',
        'clusters' => 'FocusCluster', 'riset-grup' => 'RisetGrup', 'announcements' => 'Announcement',
        'monev-slot' => 'MonevSlot', 'kegiatan' => 'Kegiatan', 'tautan-pengusulan' => 'TautanPengusulan',
    ];

    public const SUPERADMIN = ['quick-access', 'hero', 'settings', 'content-list', 'hub-cards', 'roadmap', 'clusters', 'trend-stats', 'stat-entries'];

    public const PAGES = ['acara-periode', 'arsip', 'beranda', 'dokumen-informasi', 'dokumen-layanan', 'dokumen-repository', 'hero', 'hub-cards', 'kegiatan', 'ki-karya', 'monev-slot', 'pbl', 'pemenang', 'pengaturan', 'pengumuman', 'profil', 'quick-access', 'riset-entries', 'riset-grup', 'tautan-pengusulan', 'tim'];

    public static function authorize(Admin $admin, string $resource, ?string $section = null): string
    {
        abort_if($resource === 'asesmen', 404);
        abort_unless(isset(self::TABLES[$resource]), 404);
        if (in_array($resource, self::SUPERADMIN, true) ||
            ($resource === 'documents' && in_array($section, ['profil-media', 'home-media', 'home-links', 'home-prodi'], true))) {
            abort_unless($admin->role === 'SUPERADMIN', 403);
        }

        return self::TABLES[$resource];
    }

    public static function fields(string $table): array
    {
        $fields = collect(json_decode(file_get_contents(database_path('legacy-schema.json')), true, flags: JSON_THROW_ON_ERROR))
            ->firstWhere('name', $table)['fields'];
        if ($table === 'ContentListItem') {
            $fields[] = ['name' => 'label', 'type' => 'String', 'nullable' => true];
        }

        return $fields;
    }

    public static function row(string $table, object $row): array
    {
        $result = (array) $row;
        foreach (self::fields($table) as $field) {
            if ($field['type'] === 'Boolean' && isset($result[$field['name']])) {
                $result[$field['name']] = (bool) $result[$field['name']];
            }
        }

        return $result;
    }

    public static function safeUrl(string $url): bool
    {
        if (preg_match('/[\\\\\x00-\x20]/', $url)) {
            return false;
        }
        if (str_starts_with($url, '/') && ! str_starts_with($url, '//')) {
            return PublicLinks::internalExists($url);
        }
        $parts = parse_url($url);

        return $parts && in_array($parts['scheme'] ?? '', ['http', 'https'], true)
            && ! empty($parts['host']) && ! isset($parts['user']) && ! isset($parts['pass']);
    }

    public static function validate(string $resource, array $input, bool $create, array $existing = []): array
    {
        $schemas = json_decode(file_get_contents(database_path('content-schema.json')), true, flags: JSON_THROW_ON_ERROR);
        $schemas['tautan-pengusulan'] = [
            'label' => ['type' => 'String', 'nullable' => false, 'required' => true],
            'href' => ['type' => 'String', 'nullable' => false, 'required' => true],
            'order' => ['type' => 'Int', 'nullable' => false, 'required' => false],
            'published' => ['type' => 'Boolean', 'nullable' => false, 'required' => false],
        ];
        $schemas['content-list']['label'] = ['type' => 'String', 'nullable' => true, 'required' => false];
        $schema = $schemas[$resource];
        $unknown = array_diff(array_keys($input), array_keys($schema));
        if ($unknown) {
            throw ValidationException::withMessages(['body' => 'Field tidak diizinkan: '.implode(', ', $unknown)]);
        }
        $rules = [];
        foreach ($schema as $key => $field) {
            $rules[$key] = [$create && $field['required'] ? 'required' : 'sometimes', $field['nullable'] ? 'nullable' : ($field['required'] ? 'required' : 'present')];
            $rules[$key] = [...$rules[$key], ...match ($field['type']) {
                'Int' => ['integer', 'min:0', 'max:2147483647'],
                'Boolean' => ['boolean'],
                default => ['string', 'max:20000'],
            }];
            if (isset($input[$key])) {
                if (($field['type'] === 'Boolean' && ! is_bool($input[$key])) ||
                    ($field['type'] === 'Int' && ! is_int($input[$key]))) {
                    throw ValidationException::withMessages([$key => 'Tipe data tidak valid.']);
                }
                if (is_string($input[$key])) {
                    $input[$key] = trim($input[$key]);
                }
            }
        }
        $data = Validator::make($input, $rules)->validate();
        FieldRules::values($resource, $data, $schema);
        $choices = [
            'acara' => ['monev', 'semhas'], 'jurusan' => ['adbis', 'akuntansi', 'teknik'],
            'sesi' => ['penelitian', 'pkm'], 'hub' => ['penelitian', 'pkm'],
            'kind' => ['pdf', 'docx', 'xlsx', 'pptx', 'link'], 'peranNama' => ['semua', 'ketua'],
        ];
        foreach ($data as $key => $value) {
            $invalid = false;
            if (is_string($value) && $value !== '') {
                $invalid = (preg_match('/(href|url)$/i', $key) && ! self::safeUrl($value))
                    || (in_array($key, ['year', 'tahun'], true) && ! preg_match('/^(19|20)\d{2}$/', $value))
                    || (str_starts_with($key, 'tanggal') && (! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $date) || ! checkdate((int) $date[2], (int) $date[3], (int) $date[1])))
                    || (in_array($key, ['mulai', 'selesai'], true) && ! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value))
                    || ($key === 'email' && ! filter_var($value, FILTER_VALIDATE_EMAIL));
                if ($key === 'foto') {
                    $invalid = collect(explode("\n", $value))->filter()->contains(fn ($url) => ! self::safeUrl(trim($url)));
                }
                if ($key === 'details') {
                    $details = json_decode($value, true);
                    $invalid = ! is_array($details) || ! array_is_list($details) || count($details) > 30
                        || collect($details)->contains(fn ($pair) => ! is_array($pair) || ! array_is_list($pair) || count($pair) !== 2 || ! is_string($pair[0]) || ! is_string($pair[1]));
                }
            }
            if ($invalid || (isset($choices[$key]) && ! in_array($value, $choices[$key], true))) {
                throw ValidationException::withMessages([$key => 'Nilai '.$key.' tidak valid.']);
            }
        }
        $merged = [...$existing, ...$data];
        EventStructure::validate($resource, $merged, $existing);
        if ($resource === 'content-list' && isset($data['label']) && (($merged['section'] ?? '') !== 'home-agenda' || mb_strlen($data['label']) > 180)) {
            throw ValidationException::withMessages(['label' => 'Label agenda maksimal 180 karakter dan hanya digunakan untuk agenda beranda.']);
        }
        if ((! empty($merged['mulai']) && ! empty($merged['selesai']) && $merged['selesai'] <= $merged['mulai']) ||
            (! empty($merged['tanggalMulai']) && ! empty($merged['tanggalSelesai']) && $merged['tanggalSelesai'] < $merged['tanggalMulai'])) {
            throw ValidationException::withMessages(['tanggal' => 'Rentang tanggal atau jam tidak valid.']);
        }
        if ($resource === 'hero') {
            foreach (['ctaPrimaryHref', 'ctaSecondaryHref'] as $key) {
                if (isset($data[$key]) && ! PublicLinks::pageExists($data[$key])) {
                    throw ValidationException::withMessages([$key => 'Pilih halaman tujuan yang sudah diterbitkan.']);
                }
            }
            $phrase = preg_replace('/^\s+|\s+$/u', '', $merged['titleItalicWord'] ?? '');
            if ($phrase !== '') {
                $position = mb_stripos($merged['titleText'] ?? '', $phrase);
                if ($position === false) {
                    throw ValidationException::withMessages(['titleItalicWord' => 'Frasa miring tidak ditemukan pada judul utama. Salin kata atau frasa dari judul, atau kosongkan untuk menampilkan seluruh judul tanpa cetak miring.']);
                }
                $data['titleItalicWord'] = mb_substr($merged['titleText'], $position, mb_strlen($phrase));
            } elseif (array_key_exists('titleItalicWord', $data)) {
                $data['titleItalicWord'] = '';
            }
        }
        if ($resource === 'riset-entries' && ! in_array($merged['category'] ?? '', array_keys(RisetEntry::CATEGORIES), true)) {
            throw ValidationException::withMessages(['category' => 'Kategori riset tidak dikenal.']);
        }
        if ($resource === 'documents') {
            if (! in_array($merged['section'] ?? '', ['profil-media', 'home-media', 'home-links', 'home-prodi', 'repository', 'monev', 'semhas', 'ki', 'panduan', 'asesmen', 'luaran', 'laporan-keuangan', 'mitra', 'kegiatan', 'sinta', 'tkt'], true)) {
                throw ValidationException::withMessages(['section' => 'Halaman dokumen tidak dikenal.']);
            }
            $placements = [
                'monev' => ['Indikator Penilaian', 'Monev 2026', 'Monitoring dan Evaluasi', 'Dokumen skema'],
                'semhas' => ['Jadwal Tim Reviewer Seminar Hasil Penelitian Kompetitif Internal', 'Dokumen Seminar Hasil', 'Dokumen skema'],
            ];
            $section = $merged['section'] ?? '';
            $category = $merged['category'] ?? '';
            $placementChanged = $create || $category !== ($existing['category'] ?? '') || $section !== ($existing['section'] ?? '');
            if (isset($placements[$section]) && $category !== '' && $category !== null && $placementChanged && ! in_array($category, $placements[$section], true)) {
                throw ValidationException::withMessages(['category' => 'Pilih letak dokumen yang tersedia pada halaman ini.']);
            }
            if (empty($merged['href']) && ($merged['published'] ?? true)) {
                throw ValidationException::withMessages(['href' => 'Dokumen tanpa tautan harus disimpan sebagai draft.']);
            }
        }

        return $data;
    }
}
