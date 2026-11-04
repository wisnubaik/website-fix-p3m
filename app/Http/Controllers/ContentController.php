<?php

namespace App\Http\Controllers;

use App\Support\EventStructure;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ContentController extends Controller
{
    public function information(string $page): Response
    {
        abort_unless(in_array($page, ['kegiatan', 'laporan-keuangan', 'luaran', 'mitra', 'pengumuman', 'sinta', 'tkt'], true), 404);

        return $this->render($page, 'informasi/'.$page);
    }

    public function service(string $page): Response
    {
        abort_unless(in_array($page, ['asesmen', 'ki', 'monev', 'panduan', 'semhas'], true), 404);

        return $this->render($page, 'layanan/'.$page);
    }

    public function standalone(string $page): Response
    {
        abort_unless(in_array($page, ['profil', 'repository', 'riset-grup', 'hubungi'], true), 404);

        return $this->render($page, $page);
    }

    private function render(string $page, string $route): Response
    {
        $meta = [
            'profil' => ['title' => 'Profil P3M', 'hero' => 'Riset terapan untuk kampus dan masyarakat.', 'lead' => 'Mengenal mandat, arah pengembangan, dan tim Pusat Penelitian dan Pengabdian kepada Masyarakat Politeknik Negeri Madiun.'],
            'repository' => ['title' => 'Repository', 'hero' => 'Pustaka dokumen & karya P3M.', 'lead' => 'Aplikasi Repository P3M untuk menelusuri karya ilmiah sivitas Politeknik Negeri Madiun, beserta pustaka dokumen penelitian dan pengabdian.'],
            'riset-grup' => ['title' => 'Riset Grup', 'hero' => 'Kolaborasi yang berangkat dari fokus.', 'lead' => 'Kelompok riset dan bidang fokus yang dikembangkan bersama program studi di Politeknik Negeri Madiun.'],
            'hubungi' => ['title' => 'Hubungi Kami', 'hero' => 'Hubungi Kami!', 'lead' => 'Silahkan untuk menghubungi kontak di bawah untuk informasi seputar penelitian, pengabdian, kerjasama industri, atau layanan kekayaan intelektual.'],
            'kegiatan' => ['title' => 'Kegiatan', 'hero' => 'Jejak kegiatan P3M.', 'lead' => 'Workshop, sosialisasi, dan serah terima produk hilirisasi yang diselenggarakan P3M Politeknik Negeri Madiun, beserta dokumentasi pelaksanaannya.'],
            'laporan-keuangan' => ['title' => 'Laporan Keuangan', 'hero' => 'Pelaporan yang tertib dan terbuka.', 'lead' => 'Format, panduan, dan dokumen pendukung pelaporan keuangan kegiatan P3M.'],
            'luaran' => ['title' => 'Luaran', 'hero' => 'Rekam luaran P3M.', 'lead' => 'Formulir pendataan luaran penelitian dan pengabdian per tahun, serta daftar proyek Problem Based Learning yang dijalankan bersama mitra.'],
            'mitra' => ['title' => 'Mitra', 'hero' => 'Suara mitra P3M.', 'lead' => 'Kuesioner kepuasan mitra, dokumen kerja sama, dan format berita acara serah terima alat hasil penelitian dan pengabdian.'],
            'pengumuman' => ['title' => 'Pengumuman', 'hero' => 'Semua pengumuman P3M.', 'lead' => 'Riwayat pengumuman resmi P3M PNM, bernomor surat dan disertai dokumen pendukungnya.'],
            'sinta' => ['title' => 'SINTA', 'hero' => 'Kinerja publikasi di SINTA.', 'lead' => 'Science and Technology Index memeringkat kinerja publikasi peneliti, lembaga, dan jurnal di Indonesia berdasarkan publikasi, penelitian, pengabdian, kekayaan intelektual, buku, dan jejaring.'],
            'tkt' => ['title' => 'Tingkat Kesiapterapan Teknologi', 'hero' => 'Mengukur kesiapan inovasi.', 'lead' => 'Panduan dan acuan teknis untuk menilai tingkat kesiapterapan teknologi hasil riset.'],
            'asesmen' => ['title' => 'Asesmen', 'hero' => 'Siapkan proposal yang kuat.', 'lead' => 'Dokumen, jadwal, dan informasi asesmen proposal penelitian serta pengabdian.'],
            'ki' => ['title' => 'Kekayaan Intelektual', 'hero' => 'Karya yang terlindungi.', 'lead' => 'Pencatatan hak cipta, paten, dan kekayaan intelektual lain atas karya dosen Politeknik Negeri Madiun, beserta formulir pengajuan insentifnya.'],
            'monev' => ['title' => 'Monitoring dan Evaluasi', 'hero' => 'Pantau progres, jaga mutu.', 'lead' => 'Jadwal, indikator, dan dokumen pelaksanaan monitoring dan evaluasi kegiatan P3M.'],
            'panduan' => ['title' => 'Panduan', 'hero' => 'Panduan & acuan pelaksanaan.', 'lead' => 'Buku panduan penelitian dan pengabdian, rencana strategis P3M, panduan pelaporan keuangan dan monev, serta acuan teknis penyusunan dokumen.'],
            'semhas' => ['title' => 'Seminar Hasil', 'hero' => 'Seminar hasil penelitian dan PkM.', 'lead' => 'Forum diseminasi hasil penelitian dan pengabdian dosen yang diselenggarakan oleh P3M.'],
        ][$page] ?? ['title' => ucfirst($page), 'hero' => ucfirst($page), 'lead' => 'Informasi P3M Politeknik Negeri Madiun.'];

        $published = DB::table('DocumentItem')
            ->where('section', $page)
            ->when(in_array($page, ['monev', 'semhas'], true), fn ($query) => $query->whereNull('skemaId'))
            ->whereNull('deletedAt')
            ->where('published', true)
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        $sections = $published->groupBy('groupTitle')->map(function ($items) {
            $first = $items->first();

            return [
                'title' => $first->groupTitle,
                'mark' => $first->groupMark,
                'items' => $items->map(fn ($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'kind' => $item->kind,
                    'year' => $item->year,
                    'cat' => $item->category,
                    'href' => $item->href,
                ])->values()->all(),
            ];
        })->values()->all();

        $props = [
            'route' => $route,
            'page' => $page,
            'title' => $meta['title'],
            'heroTitle' => $meta['hero'],
            'lead' => $meta['lead'],
            'sections' => $sections,
        ];

        if ($page === 'pengumuman') {
            $props['announcements'] = DB::table('Announcement')
                ->whereNull('deletedAt')->where('published', true)->orderBy('order')->orderByDesc('tahun')
                ->get(['num', 'title', 'kind', 'badge', 'urgent', 'href', 'tahun']);
        }

        if ($page === 'kegiatan') {
            $props['activities'] = DB::table('Kegiatan')
                ->whereNull('deletedAt')->where('published', true)->orderBy('order')->orderBy('tanggalMulai')
                ->get()->map(fn ($item) => [
                    'judul' => $item->judul,
                    'tanggal' => $item->tanggalMulai
                        ? $this->dateLabel($item->tanggalMulai).($item->tanggalSelesai && $item->tanggalSelesai !== $item->tanggalMulai ? ' sampai '.$this->dateLabel($item->tanggalSelesai) : '')
                        : '',
                    'tempat' => $item->tempat ?? '',
                    'narasumber' => $item->narasumber ?? '',
                    'ringkasan' => $item->ringkasan ?? '',
                    'foto' => array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string) $item->foto)))),
                ])->values()->all();
        }

        if ($page === 'hubungi') {
            $props['contact'] = DB::table('SiteSettings')->where('id', 'settings')->first();
            $props['staff'] = DB::table('Staff')->whereNull('deletedAt')->where('published', true)->orderBy('order')
                ->get(['initial', 'role', 'name', 'details', 'photoUrl'])->map(function ($item) {
                    $item->details = json_decode($item->details, true, flags: JSON_THROW_ON_ERROR);

                    return $item;
                });
        }

        if ($page === 'profil') {
            $props['profileLists'] = DB::table('ContentListItem')->whereNull('deletedAt')->where('published', true)
                ->whereIn('section', ['profil-pengantar', 'profil-visi', 'profil-misi', 'profil-tujuan', 'profil-tupoksi', 'profil-ketua', 'profil-sekretaris'])
                ->orderBy('order')->get(['id', 'section', 'text'])->groupBy('section')->all();
            $props['focusClusters'] = DB::table('FocusCluster')->whereNull('deletedAt')->where('published', true)->orderBy('order')->get(['id', 'title', 'desc']);
            $props['media'] = DB::table('DocumentItem as document')
                ->leftJoin('ProfileTableContent as content', 'content.documentId', '=', 'document.id')
                ->where('document.section', 'profil-media')->whereNull('document.deletedAt')->where('document.published', true)
                ->orderBy('document.order')->get(['document.id', 'document.name', 'document.href', 'document.category', 'document.groupTitle', 'content.content'])
                ->map(fn ($item) => [
                    'id' => $item->id, 'name' => $item->name, 'href' => $item->href ?? '',
                    'category' => $item->category, 'groupTitle' => $item->groupTitle,
                    'profileTable' => $item->content ? ['content' => $item->content] : null,
                ]);
        }

        if ($page === 'riset-grup') {
            $props['researchGroups'] = DB::table('RisetGrup')->whereNull('deletedAt')->where('published', true)->orderBy('order')
                ->get(['id as slug', 'nama', 'ketua', 'fokus', 'deskripsi', 'roadmapHref', 'anggota']);
        }

        if (in_array($page, ['monev', 'semhas'], true)) {
            $props['eventPeriods'] = EventStructure::publicData($page);
            $props['schedule'] = [];
            $props['period'] = null;
        }

        if ($page === 'ki') {
            $props['kiData'] = DB::table('KiKarya')->whereNull('deletedAt')->where('published', true)->orderByDesc('tahun')->orderBy('order')
                ->get(['tahun', 'judul', 'ketua', 'prodi', 'jenisKi', 'bentuk', 'status'])->map(function ($item) {
                    $item->bentuk ??= 'Tidak tercatat';
                    $item->status ??= 'Tidak tercatat';

                    return $item;
                });
        }

        if ($page === 'luaran') {
            $props['pblData'] = DB::table('PblProyek')->whereNull('deletedAt')->where('published', true)->orderBy('order')
                ->get(['prodi', 'proyek', 'sumber', 'mitra', 'bidang', 'waktu', 'jumlahMahasiswa', 'mahasiswa', 'peranNama', 'jumlahProdi', 'hasil', 'belum', 'sudah'])
                ->map(fn ($item) => array_map(fn ($value) => $value ?? '', [...(array) $item, 'peranNama' => $item->peranNama ?? 'semua']));
        }

        return Inertia::render('Public/ContentPage', $props);
    }

    private function dateLabel(string $date): string
    {
        if (! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', trim($date), $parts)) {
            return $date;
        }
        $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        return (int) $parts[3].' '.($months[(int) $parts[2] - 1] ?? $parts[2]).' '.$parts[1];
    }
}
