/**
 * HAK AKSES PANEL ADMIN
 * =====================
 * Satu tempat untuk aturan "menu mana khusus superadmin". Dipakai sidebar
 * (menyembunyikan menu) dan layout admin (menolak halaman). Penjaga yang
 * sesungguhnya tetap di API: route khusus superadmin memanggil
 * requireSuperadmin() di lib/admin-guard.ts.
 *
 * Ringkasan kesepakatan:
 *   SUPERADMIN : semua menu + Pengaturan Situs, Hero, Quick Access, Kartu Hub,
 *                Halaman Profil, Kelola Akun, hapus permanen, log semua akun.
 *   ADMIN      : semua konten lain (termasuk Tim P3M), Sampah (pulihkan),
 *                upload berkas, log miliknya sendiri.
 */
export type AdminRole = "SUPERADMIN" | "ADMIN";

export const ROLE_LABEL: Record<AdminRole, string> = {
    SUPERADMIN: "Superadmin",
    ADMIN: "Admin",
};

/** Awalan alamat halaman admin yang hanya boleh dibuka superadmin. */
export const SUPERADMIN_ONLY_PAGES = [
    "/admin/reset-konten",
    "/admin/pengaturan",
    "/admin/hero",
    "/admin/beranda",
    "/admin/quick-access",
    "/admin/hub-cards",
    "/admin/profil",
    "/admin/kelola-akun",
    // Fitur lama yang tidak tampil di situs (dijadwalkan dihapus, Fase 2 poin 9).
    "/admin/statistik",
] as const;

export function isSuperadminOnlyPage(pathname: string): boolean {
    return SUPERADMIN_ONLY_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function canOpenPage(role: AdminRole, pathname: string): boolean {
    return role === "SUPERADMIN" || !isSuperadminOnlyPage(pathname);
}

export type SetupStep = "password" | null;

/** Masa berlaku password sementara dari Kelola Akun (akun baru / hasil reset). */
export const TEMP_PASSWORD_TTL_HOURS = 72;

export function requiredSetup(a: { role: AdminRole; mustChangePassword: boolean }): SetupStep {
    if (a.mustChangePassword) return "password";
    return null;
}

export function isActivatedSuperadmin(a: {
    role: AdminRole;
    isActive: boolean;
    mustChangePassword: boolean;
}): boolean {
    return a.role === "SUPERADMIN" && a.isActive && requiredSetup(a) === null;
}

/** Data minimal sebuah akun untuk menjelaskan kenapa ia belum dihitung sebagai superadmin aktif. */
export type SuperadminState = {
    email: string;
    role: AdminRole;
    isActive: boolean;
    mustChangePassword: boolean;
    tempPasswordExpiresAt: Date | string | null;
};

/** Berapa akun lain yang diuraikan satu per satu di pesan (sisanya diringkas). */
const MAX_LISTED_SUPERADMINS = 5;

function describeOtherSuperadmin(a: SuperadminState, now: Date): string {
    const step = requiredSetup(a);
    if (!a.isActive) {
        return step
            ? `${a.email}: akun nonaktif dan belum pernah ganti password. Aktifkan kembali, lalu minta orangnya login dan mengganti password.`
            : `${a.email}: akun nonaktif. Klik "Aktifkan kembali" pada akun ini.`;
    }
    const expired = a.tempPasswordExpiresAt != null && new Date(a.tempPasswordExpiresAt) < now;
    return expired
        ? `${a.email}: password sementara sudah kedaluwarsa. Klik "Reset password" pada akun ini, berikan password barunya langsung kepada orangnya, lalu minta ia login dan mengganti password.`
        : `${a.email}: belum mengganti password sementaranya (masih berlaku). Minta orangnya login dan mengganti password.`;
}

/**
 * Langkah yang harus dilakukan supaya ada superadmin lain yang bisa masuk.
 * `others` = semua superadmin SELAIN akun yang mau dinonaktifkan/dihapus.
 * Dipakai server (pesan penolakan) dan halaman Kelola Akun (keterangan di
 * samping tombol yang dimatikan), supaya keduanya selalu sama.
 */
export function superadminNextSteps(others: SuperadminState[], now: Date = new Date()): string {
    const supers = others.filter((o) => o.role === "SUPERADMIN");
    // Daftar di layar bisa basi (mis. superadmin lain baru saja selesai aktivasi): jangan menyesatkan.
    if (supers.some(isActivatedSuperadmin)) {
        return "Daftar akun baru saja berubah dan kini sudah ada superadmin lain yang bisa masuk. Muat ulang halaman, lalu ulangi aksi ini.";
    }
    const rows = supers;
    if (rows.length === 0) {
        return (
            'Belum ada superadmin lain. Buat dulu lewat tombol "+ Tambah akun" (pilih role Superadmin), ' +
            "berikan password sementaranya langsung kepada orangnya, lalu minta ia login dan mengganti password. " +
            "Setelah itu, ulangi aksi ini."
        );
    }
    const lines = rows.slice(0, MAX_LISTED_SUPERADMINS).map((a) => ` ${describeOtherSuperadmin(a, now)}`);
    if (rows.length > MAX_LISTED_SUPERADMINS) lines.push(` dan ${rows.length - MAX_LISTED_SUPERADMINS} superadmin lain yang juga belum bisa dipakai masuk.`);
    return (
        "Superadmin lain yang ada belum bisa dipakai masuk:\n" +
        lines.join("\n") +
        "\nSetelah salah satunya selesai aktivasi, ulangi aksi ini."
    );
}
