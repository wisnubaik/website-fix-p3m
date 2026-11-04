import { ReactNode } from "react";
import { FileText, BookOpen, Wallet, Star, Users, Award } from "lucide-react";

const ICON_MAP: Record<string, ReactNode> = {
    FileText: <FileText size={22} />,
    BookOpen: <BookOpen size={22} />,
    Wallet: <Wallet size={22} />,
    Star: <Star size={22} />,
    Users: <Users size={22} />,
    Award: <Award size={22} />,
};

/**
 * Ambil elemen ikon Lucide dari nama string (dipakai buat data dari DB), * fallback ke FileText. Sengaja BUKAN di file "use client", dipanggil
 * dari Server Component (app/(site)/page.tsx), dan fungsi biasa (bukan
 * komponen) yang diimpor dari modul "use client" tidak bisa dipanggil
 * langsung dari server.
 */
export function getQuickAccessIcon(name: string): ReactNode {
    return ICON_MAP[name] ?? ICON_MAP.FileText;
}
