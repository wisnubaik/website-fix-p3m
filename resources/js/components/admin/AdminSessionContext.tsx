"use client";

import { createContext, useContext } from "react";
import type { AdminRole, SetupStep } from "@/lib/admin-access";

export type ClientAdminSession = {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    setup: SetupStep;
};

const Ctx = createContext<ClientAdminSession | null>(null);

export function AdminSessionProvider({ value, children }: { value: ClientAdminSession; children: React.ReactNode }) {
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Data akun yang sedang login. Hanya untuk tampilan: penjaga sebenarnya ada di API. */
export function useAdminSession(): ClientAdminSession {
    const v = useContext(Ctx);
    if (!v) throw new Error("useAdminSession harus dipakai di dalam layout admin");
    return v;
}

/** Versi aman (null kalau di luar layout admin). */
export function useOptionalAdminSession(): ClientAdminSession | null {
    return useContext(Ctx);
}
