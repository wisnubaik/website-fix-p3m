"use client";

import { motion } from "framer-motion";

export default function Marquee({ items }: { items: string[] }) {
    return (
        <div className="bg-[var(--color-blackhole)] py-6 overflow-hidden border-y border-white/10 group">
            <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                className="flex gap-12 whitespace-nowrap w-max group-hover:[animation-play-state:paused]"
            >
                {[...items, ...items].map((item, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center gap-3 font-display text-lg font-semibold tracking-[-0.025em] text-[var(--color-alabaster)]"
                    >
                        {item}
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cosmic-candy)]" />
                    </span>
                ))}
            </motion.div>
        </div>
    );
}
