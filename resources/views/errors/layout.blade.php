@php
    $detail = trim($exception->getMessage());
    $defaults = ['', 'Unauthenticated.', 'This action is unauthorized.', 'CSRF token mismatch.', 'Too Many Attempts.', 'Server Error', 'Not Found', 'Forbidden', 'Unauthorized', 'Page Expired', 'Method Not Allowed', 'Service Unavailable', 'Payload Too Large', 'Too Many Requests', 'Conflict', 'Unprocessable Entity', 'Unprocessable Content'];
    if (in_array($detail, $defaults, true)) { $detail = ''; }
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>{{ $code }} · {{ $title }} — P3M PNM</title>
    <style>
        :root { color-scheme: light dark; --bg:#f4f6fa; --card:#fff; --ink:#0b2447; --muted:#4a5568; --line:#d9dfe8; --accent:#0b2447; }
        @media (prefers-color-scheme: dark) { :root { --bg:#0b1220; --card:#121b2e; --ink:#e8eefc; --muted:#a8b3cc; --line:#26334f; --accent:#5bc0ff; } }
        * { box-sizing: border-box; }
        body { margin:0; min-height:100vh; display:grid; place-items:center; padding:16px; background:var(--bg); color:var(--ink); font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
        main { width:100%; max-width:560px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:32px 28px; }
        .code { font-size:14px; font-weight:700; letter-spacing:.08em; color:var(--muted); }
        h1 { margin:6px 0 12px; font-size:26px; line-height:1.25; }
        p { margin:0 0 14px; color:var(--muted); }
        .detail { padding:10px 12px; border-left:3px solid var(--accent); background:var(--bg); color:var(--ink); }
        .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:22px; }
        a { font:inherit; font-weight:600; padding:10px 16px; border-radius:8px; border:1px solid var(--accent); cursor:pointer; text-decoration:none; }
        a.primary { background:var(--accent); color:var(--card); }
        a.secondary { background:transparent; color:var(--ink); }
    </style>
</head>
<body>
<main>
    <div class="code">KODE GALAT {{ $code }}</div>
    <h1>{{ $title }}</h1>
    <p>{{ $message }}</p>
    @if($detail !== '')<p class="detail"><strong>Keterangan:</strong> {{ $detail }}</p>@endif
    @isset($hint)<p>{{ $hint }}</p>@endisset
    <div class="actions">
        <a class="primary" href="/">Ke beranda</a>
        <a class="secondary" href="/admin">Ke halaman admin</a>
    </div>
</main>
</body>
</html>
