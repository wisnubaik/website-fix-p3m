import { useCallback, useEffect, useState } from 'react';
import { cmsFetch } from '@/lib/cms-fetch';
import ActionDialog from './ActionDialog';
import { useToast } from './Toast';

type DeviceSession = { id: string; current: boolean; browser: string; ip: string | null; method: string; lastActiveAt: string };
type Account = { email: string; googleConnected: boolean; googleLoginEnabled: boolean };
const button = 'border border-[var(--color-outline-gray)] px-4 py-2 text-sm font-medium disabled:opacity-50';

export function deviceLabel(agent: string): string {
    const browser = /Edg\//.test(agent) ? 'Edge' : /OPR\//.test(agent) ? 'Opera' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Browser';
    const os = /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : /Windows/.test(agent) ? 'Windows' : /Macintosh/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : 'perangkat lain';
    return `${browser} di ${os}`;
}

export default function AccountSecurity({ account }: { account: Account }) {
    const { showToast } = useToast();
    const [sessions, setSessions] = useState<DeviceSession[]>([]);
    const [loadError, setLoadError] = useState('');
    const [pending, setPending] = useState<DeviceSession | 'google' | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        try {
            const res = await cmsFetch('/api/admin/account/sessions');
            if (!res.ok) { setLoadError('Daftar sesi belum dapat dimuat.'); return; }
            setSessions((await res.json()).sessions);
            setLoadError('');
        } catch { setLoadError('Periksa koneksi lalu muat ulang daftar sesi.'); }
    }, []);
    useEffect(() => { void load(); }, [load]);
    async function confirm({ password }: { password: string }) {
        if (!pending) return;
        setBusy(true); setError('');
        try {
            const res = await cmsFetch(pending === 'google' ? '/api/admin/account/google/disconnect' : `/api/admin/account/sessions/${pending.id}`, {
                method: pending === 'google' ? 'POST' : 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: pending === 'google' ? JSON.stringify({ password }) : undefined,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.errors?.password?.[0] ?? data.error ?? 'Tindakan belum berhasil. Coba lagi.'); return; }
            if (pending === 'google' || data.current) { window.location.assign('/admin/login'); return; }
            setPending(null); showToast('Sesi perangkat telah dicabut.', 'success'); await load();
        } catch { setError('Koneksi terputus. Periksa daftar sesi sebelum mencoba lagi.'); }
        finally { setBusy(false); }
    }
    return <>
        <section className="border-t border-[var(--color-outline-gray)] py-6">
            <h2 className="font-display font-bold mb-2">Koneksi Google</h2>
            <p className="text-sm mb-3">{account.googleConnected ? `Terhubung dengan akun Google untuk ${account.email}.` : 'Belum terhubung dengan Google.'}</p>
            {!account.googleLoginEnabled && <p className="text-sm mb-3">Login Google sedang tidak tersedia pada konfigurasi server ini.</p>}
            {account.googleConnected ? <button className={button} onClick={() => { setError(''); setPending('google'); }}>Putuskan koneksi Google</button>
                : <p className="text-sm">Untuk menghubungkan, keluar dari CMS lalu pilih Masuk dengan Google menggunakan email {account.email}. Konfirmasi dengan password CMS saat diminta.</p>}
        </section>
        <section className="border-t border-[var(--color-outline-gray)] py-6">
            <div className="flex justify-between gap-3 items-center mb-3"><h2 className="font-display font-bold">Sesi perangkat</h2><button className={button} onClick={() => void load()}>Muat ulang</button></div>
            <p className="text-sm mb-3">Sesi berakhir setelah 30 menit tanpa aktivitas ke server atau maksimal 8 jam sejak login. Browser dan alamat IP membantu mengenali sesi, bukan bukti identitas perangkat. Sesi sebelum pembaruan muncul setelah perangkat tersebut mengakses CMS.</p>
            {loadError && <p role="alert" className="text-sm mb-3">{loadError}</p>}
            <ul className="divide-y divide-[var(--color-outline-gray)]">
                {sessions.map(session => <li key={session.id} className="py-4 text-sm">
                    <p className="font-semibold">{deviceLabel(session.browser)} {session.current ? '(sesi ini)' : ''}</p>
                    <p>Alamat IP: {session.ip ?? 'Tidak tersedia'}</p>
                    <p>Masuk melalui: {session.method === 'google' ? 'Google' : session.method === 'legacy' ? 'Sesi sebelum pembaruan' : 'Password CMS'}</p>
                    <p className="mb-2">Aktivitas terakhir: {new Date(session.lastActiveAt).toLocaleString('id-ID')}</p>
                    <button className={button} onClick={() => { setError(''); setPending(session); }}>{session.current ? 'Keluar dari sesi ini' : 'Cabut sesi'}</button>
                </li>)}
            </ul>
        </section>
        <ActionDialog open={pending !== null} tier={pending === 'google' ? 3 : 2} targetEmail={account.email}
            title={pending === 'google' ? 'Putuskan koneksi Google?' : 'Akhiri sesi perangkat ini?'}
            consequences={pending === 'google' ? ['Koneksi Google dihapus dan semua sesi CMS berakhir, termasuk sesi ini.', 'Masuk kembali menggunakan password CMS. Akun Google Anda tidak dihapus.'] : ['Sesi yang dipilih tidak dapat mengakses CMS lagi.', 'Pekerjaan yang belum tersimpan pada perangkat tersebut mungkin terganggu.']}
            confirmLabel={pending === 'google' ? 'Putuskan dan keluar' : 'Akhiri sesi'} busy={busy} error={error} onConfirm={confirm} onCancel={() => { if (!busy) setPending(null); }} />
    </>;
}
