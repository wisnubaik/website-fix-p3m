import { CmsInput } from '@/components/admin/CmsInput';
import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useToast } from "@/components/admin/Toast";
import ActionDialog from "@/components/admin/ActionDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { isActivatedSuperadmin, ROLE_LABEL, superadminNextSteps, TEMP_PASSWORD_TTL_HOURS, type AdminRole } from "@/lib/admin-access";

type Account = {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    isActive: boolean;
    mustChangePassword: boolean;
    tempPasswordExpiresAt: string | null;
    lastLoginAt: string | null;
    isSelf: boolean;
    googleConnected: boolean;
};

type Pending =
    | { kind: "role"; account: Account; role: AdminRole }
    | { kind: "deactivate"; account: Account }
    | { kind: "delete"; account: Account }
    | { kind: "activate"; account: Account }
    | { kind: "resetPassword"; account: Account }
    | { kind: "recoverAccount"; account: Account }
    | { kind: "createSuperadmin"; form: FormState }
    | { kind: "profileConfirm"; account: Account; form: FormState };

type FormState = { name: string; email: string; role: AdminRole };

const input =
    "w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]";
const primary =
    "bg-[var(--color-absolute-zero)] text-white text-sm font-semibold px-4 py-2 hover:bg-black transition-colors disabled:opacity-50";
const link = "text-[13px] font-medium hover:underline disabled:opacity-40";

const LAST_SUPERADMIN_INTRO =
    "Satu-satunya superadmin yang bisa dipakai masuk (aktif dan sudah ganti password), jadi tidak bisa dinonaktifkan atau dihapus. Langkah selanjutnya:";

