"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function VmtCard({
    num,
    label,
    title,
    body,
}: {
    num: string;
    label: string;
    title: string;
    body: ReactNode;
}) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white border border-[var(--color-outline-gray)] rounded-none p-4 hover:border-[var(--color-absolute-zero)] transition-colors relative overflow-hidden"
        >
            <div className="font-serif italic text-[80px] font-normal text-[var(--color-cosmic-candy)] leading-none mb-3">
                {num}
            </div>
            <div className="tabular-nums text-[11px] font-bold  tracking-[0.08em] text-[var(--color-cosmic-candy)] mb-3">
                {label}
            </div>
            <div className="font-display text-[22px] font-bold text-[var(--color-absolute-zero)] tracking-[-0.025em] mb-3 leading-snug">
                {title}
            </div>
            <div className="text-[15px] text-[var(--color-graphite)] leading-relaxed tracking-[-0.4px]">
                {body}
            </div>
        </motion.div>
    );
}
