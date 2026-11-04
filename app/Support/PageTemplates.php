<?php

namespace App\Support;

use Illuminate\Support\Str;

class PageTemplates
{
    public static function options(): array
    {
        return [
            ['id' => 'information', 'name' => 'Informasi umum', 'description' => 'Profil program, kerja sama, atau informasi kegiatan.', 'sections' => ['Tentang halaman ini', 'Informasi penting', 'Dokumen pendukung']],
            ['id' => 'service', 'name' => 'Layanan', 'description' => 'Jelaskan persyaratan, tahapan, dan cara menghubungi pengelola.', 'sections' => ['Tentang layanan', 'Persyaratan', 'Tahapan layanan', 'Dokumen layanan', 'Tanya jawab']],
            ['id' => 'documents', 'name' => 'Daftar dokumen', 'description' => 'Kumpulan panduan, formulir, dan berkas yang bisa dibuka.', 'sections' => ['Petunjuk penggunaan', 'Dokumen']],
            ['id' => 'news', 'name' => 'Artikel', 'description' => 'Berita atau tulisan dengan foto utama dan isi artikel.', 'sections' => ['Foto utama', 'Isi artikel', 'Dokumen terkait']],
        ];
    }

    public static function document(string $template, string $title): array
    {
        $types = match ($template) {
            'service' => ['text', 'text', 'text', 'links', 'faq'],
            'documents' => ['text', 'links'],
            'news' => ['image', 'text', 'links'],
            default => ['text', 'cards', 'links'],
        };
        $definition = collect(self::options())->firstWhere('id', $template);
        $blocks = [];
        foreach ($types as $index => $type) {
            $blocks[] = ['id' => (string) Str::uuid(), 'type' => $type, 'title' => $definition['sections'][$index], 'text' => '', 'url' => '', 'alt' => '', 'items' => [], 'headers' => [], 'rows' => []];
        }

        return ['title' => $title, 'description' => '', 'fields' => (object) [], 'collections' => (object) [], 'blocks' => $blocks, 'placement' => 'after'];
    }
}
