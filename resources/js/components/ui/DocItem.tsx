import { CmsText, CmsElement } from '@/components/ui/ManagedContent';
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { DocKind } from "@/lib/doc-types";

const KIND_STYLES: Record<DocKind, string> = {
    pdf: "bg-[var(--color-rose-600)] text-white",
    docx: "bg-[var(--color-cosmic-candy)] text-white",
    xlsx: "bg-[var(--color-teal-600)] text-white",
    pptx: "bg-[var(--color-gold-600)] text-white",
    link: "bg-[var(--color-absolute-zero)] text-white",
};

export default function DocItemCard({
    name,
    kind,
    year,
    href,
    hidden,
}: {
    name: string;
    kind: DocKind;
    year?: string;
    href?: string;
    hidden?: boolean;
}) {
    if (hidden) return null;

    // Jangan pernah diam-diam anggap "#" sebagai link sungguhan. kalau href
    // kosong/placeholder, kartu ini TIDAK boleh terlihat seperti dokumen yang
    // bisa diklik (temuan audit data statis lama: item tanpa href
    // sempat kepasang default "#", tampil identik dgn kartu link asli tapi
    // sebenarnya dead link ke publik).
    const hasRealLink = !!href && href.trim() !== "" && href.trim() !== "#";

    // Nama file dari Drive kadang literally pakai "+" / "%20" (hasil copy dari
    // URL) alih-alih spasi biasa. bersihkan biar rapi ditampilkan.
    const cleanName = name.replace(/\+/g, " ").replace(/%20/g, " ").replace(/\.(pdf|docx?|xlsx?|pptx?)$/i, "");

    const badge = (
        <div
            className={cn(
                "w-10 h-10 rounded-none grid place-items-center tabular-nums text-[10px] font-bold tracking-wider",
                hasRealLink ? KIND_STYLES[kind] : "bg-[var(--color-outline-gray)] text-[var(--color-graphite)]"
            )}
        >
            {kind.toUpperCase()}
        </div>
    );

    const body = (
        <div className="min-w-0">
            <div
                className={cn(
                    "text-sm font-semibold leading-snug mb-0.5 tracking-[-0.35px] line-clamp-2",
                    hasRealLink ? "text-[var(--color-absolute-zero)]" : "text-[var(--color-graphite)]"
                )}
                title={cleanName}
            >
                {cleanName}
            </div>
            <div className="tabular-nums text-[10px] text-[var(--color-graphite)] flex gap-2.5">
                <span>{kind.toUpperCase()}</span>
                {year && <span>{year}</span>}
                {!hasRealLink && <span><CmsText field="f_c9d5cb4fa84bb4" fallback="Belum tersedia" /></span>}
            </div>
        </div>
    );

    if (!hasRealLink) {
        // Placeholder non-interaktif: tidak jadi <a>, tidak ada cursor-pointer,
        // tidak ada hover/panah. supaya jelas beda dari kartu dokumen asli.
        return (
            <div
                aria-disabled="true"
                className="bg-[var(--color-off-white,#f7f7f5)] border border-dashed border-[var(--color-outline-gray)] rounded-none p-4 grid grid-cols-[auto_1fr_auto] gap-3.5 items-center opacity-70"
            >
                {badge}
                {body}
                <span className="text-base text-[var(--color-graphite)] opacity-40">-</span>
            </div>
        );
    }

    return (
        <motion.a
            href={href}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group bg-white border border-[var(--color-outline-gray)] rounded-none p-4 grid grid-cols-[auto_1fr_auto] gap-3.5 items-center hover:border-[var(--color-absolute-zero)] transition-colors cursor-pointer"
        >
            {badge}
            {body}
            <span className="text-base text-[var(--color-absolute-zero)] opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                →
            </span>
        </motion.a>
    );
}