function formatDate(value: string | null) {
    if (!value) return "belum pernah";
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function call(url: string, method: string, body?: unknown) {
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

export default function KelolaAkunPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const [accounts, setAccounts] = useState<Account[] | null>(null);
    const [form, setForm] = useState<{ mode: "create" | "edit"; account?: Account; value: FormState } | null>(null);
    const [pending, setPending] = useState<Pending | null>(null);
    const [busy, setBusy] = useState(false);
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState<{ email: string; password: string; reason: string; validHours: number } | null>(null);

    const load = useCallback(async () => {
        const { ok, data } = await call("/api/admin/accounts", "GET");
        if (ok) setAccounts(data);
        else showToast(data.error ?? "Gagal memuat akun.", "error");
    }, [showToast]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- ambil daftar akun saat halaman dibuka
        load();
    }, [load]);

    function openPending(p: Pending) {
        setDialogError(null);
        setPending(p);
    }

    async function run(url: string, method: string, body: unknown, success: string, opts?: { leaving?: boolean }) {
        setBusy(true);
        setDialogError(null);
        const { ok, data } = await call(url, method, body);
        setBusy(false);
        if (!ok) {
            setDialogError(data.error ?? "Gagal.");
            // Dialog "Aktifkan kembali" tidak punya tempat pesan error.
            if (pending?.kind === "activate") {
                showToast(data.error ?? "Gagal.", "error");
                setPending(null);
            }
            // Ditolak karena aturan "minimal satu superadmin aktif" (mis. daftar di layar sudah basi):
            // muat ulang daftar supaya tampilan sesuai kondisi sebenarnya.
            if (data.code === "LAST_SUPERADMIN") await load();
            return null;
        }
        setPending(null);
        // Akun yang baru saja menonaktifkan/menghapus dirinya sendiri sudah tidak punya sesi.
        if (opts?.leaving) {
            router.push("/admin/login");
            router.refresh();
            return data;
        }
        showToast(success);
        await load();
        return data;
    }

    async function submitForm(e: React.FormEvent) {
        e.preventDefault();
        if (!form) return;
        const value = { ...form.value, email: form.value.email.trim().toLowerCase(), name: form.value.name.trim() };
        if (form.mode === "create") {
            if (value.role === "SUPERADMIN") return openPending({ kind: "createSuperadmin", form: value });
            setBusy(true);
            const { ok, data } = await call("/api/admin/accounts", "POST", value);
            setBusy(false);
            if (!ok) return showToast(data.error ?? "Gagal membuat akun.", "error");
            setForm(null);
            setTempPassword({ email: value.email, password: data.temporaryPassword, reason: "Akun baru dibuat.", validHours: data.temporaryPasswordValidHours });
            return load();
        }
        const account = form.account!;
        const changesOtherSuperadminEmail = !account.isSelf && account.role === "SUPERADMIN" && value.email !== account.email;
        // Tingkat 3: akun sendiri, atau email login superadmin lain diubah.
        if (account.isSelf || changesOtherSuperadminEmail) {
            return openPending({ kind: "profileConfirm", account, form: value });
        }
        setBusy(true);
        const { ok, data } = await call(`/api/admin/accounts/${account.id}`, "PATCH", { action: "updateProfile", ...value });
        setBusy(false);
        if (!ok) return showToast(data.error ?? "Gagal menyimpan.", "error");
        setForm(null);
        showToast("Data akun diperbarui.");
        load();
    }

    async function confirmPending(confirm: { confirmEmail: string; password: string }) {
        if (!pending) return;
        switch (pending.kind) {
            case "createSuperadmin": {
                const data = await run("/api/admin/accounts", "POST", { ...pending.form, ...confirm }, "Akun superadmin dibuat.");
                if (data) {
                    setForm(null);
                    setTempPassword({ email: pending.form.email, password: data.temporaryPassword, reason: "Akun superadmin baru dibuat.", validHours: data.temporaryPasswordValidHours });
                }
                return;
            }
            case "profileConfirm": {
                const self = pending.account.isSelf;
                const data = await run(`/api/admin/accounts/${pending.account.id}`, "PATCH", { action: "updateProfile", ...pending.form, ...confirm }, self ? "Data akun Anda diperbarui." : "Data akun diperbarui.");
                if (data) {
                    setForm(null);
                    // Nama/email di sidebar berasal dari server: muat ulang supaya ikut berubah.
                    if (self) window.location.reload();
                }
                return;
            }
            case "role":
                await run(`/api/admin/accounts/${pending.account.id}`, "PATCH", { action: "setRole", role: pending.role, ...confirm }, `Role ${pending.account.email} diubah.`);
                return;
            case "deactivate":
                await run(`/api/admin/accounts/${pending.account.id}`, "PATCH", { action: "deactivate", ...confirm }, `${pending.account.email} dinonaktifkan.`, { leaving: pending.account.isSelf });
                return;
            case "delete":
                await run(`/api/admin/accounts/${pending.account.id}`, "DELETE", confirm, `${pending.account.email} dihapus.`, { leaving: pending.account.isSelf });
                return;
            case "recoverAccount":
            case "resetPassword": {
                const data = await run(`/api/admin/accounts/${pending.account.id}`, "PATCH", { action: pending.kind, ...confirm }, "Password direset.");
                if (data) setTempPassword({ email: pending.account.email, password: data.temporaryPassword, reason: "Password direset.", validHours: data.temporaryPasswordValidHours });
                return;
            }
        }
    }

    const dialog = pending ? describe(pending) : null;
    // Dipakai untuk menjelaskan di layar kenapa aksi tertentu tidak tersedia. Penjaga sesungguhnya tetap di server.
    // Yang dihitung hanya superadmin yang usable (aktif + sudah ganti password; lihat isActivatedSuperadmin).
    const activatedSuperadmins = accounts?.filter(isActivatedSuperadmin).length ?? 0;

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                <div>
                    <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">Kelola Akun</h1>
                    <p className="text-sm text-[var(--color-graphite)] max-w-[640px]">
                        Nonaktifkan untuk menghentikan akses (masih bisa diaktifkan kembali). Hapus bersifat permanen,
                        tetapi riwayatnya di Activity Log tetap tersimpan. Minimal harus selalu ada satu superadmin yang
                        bisa dipakai masuk (aktif dan sudah ganti password); superadmin yang belum login belum dihitung.
                    </p>
                </div>
                <button
                    className={primary}
                    onClick={() => setForm({ mode: "create", value: { name: "", email: "", role: "ADMIN" } })}
                >
                    + Tambah akun
                </button>
            </div>

            <div className="text-[13px] text-[var(--color-graphite)] mb-6 border-l-2 border-[var(--color-outline-gray)] pl-3 max-w-[680px]">
                <b>Superadmin</b>: semua menu, termasuk Pengaturan Situs, Hero, Quick Access, Kartu Hub, Halaman Profil,
                Kelola Akun, dan hapus permanen. <b>Admin</b>: semua konten lain, Sampah, dan upload berkas.
            </div>

            {!accounts ? (
                <div className="text-sm text-[var(--color-graphite)]">Memuat...</div>
            ) : (
                <div className="overflow-x-auto bg-white border border-[var(--color-outline-gray)]">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead>
                            <tr className="text-left text-[12px] text-[var(--color-graphite)] border-b border-[var(--color-outline-gray)] bg-[var(--color-whisper-white)]">
                                <th className="px-4 py-3 font-semibold">Nama & email</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Login terakhir</th>
                                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((a) => (
                                <tr key={a.id} className={`border-b border-[var(--color-outline-gray)] last:border-0 align-top ${a.isActive ? "" : "bg-[var(--color-whisper-white)] text-[var(--color-graphite)]"}`}>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-[var(--color-absolute-zero)]">
                                            {a.name} {a.isSelf && <span className="text-[11px] text-[var(--color-graphite)]">(Anda)</span>}
                                        </div>
                                        <div className="text-[12px] text-[var(--color-graphite)] break-all">{a.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${a.role === "SUPERADMIN" ? "bg-[var(--color-cosmic-candy)] text-white" : "bg-[var(--color-whisper-white)] border border-[var(--color-outline-gray)]"}`}>
                                            {ROLE_LABEL[a.role]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[12px] leading-relaxed">
                                        <div className={a.isActive ? "text-[var(--color-teal-600)] font-semibold" : "text-[var(--color-rose-600)] font-semibold"}>
                                            {a.isActive ? "Aktif" : "Nonaktif"}
                                        </div>
                                        {a.mustChangePassword &&
                                            (a.tempPasswordExpiresAt && new Date(a.tempPasswordExpiresAt) < new Date() ? (
                                                <div className="text-[var(--color-rose-600)]">Password sementara kedaluwarsa, reset ulang</div>
                                            ) : (
                                                <div className="text-[var(--color-cosmic-candy)]">
                                                    Menunggu ganti password
                                                    {a.tempPasswordExpiresAt && ` (berlaku s.d. ${formatDate(a.tempPasswordExpiresAt)})`}
                                                </div>
                                            ))}
                                        {a.role === "SUPERADMIN" && a.isActive && !isActivatedSuperadmin(a) && (
                                            <div>Belum dihitung sebagai superadmin usable sampai ganti password selesai</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-[12px] whitespace-nowrap">{formatDate(a.lastLoginAt)}</td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            // Superadmin terakhir yang usable (aktif + sudah ganti password): nonaktifkan & hapus tidak tersedia (server juga menolak).
                                            const isLastSuperadmin = isActivatedSuperadmin(a) && activatedSuperadmins <= 1;
                                            const lastSuperadminHint = isLastSuperadmin
                                                ? `${LAST_SUPERADMIN_INTRO}\n${superadminNextSteps(accounts.filter((o) => o.role === "SUPERADMIN" && o.id !== a.id))}`
                                                : undefined;
                                            return (
                                                <>
                                                    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                                                        <button className={`${link} text-[var(--color-absolute-zero)]`} onClick={() => setForm({ mode: "edit", account: a, value: { name: a.name, email: a.email, role: a.role } })}>
                                                            Ubah data
                                                        </button>
                                                        {!a.isSelf && a.isActive && (
                                                            <>
                                                                <button
                                                                    className={`${link} text-[var(--color-absolute-zero)]`}
                                                                    onClick={() => openPending({ kind: "role", account: a, role: a.role === "SUPERADMIN" ? "ADMIN" : "SUPERADMIN" })}
                                                                >
                                                                    Jadikan {a.role === "SUPERADMIN" ? "admin" : "superadmin"}
                                                                </button>
                                                                <button
                                                                    className={`${link} text-[var(--color-absolute-zero)]`}
                                                                    onClick={() => openPending({ kind: "resetPassword", account: a })}
                                                                >
                                                                    Reset password
                                                                </button>
                                                                <button className={`${link} text-[var(--color-rose-600)]`} onClick={() => openPending({ kind: "recoverAccount", account: a })}>Pulihkan keamanan akun</button>
                                                            </>
                                                        )}
                                                        {!a.isSelf && !a.isActive && (
                                                            <button className={`${link} text-[var(--color-teal-600)]`} onClick={() => openPending({ kind: "activate", account: a })}>
                                                                Aktifkan kembali
                                                            </button>
                                                        )}
                                                        {a.isActive && (
                                                            <button
                                                                className={`${link} text-[var(--color-rose-600)]`}
                                                                disabled={isLastSuperadmin}
                                                                title={lastSuperadminHint}
                                                                onClick={() => openPending({ kind: "deactivate", account: a })}
                                                            >
                                                                Nonaktifkan
                                                            </button>
                                                        )}
                                                        <button
                                                            className={`${link} text-[var(--color-rose-600)]`}
                                                            disabled={isLastSuperadmin}
                                                            title={lastSuperadminHint}
                                                            onClick={() => openPending({ kind: "delete", account: a })}
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                    {lastSuperadminHint && (
                                                        <p className="mt-1.5 ml-auto max-w-[380px] text-left whitespace-pre-line text-[12px] leading-snug text-[var(--color-graphite)]">
                                                            {lastSuperadminHint}
                                                        </p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {form && (
                <div className="fixed inset-0 bg-black/40 grid place-items-center z-[100] p-5" onClick={() => !busy && setForm(null)}>
                    <form onSubmit={submitForm} onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-[440px] p-6 flex flex-col gap-4">
                        <h2 className="font-display font-bold text-lg text-[var(--color-absolute-zero)]">
                            {form.mode === "create" ? "Tambah akun" : "Ubah data akun"}
                        </h2>
                        <div>
                            <label htmlFor="acc-name" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Nama tampilan</label>
                            <CmsInput policy="person" id="acc-name" className={input} value={form.value.name} maxLength={80} required onChange={(e) => setForm({ ...form, value: { ...form.value, name: e.target.value } })} />
                        </div>
                        <div>
                            <label htmlFor="acc-email" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Email (dipakai untuk login)</label>
                            <CmsInput id="acc-email" type="email" className={input} value={form.value.email} required spellCheck={false} onChange={(e) => setForm({ ...form, value: { ...form.value, email: e.target.value } })} />
                        </div>
                        {form.mode === "create" && (
                            <div>
                                <label htmlFor="acc-role" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Role</label>
                                <select id="acc-role" className={`${input} bg-white`} value={form.value.role} onChange={(e) => setForm({ ...form, value: { ...form.value, role: e.target.value as AdminRole } })}>
                                    <option value="ADMIN">Admin (kelola konten)</option>
                                    <option value="SUPERADMIN">Superadmin (akses penuh)</option>
                                </select>
                            </div>
                        )}
                        {form.mode === "create" ? (
                            <p className="text-[12px] text-[var(--color-graphite)]">
                                Sistem membuat password sementara yang ditampilkan sekali. Pemilik akun wajib menggantinya saat login pertama.
                            </p>
                        ) : form.account?.isSelf ? (
                            <p className="text-[12px] text-[var(--color-graphite)]">Mengubah data akun sendiri memerlukan konfirmasi password.</p>
                        ) : form.account?.role === "SUPERADMIN" ? (
                            <p className="text-[12px] text-[var(--color-graphite)]">
                                Mengubah email superadmin lain memerlukan konfirmasi email dan
                                password. Mengubah nama saja tidak perlu.
                            </p>
                        ) : null}
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setForm(null)} className="text-sm font-medium text-[var(--color-graphite)] px-4 py-2">Batal</button>
                            <button
                                type="submit"
                                disabled={busy}
                                className={primary}
                            >
                                {busy ? "Memproses..." : form.mode === "create" ? "Buat akun" : "Simpan"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {pending?.kind === "activate" ? (
                <ConfirmDialog
                    open
                    danger={false}
                    title="Aktifkan kembali akun ini?"
                    message={`${pending.account.email} bisa login lagi dengan password terakhirnya.`}
                    confirmLabel="Aktifkan"
                    onConfirm={() => run(`/api/admin/accounts/${pending.account.id}`, "PATCH", { action: "activate" }, "Akun diaktifkan kembali.")}
                    onCancel={() => setPending(null)}
                />
            ) : (
                <ActionDialog
                    open={Boolean(dialog)}
                    tier={dialog?.tier ?? 2}
                    title={dialog?.title ?? ""}
                    consequences={dialog?.consequences ?? []}
                    confirmLabel={dialog?.confirmLabel ?? ""}
                    targetEmail={dialog?.targetEmail}
                    busy={busy}
                    error={dialogError}
                    onConfirm={confirmPending}
                    onCancel={() => setPending(null)}
                />
            )}

            {tempPassword && (
                <div className="fixed inset-0 bg-black/50 grid place-items-center z-[130] p-5">
                    <div className="bg-white w-full max-w-[460px] p-6">
                        <h2 className="font-display font-bold text-lg text-[var(--color-absolute-zero)] mb-1">Password sementara</h2>
                        <p className="text-sm text-[var(--color-graphite)] mb-4">
                            {tempPassword.reason} Berikan password ini kepada pemilik akun <b className="break-all">{tempPassword.email}</b> secara langsung
                            (bukan lewat grup chat). <b>Password ini hanya ditampilkan sekali</b> dan berlaku {tempPasswordValidText(tempPassword.validHours)}.
                            Pemilik akun wajib menggantinya saat login.
                        </p>
                        <code className="block text-center text-lg font-mono bg-[var(--color-whisper-white)] border border-[var(--color-outline-gray)] px-3 py-3 mb-4 select-all">
                            {tempPassword.password}
                        </code>
                        <div className="flex gap-3 justify-end">
                            <button type="button" className="text-sm font-medium text-[var(--color-graphite)] border border-[var(--color-outline-gray)] px-4 py-2" onClick={() => navigator.clipboard?.writeText(tempPassword.password)}>
                                Salin
                            </button>
                            <button type="button" className={primary} onClick={() => setTempPassword(null)}>
                                Sudah saya catat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function tempPasswordValidText(hours: number) {
    return hours % 24 === 0 ? `${hours / 24} hari` : `${hours} jam`;
}

function describe(p: Pending): { tier: 2 | 3; title: string; consequences: string[]; confirmLabel: string; targetEmail?: string } | null {
    switch (p.kind) {
        case "createSuperadmin":
            return {
                tier: 3,
                title: "Buat akun superadmin?",
                targetEmail: p.form.email,
                confirmLabel: "Buat superadmin",
                consequences: [
                    `${p.form.email} akan mendapat akses penuh: Pengaturan Situs, Hero, Profil, Kelola Akun, dan hapus permanen.`,
                    "Superadmin bisa menonaktifkan atau menghapus akun lain, termasuk superadmin lain.",
                    "Saat login pertama, akun ini wajib mengganti password sementara.",
                    "Akun ini baru dihitung sebagai superadmin usable setelah ia mengganti password.",
                ],
            };
        case "profileConfirm":
            return {
                tier: 3,
                title: p.account.isSelf ? "Ubah data akun Anda?" : `Ubah email superadmin ${p.account.name}?`,
                targetEmail: p.account.email,
                confirmLabel: "Simpan perubahan",
                consequences: [
                    p.form.email !== p.account.email
                        ? `Email login ${p.account.isSelf ? "Anda" : "akun ini"} berubah menjadi ${p.form.email}. Login berikutnya wajib memakai email baru.`
                        : "Nama tampilan akan diperbarui.",
                ],
            };
        case "role":
            return p.role === "SUPERADMIN"
                ? {
                      tier: 3,
                      title: `Jadikan ${p.account.name} superadmin?`,
                      targetEmail: p.account.email,
                      confirmLabel: "Jadikan superadmin",
                      consequences: [
                          "Akun ini mendapat akses penuh, termasuk Kelola Akun dan hapus permanen.",
                          "Sesi login akun ini langsung berakhir.",
                          ...(p.account.mustChangePassword
                              ? ["Akun ini baru dihitung sebagai superadmin usable setelah ia mengganti password."]
                              : []),
                      ],
                  }
                : {
                      tier: 3,
                      title: `Turunkan ${p.account.name} menjadi admin?`,
                      targetEmail: p.account.email,
                      confirmLabel: "Jadikan admin",
                      consequences: [
                          "Akun ini kehilangan akses ke Pengaturan Situs, Hero, Profil, Kelola Akun, dan hapus permanen.",
                          "Sesi login akun ini langsung berakhir.",
                      ],
                  };
        case "deactivate":
            return p.account.role === "SUPERADMIN"
                ? {
                      tier: 3,
                      title: p.account.isSelf ? "Nonaktifkan akun Anda sendiri?" : `Nonaktifkan superadmin ${p.account.name}?`,
                      targetEmail: p.account.email,
                      confirmLabel: "Nonaktifkan",
                      consequences: [
                          p.account.isSelf
                              ? "Anda langsung keluar dari semua perangkat dan tidak bisa login lagi."
                              : "Akun ini langsung keluar dari semua perangkat dan tidak bisa login.",
                          p.account.isSelf
                              ? "Anda kehilangan seluruh akses pengelolaan akun dan pengaturan situs."
                              : "Akun ini kehilangan seluruh akses pengelolaan akun dan pengaturan situs.",
                          p.account.isSelf
                              ? "Hanya superadmin lain yang bisa mengaktifkan akun Anda kembali."
                              : "Datanya tetap tersimpan dan bisa diaktifkan kembali.",
                      ],
                  }
                : {
                      tier: 2,
                      title: `Nonaktifkan ${p.account.name}?`,
                      confirmLabel: "Nonaktifkan",
                      consequences: [
                          "Akun ini langsung keluar dari semua perangkat dan tidak bisa login sampai diaktifkan kembali.",
                          "Riwayat aktivitasnya di Activity Log tetap tersimpan.",
                      ],
                  };
        case "delete":
            return {
                tier: 3,
                title: p.account.isSelf ? "Hapus akun Anda sendiri?" : `Hapus akun ${p.account.name}?`,
                targetEmail: p.account.email,
                confirmLabel: "Hapus permanen",
                consequences: [
                    "Akun dihapus PERMANEN dan tidak bisa dipulihkan. Kalau hanya ingin menghentikan akses, pakai Nonaktifkan.",
                    p.account.isSelf
                        ? "Anda langsung keluar dari semua perangkat dan tidak bisa login lagi."
                        : "Akun ini langsung keluar dari semua perangkat.",
                    "Riwayat aktivitasnya di Activity Log tetap tersimpan (memakai email akun).",
                    ...(p.account.role === "SUPERADMIN" ? ["Akun ini kehilangan seluruh akses pengelolaan akun dan pengaturan situs."] : []),
                ],
            };
        case "recoverAccount":
            return {
                tier: 3 as const,
                targetEmail: p.account.email,
                title: `Pulihkan keamanan akun ${p.account.name}?`,
                confirmLabel: "Pulihkan akun",
                consequences: [
                    "Koneksi Google diputus dan semua sesi akun dicabut.",
                    "Password lama diganti password sementara. Sampaikan password baru kepada pemilik melalui jalur yang aman.",
                    "Pemilik wajib mengganti password sementara sebelum memakai CMS. Role akun tidak berubah.",
                ],
            };
        case "resetPassword":
            return {
                tier: p.account.role === "SUPERADMIN" ? 3 : 2,
                targetEmail: p.account.email,
                title: `Reset password ${p.account.name}?`,
                confirmLabel: "Reset password",
                consequences: [
                    "Password lama langsung tidak berlaku dan akun ini keluar dari semua perangkat.",
                    "Koneksi Google tetap terhubung. Jika akun diduga dibajak, gunakan Pulihkan keamanan akun.",
                    `Sistem membuat password sementara (berlaku ${tempPasswordValidText(TEMP_PASSWORD_TTL_HOURS)}) yang harus Anda sampaikan kepada pemilik akun.`,
                    "Pemilik akun wajib mengganti password saat login berikutnya.",
                ],
            };
        default:
            return null;
    }
}
