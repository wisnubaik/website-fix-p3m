<?php

namespace App\Http\Controllers;

use App\Models\RisetEntry;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ResearchController extends Controller
{
    public function home(): Response
    {
        $published = static function (string $table) {
            return DB::table($table)
                ->whereNull('deletedAt')
                ->where('published', true)
                ->orderBy('order')
                ->orderBy('id');
        };

        $recap = static function (string $group) use ($published) {
            return $published('StatEntry')->where('group', $group)->get(['label', 'value']);
        };

        $winnerGroups = $published('Winner')->get(['category', 'name', 'skema', 'tag'])
            ->groupBy('category')
            ->map(fn ($rows) => $rows->values()->all())
            ->all();

        return Inertia::render('Home', [
            'hero' => DB::table('HeroContent')->where('id', 'hero')->first(),
            'quickAccess' => $published('QuickAccessLink')->get(['href', 'title', 'meta', 'accent', 'iconName']),
            'marqueeItems' => $published('ContentListItem')->where('section', 'marquee')->pluck('text')->values(),
            'winnersGrouped' => $winnerGroups,
            'tautanPengusulan' => $published('TautanPengusulan')->get(['label', 'href']),
            'rekapBatch1Penelitian' => $recap('rekap-batch-1-penelitian'),
            'rekapBatch1Pkm' => $recap('rekap-batch-1-pkm'),
            'rekapBatch2Penelitian' => $recap('rekap-batch-2-penelitian'),
            'rekapBatch2Pkm' => $recap('rekap-batch-2-pkm'),
            'diterimaBatch2' => $recap('diterima-batch-2'),
            'pendanaan' => $recap('pendanaan-resmi-2026'),
            'agenda' => $published('ContentListItem')->where('section', 'home-agenda')->get(['id', 'text', 'label']),
            'prodi' => $published('DocumentItem')->where('section', 'home-prodi')->get(['id', 'name', 'href', 'groupTitle']),
        ]);
    }

    public function hub(string $hub): Response
    {
        abort_unless(in_array($hub, ['penelitian', 'pkm'], true), 404);

        $accent = [
            'navy' => ['accent' => 'var(--color-navy-700)', 'bg' => 'var(--color-navy-100)'],
            'gold' => ['accent' => 'var(--color-gold-600)', 'bg' => 'var(--color-gold-100)'],
            'teal' => ['accent' => 'var(--color-teal-600)', 'bg' => 'var(--color-teal-100)'],
            'violet' => ['accent' => 'var(--color-violet-600)', 'bg' => 'var(--color-violet-100)'],
            'rose' => ['accent' => 'var(--color-rose-600)', 'bg' => 'var(--color-rose-100)'],
        ];
        $cards = DB::table('HubCard')
            ->where('hub', $hub)
            ->whereNull('deletedAt')
            ->where('published', true)
            ->orderBy('order')
            ->get()
            ->values()
            ->map(function ($card, int $index) use ($accent) {
                $colors = $accent[['navy', 'gold', 'teal', 'violet'][$index % 4]];

                return [
                    'index' => str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                    'title' => $card->title,
                    'desc' => $card->desc,
                    'href' => $card->href,
                    ...$colors,
                ];
            });

        return Inertia::render('Research/Hub', [
            'hub' => $hub,
            'cards' => $cards,
        ]);
    }

    public function show(string $hub, string $scheme): Response
    {
        $category = $hub.'-'.$scheme;
        abort_unless(array_key_exists($category, RisetEntry::CATEGORIES), 404);

        $copy = [
            'penelitian-internal' => ['heroTitle' => 'Skema penelitian kompetitif dari DIPA internal.', 'lead' => 'Skema penelitian yang didanai dari DIPA Politeknik Negeri Madiun untuk dosen seluruh program studi.', 'trendTitle' => 'Tren Penelitian Internal', 'trendSubtitle' => 'Jumlah judul penelitian kompetitif internal per tahun', 'unit' => 'judul penelitian', 'note' => 'Judul, tim peneliti, dan nominal pendanaan penelitian kompetitif internal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu.'],
            'penelitian-eksternal' => ['heroTitle' => 'Didanai eksternal dari BIMA dan mitra industri.', 'lead' => 'Pendanaan penelitian dari BIMA Kemdiktisaintek dan mitra eksternal lainnya.', 'trendTitle' => 'Tren Penelitian Eksternal', 'trendSubtitle' => 'Jumlah judul penelitian berpendanaan eksternal per tahun', 'unit' => 'judul penelitian', 'note' => 'Judul, tim peneliti, dan nominal pendanaan penelitian dari sumber eksternal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu.'],
            'penelitian-unggulan' => ['heroTitle' => 'Skema unggulan penelitian program studi.', 'lead' => 'Skema unggulan dengan target output strategis dan kontribusi ke program studi.', 'trendTitle' => 'Tren Penelitian Unggulan', 'trendSubtitle' => 'Jumlah judul penelitian unggulan per tahun', 'unit' => 'judul penelitian', 'note' => 'Judul, tim peneliti, dan nominal pendanaan skema penelitian unggulan. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu.'],
            'pkm-internal' => ['heroTitle' => 'PkM dari DIPA internal Politeknik.', 'lead' => 'Skema pengabdian masyarakat yang didanai dari DIPA Politeknik Negeri Madiun.', 'trendTitle' => 'Tren PkM Internal', 'trendSubtitle' => 'Jumlah judul pengabdian kompetitif internal per tahun', 'unit' => 'judul pengabdian', 'note' => 'Judul, tim pelaksana, dan nominal pendanaan pengabdian kompetitif internal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu.'],
            'pkm-eksternal' => ['heroTitle' => 'Pendanaan PkM di luar kampus.', 'lead' => 'Pendanaan pengabdian masyarakat dari BIMA dan mitra eksternal lainnya.', 'trendTitle' => 'Tren PkM Eksternal', 'trendSubtitle' => 'Jumlah judul pengabdian berpendanaan eksternal per tahun', 'unit' => 'judul pengabdian', 'note' => 'Judul, tim pelaksana, dan nominal pendanaan pengabdian dari sumber eksternal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu.'],
            'pkm-unggulan' => ['heroTitle' => 'Skema unggulan pengabdian berdampak.', 'lead' => 'Skema unggulan untuk pengabdian berdampak strategis.', 'trendTitle' => 'Tren PkM Unggulan', 'trendSubtitle' => 'Jumlah judul pengabdian unggulan per tahun', 'unit' => 'judul pengabdian', 'note' => 'Judul, tim pelaksana, dan nominal pendanaan skema pengabdian unggulan. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu.'],
        ][$category];

        return Inertia::render('Research/Show', [
            'category' => $category,
            'label' => RisetEntry::CATEGORIES[$category],
            ...$copy,
            'entries' => RisetEntry::published()->where('category', $category)->orderByDesc('year')->orderBy('order')->orderBy('id')
                ->get(['year', 'title', 'leader', 'member1', 'member2', 'funding'])
                ->map(fn ($row) => [...$row->toArray(), 'member1' => $row->member1 ?? '', 'member2' => $row->member2 ?? '']),
        ]);
    }
}
