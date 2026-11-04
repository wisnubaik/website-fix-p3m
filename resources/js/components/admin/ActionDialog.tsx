import { CmsInput } from '@/components/admin/CmsInput';
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ActionDialog({
    open,
    tier,
    title,
    consequences,
    confirmLabel,
    targetEmail,
    busy = false,
    error,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    tier: 2 | 3;
    title: string;
    consequences: string[];
    confirmLabel: string;
    /** Wajib untuk tingkat 3: email yang harus diketik ulang. */
    targetEmail?: string;
    busy?: boolean;
    error?: string | null;
    onConfirm: (confirm: { confirmEmail: string; password: string }) => void;
    onCancel: () => void;
}) {
    const [confirmEmail, setConfirmEmail] = useState("");
    const [password, setPassword] = useState("");
    const firstRef = useRef<HTMLInputElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const ids = useId();

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset isian setiap dialog dibuka
        setConfirmEmail("");
        setPassword("");
        setTimeout(() => (tier === 3 ? firstRef.current : cancelRef.current)?.focus(), 50);
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && !busy) onCancel();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const emailMatches = tier !== 3 || confirmEmail.trim().toLowerCase() === (targetEmail ?? "").toLowerCase();
    const ready = tier === 2 || (emailMatches && password.length > 0);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby={`${ids}-title`}
                    className="fixed inset-0 bg-black/50 grid place-items-center z-[120] p-5"
                    onClick={() => !busy && onCancel()}
                >
                    <motion.form
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.18 }}
                        className="bg-white w-full max-w-[460px] border-t-4 border-[var(--color-rose-600)]"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (ready && !busy) onConfirm({ confirmEmail: confirmEmail.trim(), password });
                        }}
                    >
                        <div className="p-6">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-rose-600)] mb-1">
                                {tier === 3 ? "Tindakan sangat berisiko" : "Tindakan berisiko"}
                            </div>
                            <h3 id={`${ids}-title`} className="font-display font-bold text-lg text-[var(--color-absolute-zero)] mb-3">
                                {title}
                            </h3>
                            <ul className="text-sm text-[var(--color-graphite)] list-none pl-5 space-y-1.5 mb-5">
                                {consequences.map((c) => (
                                    <li key={c}>{c}</li>
                                ))}
                            </ul>

                            {tier === 3 && (
                                <div className="flex flex-col gap-3 mb-2">
                                    <div>
                                        <label htmlFor={`${ids}-email`} className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                                            Ketik ulang email akun: <b className="text-[var(--color-absolute-zero)] break-all">{targetEmail}</b>
                                        </label>
                                        <CmsInput
                                            id={`${ids}-email`}
                                            ref={firstRef}
                                            value={confirmEmail}
                                            onChange={(e) => setConfirmEmail(e.target.value)}
                                            autoComplete="off"
                                            spellCheck={false}
                                            className="w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-rose-600)]"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${ids}-pw`} className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                                            Password Anda
                                        </label>
                                        <CmsInput
                                            id={`${ids}-pw`}
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                            className="w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-rose-600)]"
                                        />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div role="alert" className="text-sm text-[var(--color-rose-600)] mt-3 whitespace-pre-line">
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end px-6 py-4 bg-[var(--color-whisper-white)] border-t border-[var(--color-outline-gray)]">
                            <button
                                type="button"
                                ref={cancelRef}
                                onClick={onCancel}
                                disabled={busy}
                                className="text-sm font-medium text-[var(--color-graphite)] px-4 py-2 hover:bg-white transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={!ready || busy}
                                className="text-white text-sm font-semibold px-4 py-2 bg-[var(--color-rose-600)] hover:bg-[#b8323f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {busy ? "Memproses..." : confirmLabel}
                            </button>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
