import { useCallback, useEffect, useRef, useState } from 'react';
import { cmsFetch, cmsGeneration } from '@/lib/cms-fetch';
import { trackAdminActivity } from '@/lib/admin-activity';
import { useAdminSession } from './AdminSessionContext';

type SessionStatus = { adminId: string; role: string; setup: boolean; secondsRemaining: number; absoluteSecondsRemaining: number; generation: string };
const button = 'border border-[var(--color-outline-gray)] px-4 py-2 text-sm font-semibold disabled:opacity-50';

function guardedUrl(input: RequestInfo | URL): boolean {
    try {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
        return url.origin === window.location.origin && url.pathname.startsWith('/api/admin/') && url.pathname !== '/api/admin/logout';
    } catch { return false; }
}

export default function SessionGuard() {
    const me = useAdminSession();
    const [ended, setEnded] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [absolute, setAbsolute] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const deadline = useRef(0);
    const stopped = useRef(false);
    const checking = useRef(false);
    const originalFetch = useRef<typeof fetch | null>(null);
    const firstButton = useRef<HTMLAnchorElement>(null);

    const accept = useCallback((data: SessionStatus): boolean => {
        if (data.adminId !== me.id || data.role !== me.role || data.setup !== (me.setup === 'password') || data.generation !== cmsGeneration()) {
            stopped.current = true;
            setEnded(true);
            setMessage('Akun, hak akses, atau versi konten berubah. Salin catatan penting sebelum memuat ulang halaman. Isian lama tidak akan dikirim otomatis.');
            return false;
        }
        deadline.current = Date.now() + data.secondsRemaining * 1000;
        setRemaining(data.secondsRemaining);
        setAbsolute(data.absoluteSecondsRemaining <= 120);
        return true;
    }, [me.id, me.role, me.setup]);

    const check = useCallback(async (resume = false) => {
        if (checking.current) return;
        checking.current = true;
        try {
            const res = await (originalFetch.current ?? fetch)('/api/admin/account/session', { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' });
            if ([401, 419].includes(res.status)) {
                stopped.current = true;
                setEnded(true);
                setMessage('Sesi berakhir atau dicabut. Isian yang belum tersimpan tetap berada di tab ini.');
                return;
            }
            if (!res.ok) { setMessage('Status sesi belum dapat diperiksa. Periksa koneksi lalu coba kembali.'); return; }
            if (accept(await res.json()) && resume) {
                stopped.current = false;
                setEnded(false);
                setMessage('');
            }
        } catch { setMessage('Koneksi terputus. Jangan tutup tab yang berisi pekerjaan Anda.'); }
        finally { checking.current = false; }
    }, [accept]);

    useEffect(() => {
        const original = window.fetch;
        originalFetch.current = original.bind(window);
        const expire = () => {
            stopped.current = true;
            setEnded(true);
            setMessage('Sesi berakhir atau dicabut. Isian yang belum tersimpan tetap berada di tab ini.');
        };
        const guarded: typeof fetch = async (input, init) => {
            if (!guardedUrl(input)) return original.call(window, input, init);
            const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
            const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
            if (mutation && stopped.current) {
                return Response.json({ error: 'Masuk kembali sebelum menyimpan.', code: 'UNAUTHORIZED' }, { status: 401 });
            }
            const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
            headers.set('X-CMS-Actor', me.id);
            let res: Response;
            try { res = await original.call(window, input, { ...init, headers }); }
            catch (error) {
                if ((error as Error).name === 'AbortError') throw error;
                return Response.json({ error: 'Jaringan gagal. Isian belum dikirim. Silakan coba lagi.' }, { status: 503 });
            }
            if ([401, 419].includes(res.status)) expire();
            if (res.status === 409) {
                const data = await res.clone().json().catch(() => ({}));
                if (data.code === 'ACCOUNT_CHANGED') expire();
            }
            return res;
        };
        window.fetch = guarded;
        window.addEventListener('admin-session-expired', expire);
        const focus = () => { void check(); };
        window.addEventListener('focus', focus);
        void check();
        const polling = window.setInterval(() => { if (!document.hidden && !stopped.current) void check(); }, 30000);
        const clock = window.setInterval(() => {
            if (!deadline.current || stopped.current) return;
            const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
            setRemaining(seconds);
            // Recheck the server: another tab may have extended the same session.
            if (seconds === 0) void check();
        }, 1000);
        return () => {
            clearInterval(polling); clearInterval(clock);
            window.removeEventListener('focus', focus);
            window.removeEventListener('admin-session-expired', expire);
            if (window.fetch === guarded) window.fetch = original;
        };
    }, [check, me.id]);

    useEffect(() => trackAdminActivity(document,
        () => !document.hidden && !stopped.current && deadline.current > Date.now(),
        async () => {
            const res = await cmsFetch('/api/admin/account/session/extend', { method: 'POST' });
            // Never unlock an expired or changed account through background activity.
            if (res.ok && !stopped.current) accept(await res.json());
        },
    ), [accept]);

    useEffect(() => {
        if (!ended) return;
        firstButton.current?.focus();
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [ended]);

    async function extend() {
        setBusy(true);
        try {
            const res = await cmsFetch('/api/admin/account/session/extend', { method: 'POST' });
            if (res.ok) { accept(await res.json()); setMessage(''); }
            else if (![401, 419].includes(res.status)) setMessage('Sesi belum diperpanjang. Coba lagi setelah beberapa saat.');
        } catch { setMessage('Koneksi terputus. Sesi belum diperpanjang.'); }
        finally { setBusy(false); }
    }

    if (ended) return <div className="fixed inset-0 z-[150] grid place-items-center bg-black/70 p-5">
        <section role="alertdialog" aria-modal="true" aria-labelledby="session-ended-title" onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }} className="w-full max-w-[540px] border-t-4 border-[var(--color-cosmic-candy)] bg-white p-6 shadow-xl">
            <h2 id="session-ended-title" className="font-display text-lg font-bold mb-3">Masuk kembali untuk melanjutkan</h2>
            <p className="text-sm mb-3">{message}</p>
            <p className="text-sm mb-4">Buka login di tab baru dengan akun <strong>{me.email}</strong>. Setelah berhasil, kembali ke tab ini dan periksa sesi. Jangan muat ulang atau tutup tab ini sebelum pekerjaan tersimpan. Data formulir tidak dikirim otomatis.</p>
            <div className="flex flex-wrap gap-3">
                <a ref={firstButton} href="/admin/login" target="_blank" rel="noopener noreferrer" className={button}>Buka login di tab baru</a>
                <button className={button} disabled={busy} onClick={async () => { setBusy(true); await check(true); setBusy(false); }}>Periksa login kembali</button>
            </div>
        </section>
    </div>;

    if (remaining !== null && remaining <= 120) return <aside role="status" className="fixed bottom-4 right-4 z-[140] max-w-[440px] border-l-4 border-[var(--color-cosmic-candy)] bg-white p-5 shadow-lg text-sm">
        <p className="font-semibold">Sesi akan berakhir dalam {remaining} detik.</p>
        <p className="my-2">{absolute ? 'Sesi mendekati batas 8 jam sejak login. Simpan pekerjaan, lalu masuk kembali. Aktivitas tidak memperpanjang batas ini.' : 'Sesi berakhir setelah sekitar 30 menit tanpa aktivitas. Mengetik, mengeklik, menggulir, atau menggeser bagan dihitung sebagai aktivitas. Anda juga dapat memilih Lanjutkan sesi.'}</p>
        {message && <p className="my-2">{message}</p>}
        {!absolute && <button className={button} disabled={busy} onClick={extend}>{busy ? 'Memeriksa...' : 'Lanjutkan sesi'}</button>}
    </aside>;
    return null;
}
