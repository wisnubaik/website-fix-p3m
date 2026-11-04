<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ArchiveAssetController extends Controller
{
    public function show(string $path): BinaryFileResponse
    {
        $aliases = json_decode(file_get_contents(database_path('asset-aliases.json')), true, 512, JSON_THROW_ON_ERROR);
        $mapped = $aliases['/admin/arsip/'.$path] ?? null;
        $root = realpath($mapped ? public_path() : storage_path('app/private/archive'));
        abort_unless($root, 404);
        $file = realpath($root.DIRECTORY_SEPARATOR.ltrim($mapped ?? $path, '/'));
        abort_unless($file && str_starts_with($file, $root.DIRECTORY_SEPARATOR) && is_file($file), 404);
        $types = ['png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp', 'pdf' => 'application/pdf', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        abort_unless(isset($types[$extension]), 404);

        return response()->file($file, ['Content-Type' => $types[$extension], 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
