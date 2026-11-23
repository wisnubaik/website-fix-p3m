<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @viteReactRefresh
    @vite('resources/js/app.tsx')
    <script src="/validasi-id.js" defer></script>
    <x-inertia::head>
        <title>P3M Politeknik Negeri Madiun</title>
        <meta name="description" content="Pusat Penelitian dan Pengabdian Kepada Masyarakat Politeknik Negeri Madiun.">
    </x-inertia::head>
</head>
<body>
    <x-inertia::app />
</body>
</html>
