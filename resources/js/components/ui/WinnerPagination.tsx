import { CmsActionText, CmsText, CmsElement } from '@/components/ui/ManagedContent';
"use client";

import { useState } from "react";
import type { WinnerRow } from "@/lib/get-stats";
import { WinnerItem } from "./HomeCards";

type Group = { category: string; items: WinnerRow[] };

export default function WinnerPagination({ groups }: { groups: Group[] }) {
    const [page, setPage] = useState(0);
    const visibleGroups = groups.filter(group => group.items.length > 0);
    const currentPage = Math.min(page, Math.max(0, visibleGroups.length - 1));
    const group = visibleGroups[currentPage];

    if (!group) return <p className="text-sm text-[var(--color-graphite)]"><CmsText field="f_95f1558e9c5514" fallback="Belum ada pemenang hibah yang dipublikasikan." /></p>;

    const tagVariant = group.category === "Penelitian" ? "navy" : group.category.startsWith("PkM") ? "rose" : "leaf";
    const buttonClass = "border border-[var(--color-outline-gray)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-whisper-white)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed";

    return <div>
        <div id="winner-category-content" role="region" aria-labelledby="winner-category-title" aria-live="polite" aria-atomic="true">
            <h4 id="winner-category-title" className="text-sm font-semibold text-[var(--color-graphite)] mb-2">{group.category}</h4>
            <div className="flex flex-col gap-1">
                {group.items.map((winner, index) => <WinnerItem
                    key={`${group.category}-${winner.name}-${index}`}
                    name={winner.name}
                    skema={winner.skema}
                    tag={winner.tag}
                    tagVariant={tagVariant}
                />)}
            </div>
        </div>
        {visibleGroups.length > 1 && <nav aria-label="Halaman kategori pemenang hibah" className="mt-5 pt-4 border-t border-[var(--color-outline-gray)] flex flex-wrap items-center justify-between gap-3">
            <button type="button" aria-controls="winner-category-content" className={buttonClass} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><CmsText field="f_8f6b0a97cc9137" fallback="Sebelumnya" /></button>
            <span className="text-xs tabular-nums text-[var(--color-graphite)]"><CmsText field="f_48ed4706d41e29" fallback="Kategori" />{" "}{currentPage + 1}{" "}<CmsText field="f_604232f9dbaa66" fallback="dari" />{" "}{visibleGroups.length}</span>
            <button type="button" aria-label="Kategori berikutnya" aria-controls="winner-category-content" className={buttonClass} disabled={currentPage === visibleGroups.length - 1} onClick={() => setPage(currentPage + 1)}><CmsActionText field="f_fe03804ec56c8b" fallback="Berikutnya" /></button>
        </nav>}
    </div>;
}
