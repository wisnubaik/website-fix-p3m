import PasswordInput from "@/components/admin/PasswordInput";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { type FormEvent } from "react";

const inputClass = "w-full border border-[var(--color-outline-gray)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]";
const buttonClass = "mt-2 bg-[var(--color-absolute-zero)] text-white font-semibold text-sm py-2.5 hover:bg-black transition-colors disabled:opacity-50";
const LOGIN_NOTICES: Record<string, string> = {
    "password-changed": "Password berhasil diubah. Demi keamanan, sesi Anda telah diakhiri di semua perangkat. Silakan masuk kembali dengan password baru.",
    "session-ended": "Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.",
};

export default function Login({ googleLoginEnabled = false, googlePendingEmail = null }: { googleLoginEnabled?: boolean; googlePendingEmail?: string | null }) {
    const googleError = usePage().props.errors?.google;
    const reason = new URLSearchParams(usePage().url.split("?")[1] ?? "").get("reason");
    const notice = reason ? LOGIN_NOTICES[reason] : undefined;
    const form = useForm({ email: "", password: "" });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(googlePendingEmail ? "/admin/login/google/confirm" : "/admin/login", { onFinish: () => form.reset("password") });
    }

    return (
        <main className="min-h-screen grid place-items-center bg-[var(--color-whisper-white)] px-5">
            <Head title="Login Admin"><meta name="robots" content="noindex,nofollow" /></Head>
            <form onSubmit={submit} className="w-full max-w-[380px] bg-white border border-[var(--color-outline-gray)] p-8">
                <div className="mb-6">
                    <h1 className="font-display text-xl font-bold text-[var(--color-absolute-zero)]">P3M Admin</h1>
                    <p className="text-sm text-[var(--color-graphite)] mt-1">Masuk untuk mengelola konten situs.</p>
                </div>
                {notice && <div role="status" className="mb-5 border-l-4 border-[var(--color-cosmic-candy)] bg-[var(--color-whisper-white)] p-3 text-[13px] text-[var(--color-absolute-zero)]">{notice}</div>}
                {googleError && <div role="alert" className="mb-5 text-sm text-[var(--color-rose-600)]">{googleError}</div>}
                {googlePendingEmail ? (
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="font-semibold text-sm">Hubungkan akun Google</h2>
                            <p className="mt-2 text-sm text-[var(--color-graphite)]">Google sudah memverifikasi <strong className="break-all">{googlePendingEmail}</strong>. Untuk pertama kali, masukkan password CMS milik akun ini. Setelah terhubung, login berikutnya cukup melalui Google.</p>
                        </div>
                        <div>
                            <label htmlFor="google-confirm-password" className="block text-[13px] font-medium mb-1.5">Password CMS</label>
                            <PasswordInput id="google-confirm-password" autoComplete="current-password" required value={form.data.password} onChange={(e) => form.setData("password", e.target.value)} inputClassName={inputClass} />
                            <p className="mt-1.5 text-xs text-[var(--color-graphite)]">Bukan password akun Google. Konfirmasi berlaku 10 menit.</p>
                        </div>
                        {form.errors.password && <p role="alert" className="text-sm text-[var(--color-rose-600)]">{form.errors.password}</p>}
                        <button type="submit" disabled={form.processing} className={buttonClass}>{form.processing ? "Memproses..." : "Hubungkan dan masuk"}</button>
                        <button type="button" disabled={form.processing} onClick={() => router.post("/admin/login/google/cancel")} className="text-sm underline">Batal, kembali ke login</button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {googleLoginEnabled && <>
                            <a href="/admin/login/google" className="flex items-center justify-center border border-[var(--color-outline-gray)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-graphite)] hover:bg-[var(--color-whisper-white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-absolute-zero)]">Masuk dengan Google</a>
                            <p className="text-xs text-center text-[var(--color-graphite)]">Gunakan email yang terdaftar sebagai akun CMS.</p>
                            <div className="flex items-center gap-3 text-xs text-[var(--color-graphite)]"><span className="h-px flex-1 bg-[var(--color-outline-gray)]" />atau dengan password CMS<span className="h-px flex-1 bg-[var(--color-outline-gray)]" /></div>
                        </>}
                        <div>
                            <label htmlFor="email" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1.5">Email</label>
                            <input id="email" type="email" inputMode="email" autoComplete="username" spellCheck={false} autoFocus required value={form.data.email} onChange={(e) => form.setData("email", e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1.5">Password</label>
                            <PasswordInput id="password" autoComplete="current-password" required value={form.data.password} onChange={(e) => form.setData("password", e.target.value)} inputClassName={inputClass} />
                        </div>
                        {(form.errors.email || form.errors.password) && <div role="alert" className="text-sm text-[var(--color-rose-600)]">{form.errors.email || form.errors.password}</div>}
                        <button type="submit" disabled={form.processing} className={buttonClass}>{form.processing ? "Memproses..." : "Masuk"}</button>
                        <p className="text-[12px] text-[var(--color-graphite)] text-center">Lupa password? Hubungi superadmin P3M.</p>
                    </div>
                )}
            </form>
        </main>
    );
}
