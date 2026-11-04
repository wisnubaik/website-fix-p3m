import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function logout() {
        setBusy(true);
        try {
            await cmsFetch("/api/admin/logout", { method: "POST" });
        } finally {
            router.push("/admin/login");
            router.refresh();
        }
    }

    return (
        <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 bg-[var(--color-rose-600)] px-3 py-2 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
            <LogOut size={15} aria-hidden="true" />
            {busy ? "Keluar..." : "Keluar"}
        </button>
    );
}
