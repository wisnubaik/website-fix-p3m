"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Hapus",
    danger = true,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (open) confirmRef.current?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onCancel();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

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
                    aria-labelledby="confirm-dialog-title"
                    className="fixed inset-0 bg-black/40 grid place-items-center z-[110] p-5"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-white w-full max-w-[380px] p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            id="confirm-dialog-title"
                            className="font-display font-bold text-lg text-[var(--color-absolute-zero)] mb-2"
                        >
                            {title}
                        </h3>
                        <p className="text-sm text-[var(--color-graphite)] mb-5">{message}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onCancel}
                                className="text-sm font-medium text-[var(--color-graphite)] px-4 py-2 hover:bg-[var(--color-whisper-white)] transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                ref={confirmRef}
                                onClick={onConfirm}
                                className={`text-white text-sm font-semibold px-4 py-2 transition-colors ${
                                    danger
                                        ? "bg-[var(--color-rose-600)] hover:bg-[#b8323f]"
                                        : "bg-[var(--color-absolute-zero)] hover:bg-black"
                                }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
