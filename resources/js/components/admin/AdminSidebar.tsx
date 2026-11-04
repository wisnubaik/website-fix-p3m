"use client";

import { Link } from "@inertiajs/react";
import { usePathname } from "@/lib/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import LogoutButton from "./LogoutButton";
import { useAdminSession } from "@/components/admin/AdminSessionContext";
import { canOpenPage, ROLE_LABEL, type AdminRole } from "@/lib/admin-access";

type NavItem = { href: string; label: string };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
    { group: "Situs", items: [
        { href: "/admin", label: "Ringkasan" },
        { href: "/admin/halaman", label: "Halaman" },
        { href: "/admin/menu", label: "Menu & navigasi" },
        { href: "/admin/reset-konten", label: "Reset & pemulihan" },
        { href: "/admin/pengaturan", label: "Identitas & kontak" },
    ]},
    { group: "Data", items: [{ href: "/admin/arsip", label: "Data Internal P3M-PNM" }] },
    { group: "Akun", items: [
        { href: "/admin/akun", label: "Akun Saya" },
        { href: "/admin/kelola-akun", label: "Kelola Akun" },
        { href: "/admin/log", label: "Activity Log" },
    ]},
];

function NavLinks({
    pathname,
    onLinkClick,
    role,
    setupOnly,
}: {
    pathname: string | null;
    onLinkClick: () => void;
    role: AdminRole;
    setupOnly: boolean;
}) {
    // Menu khusus superadmin disembunyikan untuk admin. Saat langkah wajib
    // belum selesai, hanya halaman Akun yang ditampilkan.
    const groups = NAV.map((g) => ({
        ...g,
        items: g.items.filter((s) => (setupOnly ? s.href === "/admin/akun" : (canOpenPage(role, s.href) && (s.href !== "/admin/menu" || role === "SUPERADMIN")))),
    })).filter((g) => g.items.length > 0);
    return (
        <nav className="flex flex-col gap-0.5">
            {groups.map((g) => (
                <div key={g.group} className="mb-3">
                    <div className="text-[11px] font-semibold tracking-wider text-white/40 uppercase px-3 pt-3 pb-1.5">
                        {g.group}
                    </div>
                    {g.items.map((s) => {
                        const active = s.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(s.href);
                        return (
                            <Link
                                key={s.href}
                                href={s.href}
                                onClick={onLinkClick}
                                className={`text-[13px] px-3 py-1.5 transition-colors block ${
                                    active
                                        ? "bg-white/10 text-white font-medium border-l-2 border-[var(--color-cosmic-candy)]"
                                        : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                                }`}
                            >
                                {s.label}
                            </Link>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}

function AccountBadge() {
    const me = useAdminSession();
    return (
        <div className="mb-3 pb-4 border-b border-white/10">
            <div className="text-[13px] font-medium text-white truncate" title={me.email}>
                {me.name}
            </div>
            <div className="text-[11px] text-white/50 truncate">{me.email}</div>
            <span
                className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                    me.role === "SUPERADMIN" ? "bg-[var(--color-cosmic-candy)] text-white" : "bg-white/15 text-white"
                }`}
            >
                {ROLE_LABEL[me.role]}
            </span>
        </div>
    );
}

/**
 * Isi sidebar (dipakai desktop dan overlay mobile): header akun tetap di atas,
 * daftar menu di tengah yang bisa di-scroll sendiri, dan tombol "Kembali ke situs" +
 * "Keluar" tetap di bawah (tidak ikut ter-scroll, jadi selalu terlihat).
 */
function SidebarPanel({
    pathname,
    role,
    setupOnly,
    onNavigate,
    showBrand,
}: {
    pathname: string | null;
    role: AdminRole;
    setupOnly: boolean;
    onNavigate: () => void;
    showBrand: boolean;
}) {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 px-5 pt-5">
                {showBrand && <div className="font-display font-bold text-lg mb-5">P3M Admin</div>}
                <AccountBadge />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]">
                <NavLinks pathname={pathname} onLinkClick={onNavigate} role={role} setupOnly={setupOnly} />
            </div>
            <div className="shrink-0 flex flex-col gap-2 border-t border-white/10 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <Link
                    href="/"
                    onClick={onNavigate}
                    className="flex items-center justify-center gap-2 border border-white/30 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-[var(--color-blackhole)]"
                >
                    <ArrowLeft size={15} aria-hidden="true" />
                    Kembali ke situs
                </Link>
                <LogoutButton />
            </div>
        </div>
    );
}

export default function AdminSidebar() {
    const pathname = usePathname();
    const me = useAdminSession();
    const [open, setOpen] = useState(false);
    const closeMenu = () => setOpen(false);

    // Menu mobile terbuka: kunci scroll halaman di belakangnya (supaya hanya ada satu
    // area scroll), tutup dengan Escape, dan tutup otomatis kalau layar diperlebar
    // sampai tampilan desktop.
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const desktop = window.matchMedia("(min-width: 768px)");
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        const onResize = () => {
            if (desktop.matches) setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        desktop.addEventListener("change", onResize);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKey);
            desktop.removeEventListener("change", onResize);
        };
    }, [open]);

    return (
        <>
            {/* Top bar mobile. cuma muncul di layar kecil. Tinggi tetap 60px: overlay menu
                dimulai tepat di bawahnya supaya isi menu tidak tertutup top bar. */}
            <div className="md:hidden sticky top-0 z-40 h-[60px] bg-[var(--color-blackhole)] text-white px-4 flex items-center justify-between">
                <span className="font-display font-bold">P3M Admin</span>
                <button
                    onClick={() => setOpen(!open)}
                    aria-label={open ? "Tutup menu" : "Buka menu"}
                    aria-expanded={open}
                    aria-controls="admin-mobile-menu"
                    className="w-9 h-9 grid place-items-center border border-white/20"
                >
                    {open ? "✕" : "☰"}
                </button>
            </div>

            {/* Sidebar desktop. Tinggi = tinggi layar, menu yang panjang scroll di dalamnya. */}
            <aside className="hidden md:block w-60 shrink-0 self-start sticky top-0 h-dvh bg-[var(--color-blackhole)] text-white">
                <SidebarPanel
                    pathname={pathname}
                    role={me.role}
                    setupOnly={Boolean(me.setup)}
                    onNavigate={closeMenu}
                    showBrand
                />
            </aside>

            {/* Sidebar mobile. overlay di bawah top bar, cuma muncul kalau di-toggle */}
            {open && (
                <div
                    id="admin-mobile-menu"
                    className="md:hidden fixed inset-x-0 top-[60px] z-30 h-[calc(100dvh-60px)] bg-[var(--color-blackhole)] text-white"
                >
                    <SidebarPanel
                        pathname={pathname}
                        role={me.role}
                        setupOnly={Boolean(me.setup)}
                        onNavigate={closeMenu}
                        showBrand={false}
                    />
                </div>
            )}
        </>
    );
}
