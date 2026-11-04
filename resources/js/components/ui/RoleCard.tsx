"use client";

import { motion } from "framer-motion";

export default function RoleCard({
    role,
    intro,
    items,
}: {
    role: string;
    intro: string;
    items: string[];
}) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white border border-[var(--color-outline-gray)] rounded-none p-4 relative overflow-hidden hover:border-[var(--color-absolute-zero)] transition-colors"
        >
            <span className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-cosmic-candy)]" />

            <div className="font-serif italic text-[32px] text-[var(--color-cosmic-candy)] tracking-tight leading-none mb-4 pl-3">
                {role}
            </div>
            <div className="tabular-nums text-[11px]  tracking-[0.08em] font-semibold text-[var(--color-graphite)] mb-6 pl-3">
                {intro}
            </div>
            <ul className="flex flex-col gap-3 text-sm text-[var(--color-absolute-zero)] leading-relaxed pl-3">
                {items.map((item, i) => (
                    <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04, type: "spring", stiffness: 150, damping: 22 }}
                        className="relative pl-6"
                    >
                        <span className="absolute left-0 top-[9px] w-3 h-0.5 bg-[var(--color-cosmic-candy)]" />
                        {item}
                    </motion.li>
                ))}
            </ul>
        </motion.div>
    );
}
