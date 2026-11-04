"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };

type ToastContextValue = {
    showToast: (message: string, kind?: Toast["kind"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast harus dipakai di dalam <ToastProvider>");
    }
    return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const showToast = useCallback((message: string, kind: Toast["kind"] = "success") => {
        const id = ++idRef.current;
        setToasts((t) => [...t, { id, message, kind }]);
        setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                aria-live="polite"
                aria-atomic="true"
                className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-[320px]"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className={`px-4 py-3 text-sm font-medium text-white shadow-lg ${
                            t.kind === "error"
                                ? "bg-[var(--color-rose-600)]"
                                : "bg-[var(--color-absolute-zero)]"
                        }`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
