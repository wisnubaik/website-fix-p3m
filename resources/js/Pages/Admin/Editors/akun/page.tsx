import AccountSecurity from '@/components/admin/AccountSecurity';
import PasswordInput from '@/components/admin/PasswordInput';
import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useToast } from "@/components/admin/Toast";
import ActionDialog from "@/components/admin/ActionDialog";
import { ROLE_LABEL, type AdminRole, type SetupStep } from "@/lib/admin-access";

type Account = {
    email: string;
    name: string;
    role: AdminRole;
    setup: SetupStep;
    lastLoginAt: string | null;
    passwordChangedAt: string | null;
    passwordRules: string;
    passwordMinLength: number;
    googleConnected: boolean;
    googleLoginEnabled: boolean;
};

const input =
    "w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]";
const primary =
    "bg-[var(--color-absolute-zero)] text-white text-sm font-semibold px-4 py-2 hover:bg-black transition-colors disabled:opacity-50";
const secondary =
    "text-sm font-medium text-[var(--color-graphite)] border border-[var(--color-outline-gray)] px-4 py-2 hover:border-[var(--color-absolute-zero)] transition-colors disabled:opacity-50";

function formatDate(value: string | null) {
    if (!value) return "belum pernah";
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function send(url: string, method: string, body?: unknown) {
    try {
    const res = await cmsFetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
    } catch { return {ok:false,data:{error:"Jaringan gagal. Isian belum disimpan, coba lagi."}}; }
}

export default function AccountPage() {
    const router = useRouter();
    const [me, setMe] = useState<Account | null>(null);

    const load = useCallback(async () => {
        const { ok, data } = await send("/api/admin/account", "GET");
        if (ok) setMe(data);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- ambil data akun saat halaman dibuka
        load();
    }, [load]);

    if (!me) return <div className="text-sm text-[var(--color-graphite)]">Memuat...</div>;

    return (
        <div className="max-w-[600px]">
            <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">Akun Saya</h1>
            <p className="text-sm text-[var(--color-graphite)] mb-6">
                {me.name}  {me.email}  <b>{ROLE_LABEL[me.role]}</b>
                <br />
                Login terakhir: {formatDate(me.lastLoginAt)}
            </p>

            {me.setup && (
                <div role="status" className="mb-8 border-l-4 border-[var(--color-cosmic-candy)] bg-white p-4 text-sm text-[var(--color-absolute-zero)]">
                    <b>Satu langkah lagi sebelum bisa memakai panel.</b>
                    <br />
                    Akun ini memakai password sementara. Ganti dengan password milik Anda sendiri di bawah.
                </div>
            )}

            <ChangePassword
                me={me}
                onDone={() => {
                    // Server sudah mengakhiri SEMUA sesi (termasuk perangkat ini) dan menghapus
                    // cookie. Langsung ke login, tanpa memuat ulang data akun (yang akan 401).
                    router.replace("/admin/login?reason=password-changed");
                    router.refresh();
                }}
            />

            {!me.setup && <><AccountSecurity account={me} /><LogoutEverywhere /></>}
        </div>
    );
}

function ChangePassword({ me, onDone }: { me: Account; onDone: () => void }) {
    const { showToast } = useToast();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [repeat, setRepeat] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (next !== repeat) {
            showToast("Ulangan password baru tidak sama.", "error");
            return;
        }
        setBusy(true);
        const { ok, data } = await send("/api/admin/account", "PUT", { currentPassword: current, newPassword: next, newPasswordConfirmation: repeat });
        if (!ok) {
            setBusy(false);
            showToast(data.error ?? "Gagal mengganti password.", "error");
            return;
        }
        // Sukses: busy sengaja tetap true sampai halaman berpindah ke login.
        setCurrent("");
        setNext("");
        setRepeat("");
        setDone(true);
        onDone();
    }

    return (
        <section className="mb-10">
            <h2 className="font-display font-bold text-[var(--color-absolute-zero)] mb-1">Ganti Password</h2>
            <p className="text-[13px] text-[var(--color-graphite)] mb-1">{me.passwordRules}</p>
            <p className="text-[13px] text-[var(--color-graphite)] mb-3">
                Setelah password berhasil diganti, sesi di semua perangkat (termasuk ini) akan berakhir dan Anda perlu masuk kembali
                dengan password baru.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3 max-w-[400px]">
                <div>
                    <label htmlFor="pw-current" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                        {me.setup === "password" ? "Password sementara" : "Password saat ini"}
                    </label>
                    <PasswordInput id="pw-current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required inputClassName={input} />
                </div>
                <div>
                    <label htmlFor="pw-new" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                        Password baru (minimal {me.passwordMinLength} karakter)
                    </label>
                    <PasswordInput id="pw-new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={me.passwordMinLength} inputClassName={input} />
                </div>
                <div>
                    <label htmlFor="pw-repeat" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                        Ulangi password baru
                    </label>
                    <PasswordInput id="pw-repeat" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required inputClassName={input} />
                </div>
                <button type="submit" disabled={busy} className={`${primary} self-start`}>
                    {done ? "Mengalihkan ke halaman login..." : busy ? "Menyimpan..." : "Ganti password"}
                </button>
            </form>
        </section>
    );
}

function LogoutEverywhere() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    return (
        <section className="border-t border-[var(--color-outline-gray)] pt-6">
            <h2 className="font-display font-bold text-[var(--color-absolute-zero)] mb-1">Keluar dari semua perangkat</h2>
            <p className="text-[13px] text-[var(--color-graphite)] mb-3">
                Pakai kalau Anda pernah login di komputer lain (mis. komputer umum) dan lupa keluar.
            </p>
            <button onClick={() => setOpen(true)} className={secondary}>
                Keluar dari semua perangkat
            </button>
            <ActionDialog
                open={open}
                tier={2}
                title="Keluar dari semua perangkat?"
                consequences={[
                    "Semua sesi login akun ini akan berakhir, termasuk di perangkat ini.",
                    "Anda perlu login ulang dengan password CMS atau Google yang masih terhubung.",
                ]}
                confirmLabel="Keluar dari semua"
                busy={busy}
                error={error}
                onConfirm={async () => {
                    setBusy(true);
                    setError("");
                    try {
                        const res = await cmsFetch("/api/admin/account/logout-all", { method: "POST" });
                        if (!res.ok) { setError("Sesi belum berhasil dicabut. Coba kembali."); return; }
                        router.push("/admin/login");
                        router.refresh();
                    } catch { setError("Koneksi terputus. Coba kembali."); }
                    finally { setBusy(false); }
                }}
                onCancel={() => setOpen(false)}
            />
        </section>
    );
}
