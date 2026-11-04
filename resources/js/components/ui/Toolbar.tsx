import { CmsText, CmsElement } from '@/components/ui/ManagedContent';
"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FilterChip } from "@/lib/doc-types";

export default function Toolbar({
    searchValue,
    onSearchChange,
    chips,
    activeChip,
    onChipChange,
}: {
    searchValue: string;
    onSearchChange: (v: string) => void;
    chips: FilterChip[];
    activeChip: string;
    onChipChange: (id: string) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="bg-white border border-[var(--color-outline-gray)] rounded-none p-4 flex gap-3 items-center flex-wrap mb-8"
        >
            <div className="relative flex-1 min-w-[240px]">
                <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-graphite)] pointer-events-none"
                />
                <CmsElement as={"input"} fields={{"placeholder":"f_c5cb974b81a652"}}
                    type="search"
                    aria-label="Cari dokumen, tahun, atau judul"
                    placeholder="Cari dokumen, tahun, atau judul..."
                    value={searchValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-none border border-[var(--color-outline-gray)] bg-[var(--color-whisper-white)] text-sm tracking-[-0.35px] focus:outline-none focus:border-[var(--color-absolute-zero)] focus:bg-white transition-colors"
                />
            </div>

            <div className="flex gap-2 flex-wrap">
                {chips.map((chip) => {
                    const active = activeChip === chip.id;
                    return (
                        <motion.button
                            key={chip.id}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => onChipChange(chip.id)}
                            className={cn(
                                "px-2.5 py-0.5 rounded-full border tabular-nums text-[11px] font-semibold  tracking-[0.02em] transition-colors",
                                active
                                    ? "bg-[var(--color-blackhole)] text-white border-[var(--color-blackhole)]"
                                    : "bg-[var(--color-whisper-white)] text-[var(--color-absolute-zero)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
                            )}
                        >
                            {chip.label}
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
}